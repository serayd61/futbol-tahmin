// =====================================================================
// Dixon-Coles V1 (model_version = 'dc-v1')
// =====================================================================
// Poisson v2'nin omurgası üstüne 3 ekleme:
//   1. Dixon-Coles τ düzeltmesi  → düşük skorlu maçlarda (0-0, 1-0, 0-1, 1-1)
//      negatif korelasyonu modelle. Tam skor isabet için en büyük kazanç.
//   2. Explicit lig-bazlı home advantage (γ_league)
//      → her ligin kendi ev avantajı (Süper Lig 1.35 ≠ Premier 1.20).
//   3. Feature attribution (factors jsonb)
//      → match detail UI'da "neden bu tahmin" için kullanılır.
//
// Schema bağımlılığı: migration 07 çalıştırılmış olmalı.
// Input node'ları:
//   - "Get Upcoming Fixtures"   → fixture array
//   - "Get Team Stats"          → team_stats array
//   - "Get League Home Adv"     → league_home_advantage view sonucu (yeni)
//
// Çıktı: predictions tablosuna upsert için array.
// =====================================================================

function readAll(nodeName) {
  const items = $(nodeName).all();
  if (items.length === 1 && Array.isArray(items[0].json)) return items[0].json;
  return items.map(i => i.json);
}

// Yardımcı: bir node yoksa boş array dön
function safeRead(nodeName) {
  try { return readAll(nodeName); } catch (e) { return []; }
}

const fixtures      = readAll('Get Upcoming Fixtures');
const teamStatsRaw  = readAll('Get Team Stats');
const leagueAdvRaw  = safeRead('Get League Home Adv');  // yeni view; yoksa fallback

const teamStats = teamStatsRaw.flatMap(s => Array.isArray(s?.data) ? s.data : [s]);
const leagueAdv = leagueAdvRaw.flatMap(s => Array.isArray(s?.data) ? s.data : [s]);

const statsMap = new Map(teamStats.map(s => [s.team_id, s]));
const advMap   = new Map(
  leagueAdv
    .filter(l => l && l.league_id != null)
    .map(l => [Number(l.league_id), {
      home_adv:  Number(l.home_advantage_ratio) || 1.0,
      league_mu: Number(l.league_avg_goals)     || null,
    }])
);

// Lig başına observed averages (team_stats üzerinden) — fallback için
const leagueAggs = new Map();
for (const s of teamStats) {
  if (!leagueAggs.has(s.league_id)) leagueAggs.set(s.league_id, { scored: 0, conceded: 0, count: 0 });
  const a = leagueAggs.get(s.league_id);
  a.scored   += Number(s.goals_scored_avg)   || 0;
  a.conceded += Number(s.goals_conceded_avg) || 0;
  a.count++;
}

// =====================================================================
// Matematik yardımcıları
// =====================================================================
const factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const poisson   = (k, lam) => Math.exp(-lam) * Math.pow(lam, k) / factorial(k);

// Dixon-Coles τ — sadece i, j ∈ {0, 1} için non-trivial
function tau(i, j, lamH, lamA, rho) {
  if (i === 0 && j === 0) return Math.max(0, 1 - lamH * lamA * rho);
  if (i === 0 && j === 1) return Math.max(0, 1 + lamH * rho);
  if (i === 1 && j === 0) return Math.max(0, 1 + lamA * rho);
  if (i === 1 && j === 1) return Math.max(0, 1 - rho);
  return 1;
}

const formPts = form => {
  if (!form) return 2.5;
  let pts = 0;
  for (const c of form) pts += (c === 'W' ? 1 : c === 'D' ? 0.5 : 0);
  return pts;
};

// =====================================================================
// Sabitler (dc-v1)
// =====================================================================
const RHO              = -0.13;   // DC dependence (negative). [-0.18..-0.10] tipik
const SHRINKAGE        = 6;       // Bayesian shrinkage (poisson-v2 ile aynı)
const FORM_BASE        = 0.92;
const FORM_SLOPE       = 0.025;
const XG_MIN           = 0.3;
const XG_MAX           = 3.5;
const CONF_HIGH        = 0.60;
const CONF_MED         = 0.45;
const MIN_MATCHES_HIGH = 5;
const N_GOALS          = 7;       // 0..6 grid

const out = [];
const now = new Date().toISOString();

for (const m of fixtures) {
  const h = statsMap.get(m.home_team_id);
  const a = statsMap.get(m.away_team_id);
  if (!h || !a) continue;

  // ---------------------------------------------------------------------
  // 1) Lig parametreleri
  // ---------------------------------------------------------------------
  const adv = advMap.get(Number(m.league_id));
  const agg = leagueAggs.get(m.league_id);
  if (!agg || agg.count === 0) continue;

  const leagueAvgFromStats = agg.scored / agg.count;
  // Tercih: view'deki gerçek lig ortalaması; yoksa team_stats'tan türetilen
  const leagueMu = adv?.league_mu && adv.league_mu > 0 ? adv.league_mu : leagueAvgFromStats;
  if (leagueMu <= 0) continue;

  const γ = adv?.home_adv && adv.home_adv > 0 ? adv.home_adv : 1.10;  // default global avg

  // ---------------------------------------------------------------------
  // 2) Takım gücü (attack / defense) — multiplicative
  // ---------------------------------------------------------------------
  const homeAttack  = (Number(h.home_scored_avg)   || 0) / leagueMu;
  const homeDefense = (Number(h.home_conceded_avg) || 0) / leagueMu;
  const awayAttack  = (Number(a.away_scored_avg)   || 0) / leagueMu;
  const awayDefense = (Number(a.away_conceded_avg) || 0) / leagueMu;

  // DC-style λ: home avantajı explicit γ ile
  let xgH_raw = homeAttack * awayDefense * leagueMu * Math.sqrt(γ);
  let xgA_raw = awayAttack * homeDefense * leagueMu / Math.sqrt(γ);

  // ---------------------------------------------------------------------
  // 3) Bayesian shrinkage — az veri → lig ortalamasına çek
  // ---------------------------------------------------------------------
  const hMatches = Number(h.matches_played) || 0;
  const aMatches = Number(a.matches_played) || 0;
  const minMatches = Math.min(hMatches, aMatches);

  const shrinkH = hMatches / (hMatches + SHRINKAGE);
  const shrinkA = aMatches / (aMatches + SHRINKAGE);

  let xgH = shrinkH * xgH_raw + (1 - shrinkH) * leagueMu * Math.sqrt(γ);
  let xgA = shrinkA * xgA_raw + (1 - shrinkA) * leagueMu / Math.sqrt(γ);

  // ---------------------------------------------------------------------
  // 4) Form weighting
  // ---------------------------------------------------------------------
  const formH_mult = FORM_BASE + FORM_SLOPE * formPts(h.form);
  const formA_mult = FORM_BASE + FORM_SLOPE * formPts(a.form);
  xgH *= formH_mult;
  xgA *= formA_mult;

  // ---------------------------------------------------------------------
  // 5) Clamp (outlier guard)
  // ---------------------------------------------------------------------
  xgH = Math.min(Math.max(xgH, XG_MIN), XG_MAX);
  xgA = Math.min(Math.max(xgA, XG_MIN), XG_MAX);

  // ---------------------------------------------------------------------
  // 6) Poisson grid + Dixon-Coles τ correction
  // ---------------------------------------------------------------------
  const ph = [], pa = [];
  for (let k = 0; k < N_GOALS; k++) {
    ph.push(poisson(k, xgH));
    pa.push(poisson(k, xgA));
  }

  // 7x7 ortak olasılık matrisi (τ uygulanmış)
  const matrix = [];
  let totalP = 0;
  for (let i = 0; i < N_GOALS; i++) {
    const row = [];
    for (let j = 0; j < N_GOALS; j++) {
      const corr = tau(i, j, xgH, xgA, RHO);
      const p = ph[i] * pa[j] * corr;
      row.push(p);
      totalP += p;
    }
    matrix.push(row);
  }
  // τ olasılık toplamını 1'den biraz saptırır — normalize et
  for (let i = 0; i < N_GOALS; i++) {
    for (let j = 0; j < N_GOALS; j++) {
      matrix[i][j] = matrix[i][j] / totalP;
    }
  }

  // ---------------------------------------------------------------------
  // 7) 1X2 + üst/alt 2.5 + BTTS (KGV/KGY) + tahmini skor (matristen türet)
  // BTTS yes = P(home ≥ 1 AND away ≥ 1) — sepet sisteminin yeni pazarı
  // ---------------------------------------------------------------------
  let pHome = 0, pDraw = 0, pAway = 0, pOver = 0, pBtts = 0;
  let bestP = -1, bestH = 0, bestA = 0;
  for (let i = 0; i < N_GOALS; i++) {
    for (let j = 0; j < N_GOALS; j++) {
      const p = matrix[i][j];
      if (i > j)      pHome += p;
      else if (i < j) pAway += p;
      else            pDraw += p;
      if (i + j >= 3) pOver += p;
      if (i >= 1 && j >= 1) pBtts += p;   // her iki takım da gol attı
      if (p > bestP) { bestP = p; bestH = i; bestA = j; }
    }
  }

  // ---------------------------------------------------------------------
  // 8) Confidence (poisson-v2 ile aynı kural)
  // ---------------------------------------------------------------------
  const top = Math.max(pHome, pDraw, pAway);
  let confidence;
  if (minMatches < MIN_MATCHES_HIGH)        confidence = 'low';
  else if (top >= CONF_HIGH)                confidence = 'high';
  else if (top >= CONF_MED)                 confidence = 'medium';
  else                                       confidence = 'low';

  // ---------------------------------------------------------------------
  // 9) Feature attribution — log-odds katkıları (uniform 1/3'e göre)
  //    Match detail UI'da bar chart için.
  // ---------------------------------------------------------------------
  const ln = x => (x > 0 ? Math.log(x) : 0);
  const factors = {
    // Lig home advantage'ın log-odds etkisi
    home_advantage: +ln(γ).toFixed(4),
    // Takım gücü farkı (saldırı × savunma, ev/dep)
    team_strength_diff: +ln((homeAttack * awayDefense) / Math.max(awayAttack * homeDefense, 1e-6)).toFixed(4),
    // Form farkı
    form_diff: +(formH_mult - formA_mult).toFixed(4),
    // Dixon-Coles düzeltmesinin toplam etkisi (yaklaşık)
    // τ uygulanmadan önceki vs sonraki home_win prob farkı approximate
    dc_correction: +(0).toFixed(4),  // placeholder, ileride exact hesap eklenebilir
    // Shrinkage etkisi (1 - shrink ne kadar büyükse o kadar "lig ortalamasına çekildi")
    shrinkage_pull: +((1 - shrinkH) + (1 - shrinkA)).toFixed(4),
    // Effective ESS
    min_matches: minMatches,
    // Ham xG değerleri (debugging için)
    xg_home_raw: +xgH_raw.toFixed(3),
    xg_away_raw: +xgA_raw.toFixed(3),
  };

  // ---------------------------------------------------------------------
  // 10) Çıktı
  // ---------------------------------------------------------------------
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
    // BTTS (Karşılıklı Gol Var/Yok) — Tahmin Sepeti V2 yeni pazarı
    prob_btts_yes:       +pBtts.toFixed(3),
    prob_btts_no:        +(1 - pBtts).toFixed(3),
    confidence,
    model_version: 'dc-v1',
    computed_at: now,
    // Yeni kolonlar (migration 07)
    score_matrix: matrix.map(row => row.map(p => +p.toFixed(5))),
    home_advantage: +γ.toFixed(3),
    rho: RHO,
    factors,
  });
}

return [{ json: { predictions: out, count: out.length, model_version: 'dc-v1' } }];
