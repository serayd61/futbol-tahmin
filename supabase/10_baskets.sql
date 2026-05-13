-- ============================================================
-- Migration 10: Tahmin Sepeti — user_baskets + otomatik scoring
-- ============================================================
-- İçerik:
--   • user_baskets         — kullanıcının kaydettiği sepetler
--   • user_basket_picks    — sepetin içindeki pick'ler (1X2, Ü/A, BTTS)
--   • basket_scores        — sepet başına agrege: total, hit, miss, pending
--   • leaderboard_weekly   — kullanıcı bazında haftalık puan sıralaması
--   • Otomatik scoring trigger: fixture FINISHED olunca ilgili pick'leri skorla
--
-- YASAL NOT: Bu schema bahis ürünü DEĞİLDİR. Puan/rozet sistemi
-- gamification içindir. Hiçbir kolonda "para", "kazanç", "iade",
-- "stake" terimi geçmez. Para asla saklanmaz.
-- ============================================================

-- ============================================================
-- 1) Tablo: user_baskets
-- ============================================================
create table if not exists user_baskets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text default 'Sepet',                 -- kullanıcı isim verebilir
  combined_prob numeric(6,5),                          -- pick olasılıklarının çarpımı
  total_picks   int not null default 0,
  status        text not null default 'pending',      -- pending | partial | complete
  hits          int not null default 0,                -- isabet sayısı (trigger güncelliyor)
  misses        int not null default 0,                -- ıska sayısı
  points        int not null default 0,                -- toplam puan (10 × hits)
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,                           -- tüm pick'ler skorlanınca
  constraint user_baskets_status_chk check (status in ('pending', 'partial', 'complete'))
);

create index if not exists idx_user_baskets_user_id on user_baskets (user_id);
create index if not exists idx_user_baskets_status  on user_baskets (status);

-- ============================================================
-- 2) Tablo: user_basket_picks
-- ============================================================
create table if not exists user_basket_picks (
  basket_id   uuid not null references user_baskets(id) on delete cascade,
  fixture_id  bigint not null references fixtures(id),
  market      text not null,
  prob        numeric(5,4),                       -- kayıt anındaki model olasılığı
  result      text,                                -- 'hit' | 'miss' | null (pending)
  created_at  timestamptz not null default now(),
  primary key (basket_id, fixture_id, market),
  constraint user_basket_picks_market_chk check (market in (
    '1X2_HOME', '1X2_DRAW', '1X2_AWAY',
    'OVER_25', 'UNDER_25',
    'BTTS_YES', 'BTTS_NO'
  )),
  constraint user_basket_picks_result_chk check (result is null or result in ('hit', 'miss'))
);

create index if not exists idx_basket_picks_fixture on user_basket_picks (fixture_id);
create index if not exists idx_basket_picks_basket  on user_basket_picks (basket_id);
create index if not exists idx_basket_picks_pending on user_basket_picks (result) where result is null;

-- ============================================================
-- 3) RLS — Kullanıcı sadece kendi sepetlerini görür/düzenler
-- ============================================================
alter table user_baskets       enable row level security;
alter table user_basket_picks  enable row level security;

drop policy if exists "own_baskets_select" on user_baskets;
drop policy if exists "own_baskets_insert" on user_baskets;
drop policy if exists "own_baskets_update" on user_baskets;
drop policy if exists "own_baskets_delete" on user_baskets;
drop policy if exists "own_basket_picks_all" on user_basket_picks;

create policy "own_baskets_select" on user_baskets
  for select using (auth.uid() = user_id);

create policy "own_baskets_insert" on user_baskets
  for insert with check (auth.uid() = user_id);

create policy "own_baskets_update" on user_baskets
  for update using (auth.uid() = user_id);

create policy "own_baskets_delete" on user_baskets
  for delete using (auth.uid() = user_id);

-- Pick'ler: sadece kendi sepetinin pick'lerine erişebilir
create policy "own_basket_picks_all" on user_basket_picks
  for all using (
    exists (
      select 1 from user_baskets b
      where b.id = user_basket_picks.basket_id
        and b.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4) Otomatik scoring fonksiyonu
-- fixture FINISHED olduğunda ilgili tüm pick'leri skorla
-- ============================================================
create or replace function score_basket_picks_for_fixture(fid bigint)
returns void as $$
declare
  hg int;
  ag int;
begin
  select home_goals, away_goals into hg, ag
    from fixtures where id = fid;

  if hg is null or ag is null then
    return;
  end if;

  -- 1X2 markets
  update user_basket_picks set result =
    case
      when market = '1X2_HOME' and hg > ag then 'hit'
      when market = '1X2_DRAW' and hg = ag then 'hit'
      when market = '1X2_AWAY' and hg < ag then 'hit'
      else 'miss'
    end
  where fixture_id = fid
    and result is null
    and market in ('1X2_HOME', '1X2_DRAW', '1X2_AWAY');

  -- Over/Under 2.5 markets
  update user_basket_picks set result =
    case
      when market = 'OVER_25'  and (hg + ag) >= 3 then 'hit'
      when market = 'UNDER_25' and (hg + ag) < 3 then 'hit'
      else 'miss'
    end
  where fixture_id = fid
    and result is null
    and market in ('OVER_25', 'UNDER_25');

  -- BTTS markets
  update user_basket_picks set result =
    case
      when market = 'BTTS_YES' and hg >= 1 and ag >= 1 then 'hit'
      when market = 'BTTS_NO'  and (hg = 0 or ag = 0) then 'hit'
      else 'miss'
    end
  where fixture_id = fid
    and result is null
    and market in ('BTTS_YES', 'BTTS_NO');
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5) Sepet aggregate refresh — sepetin hits/misses/points/status'unu güncelle
-- Bir pick'in result'u değişince ilgili sepetin sayaçlarını yenile.
-- ============================================================
create or replace function refresh_basket_aggregate(bid uuid)
returns void as $$
declare
  total int;
  hit_count int;
  miss_count int;
  pending_count int;
  new_status text;
  new_points int;
begin
  select
    count(*),
    count(*) filter (where result = 'hit'),
    count(*) filter (where result = 'miss'),
    count(*) filter (where result is null)
  into total, hit_count, miss_count, pending_count
  from user_basket_picks
  where basket_id = bid;

  new_points := hit_count * 10;

  if pending_count = 0 then
    new_status := 'complete';
  elsif hit_count + miss_count > 0 then
    new_status := 'partial';
  else
    new_status := 'pending';
  end if;

  update user_baskets
     set hits        = hit_count,
         misses      = miss_count,
         points      = new_points,
         status      = new_status,
         resolved_at = case when new_status = 'complete' and resolved_at is null then now() else resolved_at end
   where id = bid;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 6) Trigger: fixture FINISHED + skorları doluyor + önce SCHEDULED idi
-- → score_basket_picks_for_fixture'ı tetikle + ilgili sepetleri refresh
-- ============================================================
create or replace function trg_fixture_scored() returns trigger as $$
declare
  baskets_to_refresh uuid[];
begin
  if new.status = 'FINISHED'
     and new.home_goals is not null
     and new.away_goals is not null
     and (old.status is distinct from 'FINISHED' or old.home_goals is null or old.away_goals is null) then

    -- Bu fixture için pick'i olan tüm sepetleri öne kaydet
    select array_agg(distinct basket_id) into baskets_to_refresh
      from user_basket_picks
     where fixture_id = new.id and result is null;

    -- Pick'leri skorla
    perform score_basket_picks_for_fixture(new.id);

    -- Etkilenen her sepetin agregesini refresh et
    if baskets_to_refresh is not null then
      perform refresh_basket_aggregate(b)
        from unnest(baskets_to_refresh) as b;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists fixture_score_baskets on fixtures;

create trigger fixture_score_baskets
  after update on fixtures
  for each row
  execute function trg_fixture_scored();

-- ============================================================
-- 7) Leaderboard view — haftalık + her zaman
-- RLS uygulanmaz (public read), ama user_id gözükür sadece anonimize
-- ============================================================
drop view if exists leaderboard_weekly cascade;
drop view if exists leaderboard_alltime cascade;

create view leaderboard_weekly as
select
  user_id,
  count(*) as baskets_count,
  sum(points) as total_points,
  sum(hits) as total_hits,
  sum(total_picks) as total_picks
from user_baskets
where created_at >= now() - interval '7 days'
group by user_id
order by sum(points) desc, sum(hits) desc;

create view leaderboard_alltime as
select
  user_id,
  count(*) as baskets_count,
  sum(points) as total_points,
  sum(hits) as total_hits,
  sum(total_picks) as total_picks,
  sum(hits)::numeric / nullif(sum(total_picks), 0) as hit_rate
from user_baskets
where status = 'complete'
group by user_id
order by sum(points) desc;

-- Leaderboard public görünür (sıralamada yer almak için)
grant select on leaderboard_weekly to anon, authenticated;
grant select on leaderboard_alltime to anon, authenticated;

-- ============================================================
-- 8) Test verisi (varsayım: auth.users boş, bunu local test için)
-- Production'da çalıştırmaya gerek yok, sadece debug için.
-- ============================================================
-- insert into user_baskets (user_id, name, total_picks, combined_prob)
--   values ('00000000-0000-0000-0000-000000000000', 'Test Sepet', 3, 0.18);

-- ============================================================
-- Doğrulama
-- ============================================================
select 'user_baskets'::text as table_name,
  (select count(*) from information_schema.columns
    where table_name='user_baskets' and table_schema='public') as cols
union all
select 'user_basket_picks',
  (select count(*) from information_schema.columns
    where table_name='user_basket_picks' and table_schema='public')
union all
select 'trigger',
  (select count(*) from information_schema.triggers
    where trigger_name='fixture_score_baskets')::int
union all
select 'scoring function',
  (select count(*) from information_schema.routines
    where routine_name='score_basket_picks_for_fixture')::int;
