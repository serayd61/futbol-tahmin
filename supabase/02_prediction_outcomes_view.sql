-- ============================================================
-- prediction_outcomes view — her bitmiş maç için tahmin doğruluğu
-- Çalıştırma: Supabase SQL Editor → New query → yapıştır → Run
-- ============================================================

create or replace view prediction_outcomes as
select
  p.fixture_id,
  p.predicted_score,
  p.prob_home_win,
  p.prob_draw,
  p.prob_away_win,
  p.prob_over_25,
  p.confidence,
  p.model_version,
  p.computed_at,
  f.home_goals,
  f.away_goals,
  f.utc_date,
  f.league_id,
  f.home_team_id,
  f.away_team_id,
  -- 1X2 doğru mu? (en yüksek olasılığı verdiği taraf gerçekten kazandı mı / berabere mi?)
  case
    when f.home_goals > f.away_goals
         and p.prob_home_win >= p.prob_draw
         and p.prob_home_win >= p.prob_away_win then 1
    when f.home_goals < f.away_goals
         and p.prob_away_win >= p.prob_draw
         and p.prob_away_win >= p.prob_home_win then 1
    when f.home_goals = f.away_goals
         and p.prob_draw >= p.prob_home_win
         and p.prob_draw >= p.prob_away_win then 1
    else 0
  end as hit_1x2,
  -- Tam skor isabeti
  case
    when p.predicted_score = (f.home_goals::text || '-' || f.away_goals::text) then 1
    else 0
  end as hit_score,
  -- Üst/Alt 2.5 isabeti
  case
    when (f.home_goals + f.away_goals) >= 3 and p.prob_over_25 >= 0.5 then 1
    when (f.home_goals + f.away_goals) <  3 and p.prob_over_25 <  0.5 then 1
    else 0
  end as hit_over_under
from predictions p
join fixtures f on f.id = p.fixture_id
where f.status = 'FINISHED'
  and f.home_goals is not null
  and f.away_goals is not null;

-- Anon kullanıcının view'a erişmesi için
grant select on prediction_outcomes to anon, authenticated;

-- ============================================================
-- Hızlı doğrulama
-- ============================================================
-- Son 30 gün özeti
select
  count(*) as total,
  sum(hit_1x2) as hit_1x2,
  round(100.0 * sum(hit_1x2) / nullif(count(*),0), 1) as pct_1x2,
  sum(hit_score) as hit_score,
  round(100.0 * sum(hit_score) / nullif(count(*),0), 1) as pct_score,
  sum(hit_over_under) as hit_over_under,
  round(100.0 * sum(hit_over_under) / nullif(count(*),0), 1) as pct_over_under
from prediction_outcomes
where utc_date >= now() - interval '30 days';
