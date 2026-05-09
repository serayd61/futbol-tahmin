// Poisson tahmin motoru
// Girdi 1: 'Get Upcoming Fixtures' düğümünden — gelecek SCHEDULED maçlar (array)
// Girdi 2: 'Get Team Stats' düğümünden — tüm team_stats (array)

// Aynı sorun: array açılmış olabilir (N item) veya tek item olabilir
function readAll(nodeName) {
  const items = $(nodeName).all();
  if (items.length === 1 && Array.isArray(items[0].json)) return items[0].json;
  return items.map(i => i.json);
}
const fixtures  = readAll('Get Upcoming Fixtures');
const teamStats = readAll('Get Team Stats');

const statsMap = new Map(teamStats.map(s => [s.team_id, s]));

// Lig başına ortalamalar (normalizasyon için)
const leagueAggs = new Map();
for (const s of teamStats) {
  if (!leagueAggs.has(s.league_id)) leagueAggs.set(s.league_id, { scored: 0, conceded: 0, count: 0 });
  const a = leagueAggs.get(s.league_id);
  a.scored   += Number(s.goals_scored_avg)   || 0;
  a.conceded += Number(s.goals_conceded_avg) || 0;
  a.count++;
}

const factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const poisson   = (k, lam) => Math.exp(-lam) * Math.pow(lam, k) / factorial(k);

const formPts = form => {
  if (!form) return 2.5;
  let pts = 0;
  for (const c of form) pts += (c === 'W' ? 1 : c === 'D' ? 0.5 : 0);
  return pts;
};

const out = [];
const now = new Date().toISOString();

for (const m of fixtures) {
  const h = statsMap.get(m.home_team_id);
  const a = statsMap.get(m.away_team_id);
  if (!h || !a) continue;

  const agg = leagueAggs.get(m.league_id);
  if (!agg || agg.count === 0) continue;
  const leagueAvg = agg.scored / agg.count;
  if (leagueAvg <= 0) continue;

  const homeAttack  = (Number(h.home_scored_avg)   || 0) / leagueAvg;
  const homeDefense = (Number(h.home_conceded_avg) || 0) / leagueAvg;
  const awayAttack  = (Number(a.away_scored_avg)   || 0) / leagueAvg;
  const awayDefense = (Number(a.away_conceded_avg) || 0) / leagueAvg;

  let xgH = homeAttack * awayDefense * leagueAvg;
  let xgA = awayAttack * homeDefense * leagueAvg;

  // Form çarpanı (0.85 .. 1.15 arası)
  xgH *= 0.85 + 0.06 * formPts(h.form);
  xgA *= 0.85 + 0.06 * formPts(a.form);

  // Güvenlik klempleri
  xgH = Math.min(Math.max(xgH, 0.1), 5);
  xgA = Math.min(Math.max(xgA, 0.1), 5);

  // 0..6 gol için olasılık matrisi
  const N = 7;
  const ph = [], pa = [];
  for (let k = 0; k < N; k++) { ph.push(poisson(k, xgH)); pa.push(poisson(k, xgA)); }

  let pHome = 0, pDraw = 0, pAway = 0, pOver = 0;
  let bestP = -1, bestH = 0, bestA = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const p = ph[i] * pa[j];
    if (i > j) pHome += p;
    else if (i < j) pAway += p;
    else pDraw += p;
    if (i + j >= 3) pOver += p;
    if (p > bestP) { bestP = p; bestH = i; bestA = j; }
  }

  const sum = pHome + pDraw + pAway || 1;
  pHome /= sum; pDraw /= sum; pAway /= sum;

  const top = Math.max(pHome, pDraw, pAway);
  const confidence = top >= 0.55 ? 'high' : top >= 0.45 ? 'medium' : 'low';

  out.push({
    fixture_id: m.id,
    prob_home_win:       +pHome.toFixed(3),
    prob_draw:           +pDraw.toFixed(3),
    prob_away_win:       +pAway.toFixed(3),
    predicted_score:     bestH + '-' + bestA,
    expected_goals_home: +xgH.toFixed(2),
    expected_goals_away: +xgA.toFixed(2),
    prob_over_25:        +pOver.toFixed(3),
    prob_under_25:       +(1 - pOver).toFixed(3),
    confidence,
    model_version: 'poisson-v1',
    computed_at: now
  });
}

return [{ json: { predictions: out, count: out.length } }];
