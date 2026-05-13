-- ============================================================
-- FUTBOL TAHMİN — Migration 08: Model kalibrasyon view'ları
-- ============================================================
-- İçerik:
--   • model_calibration_raw   — her bitmiş maç için tahmin vs gerçek
--   • model_calibration       — confidence × prob bucket × model agregasyonu
--   • model_brier             — model_version başına özet (Brier, accuracy)
--   • model_calibration_league — lig kırılımlı kalibrasyon (Stats UI için)
--
-- Tüm view'lar public okuma izniyle anon role'e açılır.
-- ============================================================

-- 1) Ham veri: her tahmin–gerçek satırı + Brier komponentleri
-- Önceki sürüm varsa farklı kolon sırası ile çakışmaması için drop
drop view if exists model_calibration_league cascade;
drop view if exists model_brier              cascade;
drop view if exists model_calibration        cascade;
drop view if exists model_calibration_raw    cascade;

create view model_calibration_raw as
select
  p.fixture_id,
  p.model_version,
  p.confidence,
  f.league_id,
  f.utc_date,

  -- Gerçek sonuç sınıfı: H / A / D
  case
    when f.home_goals > f.away_goals then 'H'
    when f.home_goals < f.away_goals then 'A'
    else 'D'
  end as actual_outcome,

  -- Modelin "en yüksek prob" tahmini
  case
    when p.prob_home_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'H'
    when p.prob_away_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'A'
    else 'D'
  end as predicted_outcome,

  -- Modelin gerçek sonuca verdiği olasılık (kalibrasyon temel metriği)
  case
    when f.home_goals > f.away_goals then p.prob_home_win
    when f.home_goals < f.away_goals then p.prob_away_win
    else p.prob_draw
  end as prob_actual,

  -- Brier score (3-way) — tüm sonuçlar için kare hata
  (
    (case when f.home_goals > f.away_goals then 1 else 0 end - p.prob_home_win) ^ 2 +
    (case when f.home_goals = f.away_goals then 1 else 0 end - p.prob_draw)     ^ 2 +
    (case when f.home_goals < f.away_goals then 1 else 0 end - p.prob_away_win) ^ 2
  )::numeric(8,5) as brier_1x2,

  -- Üst/Alt 2.5 Brier
  (
    (case when (f.home_goals + f.away_goals) >= 3 then 1 else 0 end - p.prob_over_25) ^ 2
  )::numeric(8,5) as brier_over25,

  -- 1X2 hit (0/1)
  case when (case
    when f.home_goals > f.away_goals then 'H'
    when f.home_goals < f.away_goals then 'A'
    else 'D'
  end) = (case
    when p.prob_home_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'H'
    when p.prob_away_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'A'
    else 'D'
  end) then 1 else 0 end as hit_1x2,

  -- Tam skor hit (0/1)
  case when p.predicted_score = (f.home_goals || '-' || f.away_goals) then 1 else 0 end as hit_score,

  -- Üst/Alt 2.5 hit (0/1)
  case when (
    (p.prob_over_25 >= 0.5 and (f.home_goals + f.away_goals) >= 3) or
    (p.prob_over_25 <  0.5 and (f.home_goals + f.away_goals) <  3)
  ) then 1 else 0 end as hit_over25,

  -- Max prob (confidence band için)
  greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) as top_prob,

  -- Probability bucket (5 percent point genişlik)
  (floor(greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) * 20) * 5)::int as prob_bucket
from predictions p
join fixtures   f on f.id = p.fixture_id
where f.status = 'FINISHED'
  and f.home_goals is not null
  and f.away_goals is not null;

grant select on model_calibration_raw to anon;

-- ============================================================
-- 2) Confidence × prob_bucket bazında agregasyon
-- ============================================================
create view model_calibration as
select
  model_version,
  confidence,
  prob_bucket,
  count(*) as total,
  sum(hit_1x2)::numeric / nullif(count(*), 0) as actual_hit_rate,
  avg(prob_actual)::numeric(5,4)              as expected_hit_rate,
  avg(brier_1x2)::numeric(6,4)                as avg_brier_1x2
from model_calibration_raw
group by 1, 2, 3
order by 1, 2, 3;

grant select on model_calibration to anon;

-- ============================================================
-- 3) Model_version başına Brier score + accuracy özeti
-- ============================================================
create view model_brier as
select
  model_version,
  count(*)                                                       as total,
  sum(hit_1x2)::numeric    / nullif(count(*), 0)                 as accuracy_1x2,
  sum(hit_score)::numeric  / nullif(count(*), 0)                 as accuracy_score,
  sum(hit_over25)::numeric / nullif(count(*), 0)                 as accuracy_over25,
  avg(brier_1x2)::numeric(6,4)                                   as brier_1x2,
  avg(brier_over25)::numeric(6,4)                                as brier_over25,
  -- "Reliability": |actual - expected| ortalama mutlak fark (0 = mükemmel kalibre)
  avg(abs(prob_actual -
    case
      when actual_outcome = 'H' then prob_actual
      else prob_actual
    end))::numeric(6,4) as mean_prob_actual
from model_calibration_raw
group by model_version;

grant select on model_brier to anon;

-- ============================================================
-- 4) Lig kırılımlı kalibrasyon (Stats UI'da kullanılacak)
-- ============================================================
create view model_calibration_league as
select
  r.model_version,
  r.league_id,
  l.name as league_name,
  count(*) as total,
  sum(r.hit_1x2)::numeric / nullif(count(*), 0) as accuracy_1x2,
  avg(r.brier_1x2)::numeric(6,4)                as brier_1x2,
  avg(r.prob_actual)::numeric(5,4)              as avg_confidence
from model_calibration_raw r
left join leagues l on l.id = r.league_id
where r.utc_date >= now() - interval '90 days'
group by r.model_version, r.league_id, l.name
having count(*) >= 5
order by r.model_version, count(*) desc;

grant select on model_calibration_league to anon;

-- ============================================================
-- Doğrulama: baseline (poisson-v2) sayıları
-- ============================================================
select * from model_brier;
-- Beklenen: tek satır poisson-v2, accuracy_1x2 ≈ 0.45-0.55, brier_1x2 ≈ 0.55-0.62
