-- ============================================================
-- FUTBOL TAHMİN — Migration 07: Dixon-Coles model için schema
-- ============================================================
-- Eklenenler:
--   • score_matrix    7x7 olasılık matrisi (heatmap için)
--   • home_advantage  Lige özgü γ katsayısı (ev sahibi xG çarpanı)
--   • rho             Dixon-Coles τ düzeltmesi parametresi
--   • factors         Feature attribution (jsonb: ev avantajı, form, vb.)
--   • idx_predictions_model_version  A/B karşılaştırma için
--
-- Compound primary key: (fixture_id, model_version)
-- Aynı maç için hem poisson-v2 hem dc-v1 tahmini paralel saklanabilir.
-- ============================================================

-- 1) Yeni kolonlar (idempotent)
alter table predictions add column if not exists score_matrix   jsonb;
alter table predictions add column if not exists home_advantage numeric(4,3);
alter table predictions add column if not exists rho            numeric(5,4);
alter table predictions add column if not exists factors        jsonb;

-- 2) Mevcut v2 satırlarını işaretle (model_version null'dı veya boştu)
update predictions
   set model_version = 'poisson-v2'
 where model_version is null or model_version = '';

-- 3) Primary key'i değiştir (fixture_id, model_version)
--    NOT: Eğer aynı fixture için zaten iki model_version satırı varsa,
--    önce dedupe gerekir. Şu an tek versiyon var, güvenli.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'predictions_pkey' and conrelid = 'predictions'::regclass
  ) then
    alter table predictions drop constraint predictions_pkey;
  end if;

  -- (fixture_id, model_version) compound key
  alter table predictions
    add constraint predictions_pkey
    primary key (fixture_id, model_version);
end $$;

-- 4) Performans index'leri
create index if not exists idx_predictions_model_version on predictions (model_version);
create index if not exists idx_predictions_computed_at   on predictions (computed_at desc);

-- 5) JSONB validasyon (opsiyonel ama iyi pratik)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'score_matrix_is_array') then
    alter table predictions
      add constraint score_matrix_is_array
      check (score_matrix is null or jsonb_typeof(score_matrix) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'factors_is_object') then
    alter table predictions
      add constraint factors_is_object
      check (factors is null or jsonb_typeof(factors) = 'object');
  end if;
end $$;

-- ============================================================
-- LİG HOME ADVANTAGE — view (model her run'da hesaplar)
-- ============================================================
-- Önceki sürümden farklı kolon sırası olabilir → güvenli için drop
drop view if exists league_home_advantage cascade;

create view league_home_advantage as
select
  league_id,
  count(*) as matches_180d,
  avg(home_goals)::numeric(5,3) as avg_home_goals,
  avg(away_goals)::numeric(5,3) as avg_away_goals,
  case
    when avg(away_goals) > 0
      then (avg(home_goals) / avg(away_goals))::numeric(5,3)
    else 1.000
  end as home_advantage_ratio,
  -- Toplam gol ortalaması (Dixon-Coles μ parametresi için)
  ((avg(home_goals) + avg(away_goals)) / 2)::numeric(5,3) as league_avg_goals
from fixtures
where status = 'FINISHED'
  and home_goals is not null
  and away_goals is not null
  and utc_date >= now() - interval '180 days'
group by league_id
having count(*) >= 20;  -- en az 20 maç olmadan güvenilir değil

-- View'ı public okuma için
grant select on league_home_advantage to anon;

-- ============================================================
-- Doğrulama
-- ============================================================
select 'predictions schema'::text as check, count(*) as cols
  from information_schema.columns
 where table_name = 'predictions' and table_schema = 'public';

select 'league_home_advantage'::text as check, count(*) as leagues
  from league_home_advantage;
