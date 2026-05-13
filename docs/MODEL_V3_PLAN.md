# 🧠 Tahmin Modeli V3 — Derinleşme Planı

> **Hedef:** Mevcut `poisson-v2` modelini Dixon-Coles düzeltmesi + time decay + lig home advantage + explainability ile **bilimsel olarak ölçülebilir** şekilde iyileştirmek.
>
> **Yaklaşım:** Önce baseline'ı ölç → yeni modeli A/B karşılaştır → tutarsa ana model yap.
>
> **Başarı kriteri:** 30 gün canlı verisinde 1X2 isabet ≥ +%2, tam skor isabet ≥ +%3, üst/alt 2.5 Brier score ≤ baseline.

---

## 📍 Şu an nerede olduğumuzun haritası

**Mevcut modelde (`poisson-v2`) doğru olanlar:**

Multiplicative xG formülü standart Dixon-Coles iskeletinin Poisson kısmı. Bayesian shrinkage zaten doğru implement edilmiş (`SHRINKAGE=6`). Form weighting `0.92 + 0.025 × form_pts` yumuşak, mantıklı. xG clamp `[0.3, 3.5]` outlier'ı bastırıyor. Confidence eşikleri (`high ≥ 0.60`, `min 5 maç`) konservatif — kullanıcıyı yanıltma riski düşük.

**Eksikler:**

1. **Dixon-Coles τ düzeltmesi yok.** Bağımsız Poisson 0-0, 1-0, 0-1, 1-1 skorlarını sistematik underestimate eder. Bu, futbol için bilinen bir hata — düşük skorlu maçlarda iki gol arası negatif korelasyon var (bir takım kalecisi yorulduğunda diğeri de ikinciyi atma şansı azalır gibi). Tam skor isabet oranı için en hızlı kazanç.
2. **Lig-bazlı home advantage parametresi yok.** Süper Lig'de ev sahibi avantajı (xG farkı olarak) Premier League'inkinden farklı. Şu an `home_scored_avg` zımni veriyor ama `γ_league` katsayısı explicit değil — kalibre etmek zor.
3. **Time decay yok.** `aggregate_stats.js` son 30 gün maçlarını eşit ağırlıkla topluyor. "Geçen ay 3-0 yendik" ile "dün 1-0 yenildik" eşdeğer — gerçeklik bu değil.
4. **Kalibrasyon ölçümü yok.** Model "%60 olasılık" derken gerçekten %60'ında mı tutuyor bilmiyoruz. Brier score, calibration plot, log loss — hiçbiri hesaplanmıyor.
5. **`score_matrix` saklanmıyor.** UI'da heatmap göstermek için tahmin anında 7×7 matris hesaplanıyor ama atılıyor. JSONB olarak kaydedersek hem heatmap, hem değişim analizi (model bugün 2-1 derdi, dün 1-1 derdi) için kullanırız.
6. **Feature attribution yok.** "Tahminin Sebebi" hard-coded kurallarla yazılıyor (form farkı > 3p ise söyle), modelden gelmiyor. SHAP-benzeri katkı yüzdesi olmalı.
7. **Lineup/sakatlık yok.** API-Football lineup endpoint'i var, kullanmıyoruz. "Salah yok" tahmini değiştirmiyor.

---

## 🎯 Faz haritası

| # | Faz | Süre | Etki | Bağımlılık |
|---|-----|------|------|------------|
| A | Kalibrasyon view + baseline ölçümü | 0.5 g | 🔥🔥 | Yok — önce bunu yap |
| B | Schema migration (`score_matrix`, `factors` jsonb) | 0.3 g | 🔥🔥 | Yok |
| C | Dixon-Coles τ + lig home advantage (`dc-v1`) | 1 g | 🔥🔥🔥 | B |
| D | Time decay (`aggregate_stats.js`) | 0.5 g | 🔥🔥 | Yok |
| E | A/B karşılaştırma + canary deploy | 0.5 g | 🔥🔥🔥 | A + C |
| F | Feature attribution (SHAP-style factors) | 1 g | 🔥🔥 | B + C |
| G | Score matrix heatmap (match detail UI) | 0.5 g | 🔥🔥 | B + UX Faz 4 |
| H | (İleri) Lineup/sakatlık entegrasyonu | 2 g | 🔥 | API-Football quota |

> Toplam ~6 günlük disiplinli iş. Her faz commit'lenebilir, n8n'e ayrı workflow olarak deploy edilebilir.

---

## 📊 Faz A — Kalibrasyon view + baseline ölçümü

**Neden önce bu:** Yeni modelin daha iyi olduğunu söyleyebilmek için ölçü birimi gerek. Şu an "isabet %X" var ama Brier score yok, lig kırılımı yok, confidence band kalibrasyonu yok.

### A.1 SQL view: `model_calibration`

```sql
create or replace view model_calibration as
with bands as (
  select
    p.fixture_id,
    p.model_version,
    p.confidence,
    f.league_id,
    f.utc_date,
    -- Predicted probability of actual outcome
    case
      when f.home_goals > f.away_goals then p.prob_home_win
      when f.home_goals < f.away_goals then p.prob_away_win
      else p.prob_draw
    end as prob_actual,
    -- Brier score components (for 1X2 — 3-way)
    (case when f.home_goals > f.away_goals then 1 else 0 end - p.prob_home_win) ^ 2 +
    (case when f.home_goals = f.away_goals then 1 else 0 end - p.prob_draw)     ^ 2 +
    (case when f.home_goals < f.away_goals then 1 else 0 end - p.prob_away_win) ^ 2 as brier_1x2,
    -- Hit/miss
    case when (case
      when f.home_goals > f.away_goals then 'H'
      when f.home_goals < f.away_goals then 'A'
      else 'D'
    end) = (case
      when p.prob_home_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'H'
      when p.prob_away_win = greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) then 'A'
      else 'D'
    end) then 1 else 0 end as hit_1x2,
    -- Probability bucket (50-60, 60-70, ...)
    floor(greatest(p.prob_home_win, p.prob_draw, p.prob_away_win) * 10) * 10 as prob_bucket
  from predictions p
  join fixtures   f on f.id = p.fixture_id
  where f.status = 'FINISHED'
    and f.home_goals is not null
)
select
  model_version,
  confidence,
  prob_bucket,
  count(*)                            as total,
  sum(hit_1x2)::float / count(*)      as actual_hit_rate,
  avg(prob_actual)::float             as expected_hit_rate,
  avg(brier_1x2)::float               as brier_score
from bands
group by 1, 2, 3
order by 1, 2, 3;
```

Bu view şu soruyu yanıtlar: "Model %60-70 dediğinde gerçekte ne kadar tutuyor?". İyi kalibre bir model için `actual ≈ expected`. Eğer model overconfident'sa `actual < expected`.

### A.2 Brier score baseline

```sql
select
  model_version,
  count(*) as total,
  avg(brier_1x2)::float as avg_brier,
  -- 1X2 random baseline: ~0.667 (uniform 1/3-1/3-1/3)
  -- Mükemmel model: 0
  -- Tipik futbol modeli: 0.55-0.62
  sum(hit_1x2)::float / count(*) as accuracy
from model_calibration_raw  -- (view'in alt sorgusu)
group by model_version;
```

Yeni `dc-v1` modelinin Brier score'u `poisson-v2`'den **en az %3 daha düşük** olmalı.

### A.3 Mobil stats sayfasında kalibrasyon kartı

Yeni `AccuracyCard` türevi:

```
Kalibrasyon                          ●●●○○  3/5
─────────────────────────────────────
%50-60 dediğimizde   ►  %54  (52 maç)  ✓
%60-70 dediğimizde   ►  %68  (38 maç)  ✓
%70-80 dediğimizde   ►  %61  (15 maç)  ⚠ overconfident
%80+  dediğimizde    ►  %82  (8 maç)   ✓
─────────────────────────────────────
Brier skoru: 0.572
```

3/5 yıldız = kaç band'da `|actual - expected| < 5pp`.

---

## 🧮 Faz B — Schema migration

`predictions` tablosuna 4 kolon ekle:

```sql
alter table predictions add column if not exists score_matrix  jsonb;
alter table predictions add column if not exists home_advantage numeric(4,3);
alter table predictions add column if not exists rho           numeric(5,4);
alter table predictions add column if not exists factors       jsonb;

create index if not exists idx_predictions_model_version on predictions (model_version);
```

`score_matrix`: 7×7 array, `[[p00, p01, ...], [p10, p11, ...], ...]`. Boyut: ~600 bytes per row, 1000 maç → 600KB. İhmal edilebilir.

`factors`: feature attribution. Örnek:

```json
{
  "league_avg":   0.052,
  "home_advantage": 0.118,
  "team_strength_diff": 0.073,
  "form_diff":   -0.022,
  "dc_correction": -0.008
}
```

Toplam = ev sahibi kazanma olasılığının `1/3` üstü/altı katkıları (uniform prior'a göre).

---

## 🎯 Faz C — Dixon-Coles τ + lig home advantage (`dc-v1`)

### C.1 Lig home advantage hesabı (yeni team_stats kolonu yerine query)

```sql
create or replace view league_home_advantage as
select
  league_id,
  avg(home_goals)::numeric(4,2) as avg_home_goals,
  avg(away_goals)::numeric(4,2) as avg_away_goals,
  (avg(home_goals) / nullif(avg(away_goals), 0))::numeric(4,3) as home_advantage_ratio
from fixtures
where status = 'FINISHED'
  and home_goals is not null
  and utc_date >= now() - interval '180 days'
group by league_id;
```

Tipik değerler:
- Premier League ~1.20-1.25
- Süper Lig ~1.30-1.40 (ev sahibi avantajı yüksek)
- Bundesliga ~1.15

### C.2 Dixon-Coles τ formülü

Klasik DC: bağımsız Poisson olasılığını τ ile düzelt (sadece i, j ∈ {0,1}):

```
τ(0, 0) = 1 - λ_home × λ_away × ρ
τ(0, 1) = 1 + λ_home × ρ
τ(1, 0) = 1 + λ_away × ρ
τ(1, 1) = 1 - ρ
τ(i, j) = 1   diğer tüm i, j için
```

`ρ` (rho): tipik -0.13 ile -0.18 arası (negative dependence). Sabit başla, sonra MLE ile fit edilebilir.

```js
function dixonColesCorrection(i, j, lamH, lamA, rho) {
  if (i === 0 && j === 0) return 1 - lamH * lamA * rho;
  if (i === 0 && j === 1) return 1 + lamH * rho;
  if (i === 1 && j === 0) return 1 + lamA * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}
```

### C.3 Yeni model dosyası

`n8n/workflows/_src/dixon_coles_predict.js`:

```js
// poisson v2'nin temellerini koru, üzerine DC τ + explicit home advantage + factor attribution ekle
// model_version: 'dc-v1'
//
// Çıktı kolonları (eski + yeni):
//   score_matrix:    7x7 olasılık matrisi (jsonb)
//   home_advantage:  bu lige özgü γ
//   rho:             kullanılan ρ (sabit -0.13 v1'de)
//   factors:         { league_avg, home_advantage, team_strength_diff, form_diff, dc_correction }
```

Tam dosyayı yazıyorum (aşağıda).

### C.4 Beklenen iyileşme

- **Tam skor isabet (`hit_score`):** +%3 ila +%5 (DC'nin bilinen etkisi)
- **1X2 isabet:** +%1 ila +%2 (marjinal, ana atılım score'da)
- **Brier score (1X2):** -%2 ila -%4 (daha iyi kalibre)
- **0-0 / 1-1 öngörü:** doğru sınıfa düşme oranı +%8 (DC'nin en güçlü olduğu yer)

---

## ⏱️ Faz D — Time decay

`aggregate_stats.js`'te şu an her maç eşit ağırlık. Exponential decay ekle:

```js
const HALF_LIFE_DAYS = 45;
const now = Date.now();

function weight(matchDate) {
  const ageDays = (now - new Date(matchDate).getTime()) / 86_400_000;
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}
```

Her toplamaya weight çarp:
- `h.home_scored += m.home_goals * w`
- `h.home_matches += w` (effective sample size)
- avg = scored / matches (ağırlıklı ortalama)

**Effective sample size**: 30 gün eşit ağırlık → ESS=30. 45 gün half-life, son 90 gün maç havuzu → ESS ≈ 30 (yakın), ama son maçlar 2x daha çok söz sahibi.

Bayesian shrinkage'da `matches_played` yerine `effective_matches_played` kullan — shrinkage faktörü ESS'e göre kalibre.

---

## 🆎 Faz E — A/B karşılaştırma

İki modeli paralel çalıştır: `poisson-v2` (mevcut) + `dc-v1` (yeni). Aynı fixture için iki satır:

```sql
-- predictions tablosunda compound key:
alter table predictions
  drop constraint predictions_pkey,
  add primary key (fixture_id, model_version);
```

(Mevcut data migration: tüm v2 satırlarına model_version=poisson-v2 set et, schema değişir.)

n8n'de:
1. `predictions-compute-v2` workflow (mevcut, dokunma)
2. `predictions-compute-dc-v1` workflow (yeni)

Stats sayfasında "Aktif model: poisson-v2 · Karşılaştırma: dc-v1 +%3.2 isabet" göster.

7-14 gün canary süresi sonunda dc-v1 anlamlı kazanıyorsa:
- Mobile `queries.ts` `prediction` çekerken `model_version='dc-v1'` filtresi
- v2 görünmez olur ama data'da kalır (geri dönüş için)

---

## 🔬 Faz F — Feature attribution

DC modelinde `factors` jsonb kolonuna her tahminin "neden"ini kaydet:

```js
const factors = {
  // Uniform prior'a göre log-odds katkı (0 = no impact)
  home_advantage:      Math.log(γ_league),
  team_strength_diff:  Math.log(homeAttack * awayDefense / (awayAttack * homeDefense)),
  form_diff:           formMultiplier_home - formMultiplier_away,
  dc_correction:       τ_total_effect,
  shrinkage_pull:      (1 - shrinkH) + (1 - shrinkA),
};
```

Match detail sayfasında bar chart:

```
Tahmin: Arsenal %58
─────────────────────────────────
Ev avantajı           ████████  +12%
Form farkı            █████      +8%
Takım gücü farkı      ███        +5%
DC düzeltmesi         ▌         -1%
H2H (rule-based)      ██        +3%
─────────────────────────────────
```

UX planı Faz 4'teki "Tahminin Sebebi" bölümünü bu data ile yenile.

---

## 🌡️ Faz G — Score matrix heatmap

UX planı Faz 4'le birleşir. `predictions.score_matrix` artık jsonb'da hazır → mobile:

```tsx
import type { Prediction } from '../lib/types';
// types.ts'e ekle:
//   score_matrix?: number[][];

<ScoreHeatmap matrix={prediction.score_matrix} />
```

7×7 grid, her hücre `backgroundColor: rgba(34,197,94, prob * 6)`, en yüksek prob hücresi border ile vurgu, tap'leyince tooltip.

---

## 🏥 Faz H — Lineup / sakatlık (uzun vadeli)

API-Football'da:
- `/v3/fixtures/lineups?fixture={id}` — ilk 11
- `/v3/injuries?team={id}` — sakatlık listesi

Yeni tablolar:

```sql
create table fixture_lineups (
  fixture_id  bigint references fixtures(id) on delete cascade,
  team_id     bigint references teams(id),
  player_id   bigint,
  player_name text,
  position    text,
  is_starter  bool,
  primary key (fixture_id, team_id, player_id)
);

create table player_xg_contribution (
  player_id  bigint primary key,
  team_id    bigint references teams(id),
  xg_per_90  numeric(4,3),
  xa_per_90  numeric(4,3),
  matches    int
);
```

Model'de:

```js
// Eksik oyuncuların xG katkısını ev/dep xG'sinden düş
const homeMissing = await getMissingStarters(homeTeamId);
const xgPenalty = homeMissing.reduce((s, p) => s + p.xg_per_90 + p.xa_per_90 * 0.5, 0);
xgH -= xgPenalty / 90 * 90;  // tam maç varsayım
```

API quota: API-Football free tier 100 req/gün. Lineup'lar maç günü 1-2 saat öncesi açıklanır — sadece bugünkü maçları çek. ~10-15 maç/gün → quota tutar.

Bu fazı **dc-v1 stabil olduktan sonra** yap.

---

## 🚦 Bu hafta sonu için somut sıra

1. **Bugün:** Faz A (kalibrasyon view) + Faz B (schema migration) — SQL'ler hazır, Supabase'de tek tıkla çalıştır
2. **Yarın:** Faz C (`dixon_coles_predict.js`) — yeni model n8n'e import, manuel test
3. **Cuma:** Faz D (time decay) — incremental ek
4. **Hafta sonu:** Faz E (A/B canary) — 7 gün gözlem
5. **Hafta sonu sonu:** Mobil stats sayfasında kalibrasyon kartı

Faz F (attribution) ve Faz G (heatmap) UX planı Faz 4 ile birlikte sıralanır.

---

**Şu an:** Faz A + B + C'yi tek seferde yazıyorum. SQL'ler ve yeni model dosyası bir sonraki commit'te.
