-- ============================================================
-- Migration 09: BTTS (Both Teams To Score) — KGV/KGY pazarı
-- ============================================================
-- Tahmin Sepeti V2'nin temeli: kullanıcı bir maç için
--   • 1X2 (1, X, 2)
--   • Üst/Alt 2.5 gol
--   • KGV / KGY (Karşılıklı Gol Var/Yok)
-- gibi farklı "market"lerden pick yapabilsin diye predictions tablosuna
-- BTTS olasılığı eklendi. Dixon-Coles modelinin score_matrix'inden
-- türetiliyor: P(home ≥ 1 AND away ≥ 1)
-- ============================================================

alter table predictions add column if not exists prob_btts_yes numeric(4,3);
alter table predictions add column if not exists prob_btts_no  numeric(4,3);

-- Constraint: 0..1 arasında
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prob_btts_yes_range') then
    alter table predictions
      add constraint prob_btts_yes_range
      check (prob_btts_yes is null or (prob_btts_yes >= 0 and prob_btts_yes <= 1));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prob_btts_no_range') then
    alter table predictions
      add constraint prob_btts_no_range
      check (prob_btts_no is null or (prob_btts_no >= 0 and prob_btts_no <= 1));
  end if;
end $$;

-- ============================================================
-- LIG GENEL BAKIŞ VIEW — Tahmin Sepeti "Ligler" sayfası için
-- Her ligin: ülke kodu, son 90 gün model accuracy, bugün maç sayısı
-- ============================================================
drop view if exists leagues_overview cascade;

create view leagues_overview as
with calibration as (
  select
    league_id,
    count(*) as total_evaluated,
    sum(hit_1x2)::numeric / nullif(count(*), 0) as accuracy_1x2,
    avg(brier_1x2)::numeric(6,4) as brier_1x2
  from model_calibration_raw
  where utc_date >= now() - interval '90 days'
  group by league_id
),
today_count as (
  select
    league_id,
    count(*) filter (where utc_date between now() and now() + interval '24 hours') as today_matches,
    count(*) filter (where utc_date between now() and now() + interval '7 days')   as week_matches
  from fixtures
  where status = 'SCHEDULED'
  group by league_id
)
select
  l.id            as league_id,
  l.name          as name,
  l.country       as country,
  l.logo          as logo,
  coalesce(tc.today_matches, 0) as today_matches,
  coalesce(tc.week_matches, 0)  as week_matches,
  cal.total_evaluated,
  cal.accuracy_1x2,
  cal.brier_1x2
from leagues l
left join calibration cal on cal.league_id = l.id
left join today_count tc  on tc.league_id  = l.id
where coalesce(tc.week_matches, 0) > 0
   or coalesce(cal.total_evaluated, 0) > 0
order by tc.week_matches desc nulls last, cal.total_evaluated desc nulls last;

grant select on leagues_overview to anon;

-- ============================================================
-- Doğrulama
-- ============================================================
select 'predictions cols'::text as check, count(*) as n
  from information_schema.columns
 where table_name = 'predictions' and table_schema = 'public'
union all
select 'leagues_overview rows'::text, count(*)::int
  from leagues_overview;
