-- ============================================================
-- prediction_outcomes view düzeltme — hit_1x2 mantığı
-- Sorun: view, en yüksek prob_* değerine göre 1X2 hit hesaplıyordu.
--        Bu yüzden predicted_score "0-0" (berabere tahmin) ama prob_home_win
--        en yüksek olduğunda, gerçek 1-1 berabere bile hit_1x2=0 dönüyordu.
-- Çözüm: predicted_score outcome ile gerçek outcome'ı karşılaştır.
-- ============================================================

-- Eski view'ı tamamen kaldır (yeni şemada kolon sırası değiştiği için CREATE OR REPLACE yetmez)
drop view if exists prediction_outcomes;

create view prediction_outcomes as
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
  p.ai_comment,
  f.home_goals,
  f.away_goals,
  f.utc_date,
  f.league_id,
  f.home_team_id,
  f.away_team_id,
  -- 1X2 hit: predicted_score outcome'ı gerçek outcome ile karşılaştır
  case
    when split_part(p.predicted_score, '-', 1)::int > split_part(p.predicted_score, '-', 2)::int
         and f.home_goals > f.away_goals then 1
    when split_part(p.predicted_score, '-', 1)::int < split_part(p.predicted_score, '-', 2)::int
         and f.home_goals < f.away_goals then 1
    when split_part(p.predicted_score, '-', 1)::int = split_part(p.predicted_score, '-', 2)::int
         and f.home_goals = f.away_goals then 1
    else 0
  end as hit_1x2,
  -- Tam skor isabeti
  case
    when p.predicted_score = (f.home_goals::text || '-' || f.away_goals::text) then 1
    else 0
  end as hit_score,
  -- Üst/Alt 2.5: predicted_score toplamı ile gerçek toplamı karşılaştır
  case
    when (split_part(p.predicted_score, '-', 1)::int + split_part(p.predicted_score, '-', 2)::int) >= 3
         and (f.home_goals + f.away_goals) >= 3 then 1
    when (split_part(p.predicted_score, '-', 1)::int + split_part(p.predicted_score, '-', 2)::int) < 3
         and (f.home_goals + f.away_goals) < 3 then 1
    else 0
  end as hit_over_under
from predictions p
join fixtures f on f.id = p.fixture_id
where f.status = 'FINISHED'
  and f.home_goals is not null
  and f.away_goals is not null
  and p.predicted_score is not null;

grant select on prediction_outcomes to anon, authenticated;

-- Doğrulama: yeni hit_1x2 ile dağılım
select
  count(*) as total,
  sum(hit_1x2) as hit_1x2,
  round(100.0 * sum(hit_1x2) / nullif(count(*), 0), 1) as pct_1x2,
  sum(hit_over_under) as hit_over_under,
  round(100.0 * sum(hit_over_under) / nullif(count(*), 0), 1) as pct_over_under
from prediction_outcomes;
