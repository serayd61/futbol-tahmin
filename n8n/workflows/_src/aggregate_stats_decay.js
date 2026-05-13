// =====================================================================
// aggregate_stats — V3 sürüm (exponential time decay)
// =====================================================================
// V2 değişikliği: her maça yaşına göre ağırlık ver (exp decay).
//   half_life = 45 gün → 45 gün önceki maç bugünkünün yarısı kadar sayar.
//
// Bu dosya mevcut aggregate_stats.js'in YEDEK alternatifi.
// n8n workflow2-team-stats-rebuild'te ana Code node'u bununla değiştirip
// test et; eski (eşit ağırlık) sürümü _src/aggregate_stats.js'te kaldı.
//
// Yeni kolonlar (team_stats şemasına eklenirse kullanılır, yoksa düşürülür):
//   • weighted_matches_played  (effective sample size)
//   • days_since_last_match     (en son maçtan kaç gün geçti)
// =====================================================================

const items = $input.all();
let arr = [];
if (items.length === 1 && Array.isArray(items[0].json)) {
  arr = items[0].json;
} else {
  arr = items.map(i => i.json);
}

const HALF_LIFE_DAYS = 45;
const now = Date.now();

function weightFor(matchDateIso) {
  if (!matchDateIso) return 1;
  const ageDays = (now - new Date(matchDateIso).getTime()) / 86_400_000;
  if (ageDays < 0) return 1;  // gelecek tarih → 1 say (corrupt data güvenliği)
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

const stats = new Map();

const get = (id, lid) => {
  if (!stats.has(id)) stats.set(id, {
    team_id: id, league_id: lid,
    // Ham sayım (legacy uyumluluk için, ekrandaki "X maç oynadı" için)
    matches_played: 0,
    home_matches: 0, away_matches: 0,
    // Ağırlıklı toplamlar
    w_home_matches: 0, w_away_matches: 0, w_matches: 0,
    w_home_scored: 0, w_home_conceded: 0,
    w_away_scored: 0, w_away_conceded: 0,
    w_total_scored: 0, w_total_conceded: 0,
    last_results: [],     // form için kronolojik (W/L/D)
    last_match_date: null,
  });
  return stats.get(id);
};

// arr eski → yeni sıralı bekliyoruz (REST order=utc_date.asc).
// Eğer ters sıralanmışsa form etiketleri ters olur — bu yüzden array.sort eklenir.
arr.sort((a, b) => new Date(a.utc_date) - new Date(b.utc_date));

for (const m of arr) {
  if (m.status !== 'FINISHED') continue;
  if (m.home_goals == null || m.away_goals == null) continue;

  const w = weightFor(m.utc_date);

  const h = get(m.home_team_id, m.league_id);
  const a = get(m.away_team_id, m.league_id);

  // Ham sayım
  h.matches_played++; a.matches_played++;
  h.home_matches++; a.away_matches++;

  // Ağırlıklı toplamlar
  h.w_matches      += w;
  a.w_matches      += w;
  h.w_home_matches += w;
  a.w_away_matches += w;

  h.w_home_scored   += m.home_goals  * w;
  h.w_home_conceded += m.away_goals  * w;
  a.w_away_scored   += m.away_goals  * w;
  a.w_away_conceded += m.home_goals  * w;

  h.w_total_scored   += m.home_goals * w;
  h.w_total_conceded += m.away_goals * w;
  a.w_total_scored   += m.away_goals * w;
  a.w_total_conceded += m.home_goals * w;

  // Form etiketleri (ağırlıklandırılmaz — son 5 maç literal)
  let hr, ar;
  if (m.home_goals > m.away_goals)      { hr = 'W'; ar = 'L'; }
  else if (m.home_goals < m.away_goals) { hr = 'L'; ar = 'W'; }
  else                                  { hr = 'D'; ar = 'D'; }
  h.last_results.push(hr);
  a.last_results.push(ar);

  if (!h.last_match_date || new Date(m.utc_date) > new Date(h.last_match_date)) h.last_match_date = m.utc_date;
  if (!a.last_match_date || new Date(m.utc_date) > new Date(a.last_match_date)) a.last_match_date = m.utc_date;
}

const out = [];
const nowIso = new Date().toISOString();

for (const s of stats.values()) {
  if (s.matches_played === 0) continue;
  if (s.w_matches === 0) continue;

  const last5 = s.last_results.slice(-5).join('');
  const daysSince = s.last_match_date
    ? Math.round((now - new Date(s.last_match_date).getTime()) / 86_400_000)
    : null;

  // Ağırlıklı ortalamalar — payda effective sample size
  const safeDiv = (num, den) => (den > 0 ? +(num / den).toFixed(2) : 0);

  out.push({
    team_id:   s.team_id,
    league_id: s.league_id,
    matches_played: s.matches_played,                       // ham (eski uyum)
    goals_scored_avg:   safeDiv(s.w_total_scored,   s.w_matches),
    goals_conceded_avg: safeDiv(s.w_total_conceded, s.w_matches),
    home_scored_avg:    safeDiv(s.w_home_scored,    s.w_home_matches),
    home_conceded_avg:  safeDiv(s.w_home_conceded,  s.w_home_matches),
    away_scored_avg:    safeDiv(s.w_away_scored,    s.w_away_matches),
    away_conceded_avg:  safeDiv(s.w_away_conceded,  s.w_away_matches),
    form: last5,
    // Yeni (opsiyonel; team_stats şemasında kolon yoksa Supabase upsert sessizce
    // bu key'leri ignore eder — RESTful behaviour)
    weighted_matches_played: +s.w_matches.toFixed(2),
    days_since_last_match: daysSince,
    updated_at: nowIso,
  });
}

return [{ json: { team_stats: out, count: out.length, decay_half_life_days: HALF_LIFE_DAYS } }];
