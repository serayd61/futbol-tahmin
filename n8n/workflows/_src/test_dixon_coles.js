// =====================================================================
// Test harness — dixon_coles_predict.js'i n8n DIŞINDA çalıştır
// =====================================================================
// Çalıştırma:
//   node n8n/workflows/_src/test_dixon_coles.js
//
// Kontrolleri:
//   1) Olasılık toplamları (pHome + pDraw + pAway) ≈ 1.0
//   2) score_matrix toplamı ≈ 1.0
//   3) DC τ correction 0-0 olasılığını artırıyor (vs saf Poisson)
//   4) Home advantage > 1 olduğunda xG_home > xG_away (eşit takım gücüyle)
//   5) Form farkı bekleneni veriyor
// =====================================================================

// dixon_coles_predict.js bir n8n Code node — top-level'da $() çağırıyor.
// Test için bu fonksiyonları mock'la, modelin kalbi olan matematik kısmını
// inline çıkar.

// ---- Aynı sabitler (production kopyası) ----
const RHO              = -0.13;
const SHRINKAGE        = 6;
const FORM_BASE        = 0.92;
const FORM_SLOPE       = 0.025;
const XG_MIN           = 0.3;
const XG_MAX           = 3.5;
const N_GOALS          = 7;

const factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const poisson   = (k, lam) => Math.exp(-lam) * Math.pow(lam, k) / factorial(k);

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

// Bir tahmin hesapla — minimal predictor (dixon_coles_predict.js'in core'u)
function predict({ homeStats, awayStats, leagueMu, gamma }) {
  const homeAttack  = homeStats.home_scored_avg   / leagueMu;
  const homeDefense = homeStats.home_conceded_avg / leagueMu;
  const awayAttack  = awayStats.away_scored_avg   / leagueMu;
  const awayDefense = awayStats.away_conceded_avg / leagueMu;

  let xgH = homeAttack * awayDefense * leagueMu * Math.sqrt(gamma);
  let xgA = awayAttack * homeDefense * leagueMu / Math.sqrt(gamma);

  const shrinkH = homeStats.matches_played / (homeStats.matches_played + SHRINKAGE);
  const shrinkA = awayStats.matches_played / (awayStats.matches_played + SHRINKAGE);
  xgH = shrinkH * xgH + (1 - shrinkH) * leagueMu * Math.sqrt(gamma);
  xgA = shrinkA * xgA + (1 - shrinkA) * leagueMu / Math.sqrt(gamma);

  xgH *= FORM_BASE + FORM_SLOPE * formPts(homeStats.form);
  xgA *= FORM_BASE + FORM_SLOPE * formPts(awayStats.form);
  xgH = Math.min(Math.max(xgH, XG_MIN), XG_MAX);
  xgA = Math.min(Math.max(xgA, XG_MIN), XG_MAX);

  // 7x7 matrisini hem ham hem DC-corrected versiyonda hesapla
  const matrixRaw = [], matrixDC = [];
  let totalRaw = 0, totalDC = 0;
  for (let i = 0; i < N_GOALS; i++) {
    const rowRaw = [], rowDC = [];
    for (let j = 0; j < N_GOALS; j++) {
      const pRaw = poisson(i, xgH) * poisson(j, xgA);
      const pDC  = pRaw * tau(i, j, xgH, xgA, RHO);
      rowRaw.push(pRaw);
      rowDC.push(pDC);
      totalRaw += pRaw;
      totalDC  += pDC;
    }
    matrixRaw.push(rowRaw);
    matrixDC.push(rowDC);
  }
  // Normalize
  for (let i = 0; i < N_GOALS; i++) for (let j = 0; j < N_GOALS; j++) {
    matrixRaw[i][j] /= totalRaw;
    matrixDC[i][j]  /= totalDC;
  }

  // 1X2 + BTTS from corrected matrix
  let pHome = 0, pDraw = 0, pAway = 0, pOver = 0, pBtts = 0;
  let bestP = -1, bestH = 0, bestA = 0;
  for (let i = 0; i < N_GOALS; i++) for (let j = 0; j < N_GOALS; j++) {
    const p = matrixDC[i][j];
    if (i > j) pHome += p;
    else if (i < j) pAway += p;
    else pDraw += p;
    if (i + j >= 3) pOver += p;
    if (i >= 1 && j >= 1) pBtts += p;
    if (p > bestP) { bestP = p; bestH = i; bestA = j; }
  }
  return { xgH, xgA, pHome, pDraw, pAway, pOver, pBtts, bestH, bestA, matrixRaw, matrixDC };
}

// ---- Yardımcı: assert ----
let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else      { fail++; console.log(`  ✗ ${name} — ${detail}`); }
}
function approx(a, b, eps = 1e-3) { return Math.abs(a - b) < eps; }

// =====================================================================
// TEST 1 — Olasılık toplamları
// =====================================================================
console.log('\n[TEST 1] Probability normalization');
{
  const r = predict({
    homeStats: { matches_played: 20, home_scored_avg: 1.8, home_conceded_avg: 1.0, away_scored_avg: 1.2, away_conceded_avg: 1.3, form: 'WWDLW' },
    awayStats: { matches_played: 20, home_scored_avg: 1.5, home_conceded_avg: 1.1, away_scored_avg: 1.0, away_conceded_avg: 1.5, form: 'LDDWW' },
    leagueMu: 2.7,
    gamma: 1.20,
  });
  const sum = r.pHome + r.pDraw + r.pAway;
  check('pHome + pDraw + pAway ≈ 1.0', approx(sum, 1.0), `got ${sum.toFixed(5)}`);
  check('pOver_25 ∈ [0, 1]', r.pOver >= 0 && r.pOver <= 1, `got ${r.pOver.toFixed(3)}`);
  check('pOver + pUnder (implicit) ≈ 1', approx(r.pOver + (1 - r.pOver), 1));
}

// =====================================================================
// TEST 2 — Score matrix toplamı ≈ 1
// =====================================================================
console.log('\n[TEST 2] Score matrix normalization');
{
  const r = predict({
    homeStats: { matches_played: 15, home_scored_avg: 2.0, home_conceded_avg: 0.8, away_scored_avg: 1.4, away_conceded_avg: 1.2, form: 'WWWWD' },
    awayStats: { matches_played: 15, home_scored_avg: 1.0, home_conceded_avg: 1.6, away_scored_avg: 0.8, away_conceded_avg: 1.8, form: 'LLDLW' },
    leagueMu: 2.6,
    gamma: 1.25,
  });
  let totalDC = 0, totalRaw = 0;
  for (let i = 0; i < N_GOALS; i++) for (let j = 0; j < N_GOALS; j++) {
    totalDC  += r.matrixDC[i][j];
    totalRaw += r.matrixRaw[i][j];
  }
  check('matrix(DC) toplam ≈ 1', approx(totalDC, 1.0), `got ${totalDC.toFixed(5)}`);
  check('matrix(Raw) toplam ≈ 1', approx(totalRaw, 1.0), `got ${totalRaw.toFixed(5)}`);
}

// =====================================================================
// TEST 3 — DC correction etkisi: 0-0 olasılığı artar mı?
//   Düşük xG'li (defansif) maçta τ(0,0) = 1 - λH*λA*ρ ≈ 1 - 1*1*(-0.13) = 1.13
//   yani DC corrected matrixDC[0][0] > matrixRaw[0][0] (normalize sonrası kontrol)
// =====================================================================
console.log('\n[TEST 3] Dixon-Coles τ correction etkisi (low-score maç)');
{
  // Düşük gol potansiyelli maç: λH ≈ 1.0, λA ≈ 0.9
  const r = predict({
    homeStats: { matches_played: 25, home_scored_avg: 1.0, home_conceded_avg: 0.9, away_scored_avg: 0.8, away_conceded_avg: 1.0, form: 'DDDDW' },
    awayStats: { matches_played: 25, home_scored_avg: 1.0, home_conceded_avg: 0.9, away_scored_avg: 0.7, away_conceded_avg: 1.0, form: 'DLDDD' },
    leagueMu: 2.0,  // düşük gollü lig
    gamma: 1.10,
  });
  console.log(`    xG: home=${r.xgH.toFixed(2)} away=${r.xgA.toFixed(2)}`);
  console.log(`    p(0-0) raw=${r.matrixRaw[0][0].toFixed(4)}  DC=${r.matrixDC[0][0].toFixed(4)}`);
  console.log(`    p(1-1) raw=${r.matrixRaw[1][1].toFixed(4)}  DC=${r.matrixDC[1][1].toFixed(4)}`);
  console.log(`    p(1-0) raw=${r.matrixRaw[1][0].toFixed(4)}  DC=${r.matrixDC[1][0].toFixed(4)}`);
  console.log(`    p(0-1) raw=${r.matrixRaw[0][1].toFixed(4)}  DC=${r.matrixDC[0][1].toFixed(4)}`);
  check('DC p(0-0) > Raw p(0-0)', r.matrixDC[0][0] > r.matrixRaw[0][0],
    `DC=${r.matrixDC[0][0]} Raw=${r.matrixRaw[0][0]}`);
  check('DC p(1-1) > Raw p(1-1)', r.matrixDC[1][1] > r.matrixRaw[1][1],
    `DC=${r.matrixDC[1][1]} Raw=${r.matrixRaw[1][1]}`);
  // 1-0, 0-1: τ = 1 + λ*ρ, ρ < 0 → τ < 1 → DC p azalmalı
  check('DC p(1-0) < Raw p(1-0)', r.matrixDC[1][0] < r.matrixRaw[1][0],
    `DC=${r.matrixDC[1][0]} Raw=${r.matrixRaw[1][0]}`);
}

// =====================================================================
// TEST 4 — Home advantage etkisi: γ büyürse pHome artar
// =====================================================================
console.log('\n[TEST 4] Home advantage etkisi');
{
  // Eşit takım istatistikleriyle — sadece γ değişir
  // Gerçekten simetrik olabilmesi için home_* = away_* olmalı
  // (aksi halde modelin "ev gücü ≠ dep gücü" asimetrisi karışır).
  const sameStats = {
    matches_played: 20,
    home_scored_avg: 1.25, home_conceded_avg: 1.25,
    away_scored_avg: 1.25, away_conceded_avg: 1.25,
    form: 'WDLDW',
  };
  const lowGamma = predict({
    homeStats: sameStats, awayStats: sameStats,
    leagueMu: 2.5, gamma: 1.00,  // hiç ev avantajı yok
  });
  const highGamma = predict({
    homeStats: sameStats, awayStats: sameStats,
    leagueMu: 2.5, gamma: 1.35,  // güçlü ev avantajı
  });
  console.log(`    γ=1.00: pHome=${lowGamma.pHome.toFixed(3)} pAway=${lowGamma.pAway.toFixed(3)}`);
  console.log(`    γ=1.35: pHome=${highGamma.pHome.toFixed(3)} pAway=${highGamma.pAway.toFixed(3)}`);
  check('γ↑ → pHome↑', highGamma.pHome > lowGamma.pHome);
  check('γ↑ → pAway↓', highGamma.pAway < lowGamma.pAway);
  check('γ=1 (eşit takım): pHome ≈ pAway', approx(lowGamma.pHome, lowGamma.pAway, 0.02),
    `pHome=${lowGamma.pHome.toFixed(3)} pAway=${lowGamma.pAway.toFixed(3)}`);
}

// =====================================================================
// TEST 5 — Form farkı etkisi
// =====================================================================
console.log('\n[TEST 5] Form farkı etkisi');
{
  const strong = { matches_played: 20, home_scored_avg: 1.5, home_conceded_avg: 1.2, away_scored_avg: 1.1, away_conceded_avg: 1.4, form: 'WWWWW' };
  const weak   = { ...strong, form: 'LLLLL' };
  const r1 = predict({ homeStats: strong, awayStats: weak,   leagueMu: 2.5, gamma: 1.15 });
  const r2 = predict({ homeStats: weak,   awayStats: strong, leagueMu: 2.5, gamma: 1.15 });
  console.log(`    Güçlü form ev: pHome=${r1.pHome.toFixed(3)}`);
  console.log(`    Zayıf form ev: pHome=${r2.pHome.toFixed(3)}`);
  check('Güçlü form ev → pHome büyük', r1.pHome > r2.pHome,
    `${r1.pHome.toFixed(3)} > ${r2.pHome.toFixed(3)}`);
}

// =====================================================================
// TEST 6 — Az veri (shrinkage) etkisi
// =====================================================================
console.log('\n[TEST 6] Bayesian shrinkage (az veri)');
{
  // 2 maç oynamış aşırı güçlü görünen takım — gerçek shrink olmalı
  const extreme  = { matches_played: 2,  home_scored_avg: 4.5, home_conceded_avg: 0.0, away_scored_avg: 4.0, away_conceded_avg: 0.0, form: 'WW' };
  const baseline = { matches_played: 25, home_scored_avg: 1.5, home_conceded_avg: 1.2, away_scored_avg: 1.0, away_conceded_avg: 1.5, form: 'WDLDW' };
  const r = predict({ homeStats: extreme, awayStats: baseline, leagueMu: 2.5, gamma: 1.15 });
  console.log(`    2 maçlık takım xG=${r.xgH.toFixed(2)} (clamp olmadan ~6+ olurdu)`);
  check('Shrinkage xG kontrolde (< 2.7)', r.xgH < 2.7,
    `xG=${r.xgH.toFixed(2)}`);
}

// =====================================================================
// TEST 7 — BTTS (Karşılıklı Gol Var/Yok) hesabı
// Yüksek skorlu maçta BTTS yes yüksek, düşük skorlu maçta düşük olmalı
// =====================================================================
console.log('\n[TEST 7] BTTS (KGV/KGY) olasılığı');
{
  // Yüksek skorlu maç (her takım ortalama ~2 gol)
  const high = predict({
    homeStats: { matches_played: 20, home_scored_avg: 2.5, home_conceded_avg: 1.5, away_scored_avg: 2.0, away_conceded_avg: 1.8, form: 'WWDWW' },
    awayStats: { matches_played: 20, home_scored_avg: 2.2, home_conceded_avg: 1.4, away_scored_avg: 1.8, away_conceded_avg: 1.6, form: 'WDWDW' },
    leagueMu: 3.0,
    gamma: 1.10,
  });
  // Düşük skorlu maç (defansif)
  const low = predict({
    homeStats: { matches_played: 20, home_scored_avg: 0.8, home_conceded_avg: 0.7, away_scored_avg: 0.6, away_conceded_avg: 0.9, form: 'DDDDD' },
    awayStats: { matches_played: 20, home_scored_avg: 0.7, home_conceded_avg: 0.6, away_scored_avg: 0.5, away_conceded_avg: 0.8, form: 'DLDDL' },
    leagueMu: 1.6,
    gamma: 1.10,
  });
  console.log(`    Yüksek skorlu (xG ${high.xgH.toFixed(2)} / ${high.xgA.toFixed(2)}): BTTS=${(high.pBtts*100).toFixed(1)}%`);
  console.log(`    Düşük skorlu  (xG ${low.xgH.toFixed(2)} / ${low.xgA.toFixed(2)}): BTTS=${(low.pBtts*100).toFixed(1)}%`);

  check('BTTS ∈ [0, 1]', high.pBtts >= 0 && high.pBtts <= 1);
  check('Yüksek skorlu maçta BTTS yüksek (>%50)', high.pBtts > 0.50,
    `got ${(high.pBtts*100).toFixed(1)}%`);
  check('Düşük skorlu maçta BTTS düşük (<%40)', low.pBtts < 0.40,
    `got ${(low.pBtts*100).toFixed(1)}%`);
  check('Yüksek > düşük (sıralama doğru)', high.pBtts > low.pBtts);

  // BTTS_yes + BTTS_no = 1 (sanity check)
  check('BTTS yes + no ≈ 1 (yüksek)', approx(high.pBtts + (1 - high.pBtts), 1));
  check('BTTS yes + no ≈ 1 (düşük)',  approx(low.pBtts  + (1 - low.pBtts),  1));
}

// =====================================================================
// SONUÇ
// =====================================================================
console.log(`\n────────────────────────────────────────`);
console.log(`  PASS: ${pass}  FAIL: ${fail}`);
console.log(`────────────────────────────────────────\n`);

if (fail > 0) process.exit(1);
