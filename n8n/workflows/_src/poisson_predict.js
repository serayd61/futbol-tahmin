// Poisson v2 — kalibrasyonu iyileştirilmiş tahmin motoru
// Değişiklikler v1'e göre:
//  • Bayesian shrinkage: az veri olan takımları lig ortalamasına çek
//  • Form weight yumuşatıldı: 0.92..1.05 (eski: 0.85..1.15)
//  • xG aralığı daraltıldı: 0.3..3.5 (eski: 0.1..5.0)
//  • Confidence sıkılaştı: high ≥ 0.60, az veriyse her zaman low

function readAll(nodeName) {
  const items = $(nodeName).all();
  if (items.length === 1 && Array.isArray(items[0].json)) return items[0].json;
  return items.map(i => i.json);
}

const fixtures     = readAll('Get Upcoming Fixtures');
const teamStatsRaw = readAll('Get Team Stats');

// Aggregate node varsa bazen { data: [...] } sarmasıyla gelir
const teamStats = teamStatsRaw.flatMap(s => {
  if (s && Array.isArray(s.data)) return s.data;
  return [s];
});

const statsMap = new Map(teamStats.map(s => [s.team_id, s]));

// Lig başına ortalamalar
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

// V2 — Bayesian shrinkage parametreleri
const SHRINKAGE = 6;          // ~6 maç sonra observed weight > league avg weight
const FORM_BASE = 0.92;       // V1: 0.85
const FORM_SLOPE = 0.025;     // V1: 0.06
const XG_MIN = 0.3;           // V1: 0.1
const XG_MAX = 3.5;           // V1: 5.0
const CONF_HIGH = 0.60;       // V1: 0.55
const CONF_MED  = 0.45;       // V1 ile aynı
const MIN_MATCHES_FOR_HIGH = 5; // 5'ten az maç oynamış takımı hiç "high" diye etiketleme

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

  // V1 multiplicative xG
  const homeAttack  = (Number(h.home_scored_avg)   || 0) / leagueAvg;
  const homeDefense = (Number(h.home_conceded_avg) || 0) / leagueAvg;
  const awayAttack  = (Number(a.away_scored_avg)   || 0) / leagueAvg;
  const awayDefense = (Number(a.away_conceded_avg) || 0) / leagueAvg;

  let xgH_raw = homeAttack * awayDefense * leagueAvg;
  let xgA_raw = awayAttack * homeDefense * leagueAvg;

  // V2 — Bayesian shrinkage: az veri → lig ortalamasına yaklaş
  const hMatches = Number(h.matches_played) || 0;
  const aMatches = Number(a.matches_played) || 0;
  const minMatches = Math.min(hMatches, aMatches);

  const shrinkH = hMatches / (hMatches + SHRINKAGE);
  const shrinkA = aMatches / (aMatches + SHRINKAGE);

  let xgH = shrinkH * xgH_raw + (1 - shrinkH) * leagueAvg;
  let xgA = shrinkA * xgA_raw + (1 - shrinkA) * leagueAvg;

  // V2 — yumuşatılmış form weight
  xgH *= FORM_BASE + FORM_SLOPE * formPts(h.form);
  xgA *= FORM_BASE + FORM_SLOPE * formPts(a.form);

  // V2 — sıkılaştırılmış clamp
  xgH = Math.min(Math.max(xgH, XG_MIN), XG_MAX);
  xgA = Math.min(Math.max(xgA, XG_MIN), XG_MAX);

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

  // V2 — confidence sıkılaştı + az veri penaltisi
  const top = Math.max(pHome, pDraw, pAway);
  let confidence;
  if (minMatches < MIN_MATCHES_FOR_HIGH) {
    confidence = 'low';                     // az veri → asla "high" deme
  } else if (top >= CONF_HIGH) {
    confidence = 'high';
  } else if (top >= CONF_MED) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

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
    model_version: 'poisson-v2',
    computed_at: now,
  });
}

return [{ json: { predictions: out, count: out.length } }];
