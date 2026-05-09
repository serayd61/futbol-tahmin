// Son 30 günün bitmiş maçlarından her takımın istatistiğini çıkar
// n8n HTTP Request node, Supabase'in array yanıtını otomatik olarak
// her satırı ayrı item yapacak şekilde açabilir. İki durumu da handle et:
//   - 1 item gelir, json bir array (eski davranış)
//   - N item gelir, her item.json tek bir fixture (n8n yeni davranış)
const items = $input.all();
let arr = [];
if (items.length === 1 && Array.isArray(items[0].json)) {
  arr = items[0].json;
} else {
  arr = items.map(i => i.json);
}
const stats = new Map();

const get = (id, lid) => {
  if (!stats.has(id)) stats.set(id, {
    team_id: id, league_id: lid,
    matches_played: 0,
    home_matches: 0, away_matches: 0,
    home_scored: 0, home_conceded: 0,
    away_scored: 0, away_conceded: 0,
    total_scored: 0, total_conceded: 0,
    last_results: []
  });
  return stats.get(id);
};

// Tarihe göre eski → yeni sıralanmış olmasını bekliyoruz (REST order=utc_date.asc)
for (const m of arr) {
  if (m.status !== 'FINISHED') continue;
  if (m.home_goals == null || m.away_goals == null) continue;

  const h = get(m.home_team_id, m.league_id);
  const a = get(m.away_team_id, m.league_id);

  h.matches_played++; a.matches_played++;
  h.home_matches++; a.away_matches++;
  h.home_scored += m.home_goals;  h.home_conceded += m.away_goals;
  a.away_scored += m.away_goals;  a.away_conceded += m.home_goals;
  h.total_scored += m.home_goals; h.total_conceded += m.away_goals;
  a.total_scored += m.away_goals; a.total_conceded += m.home_goals;

  let hr, ar;
  if (m.home_goals > m.away_goals)      { hr = 'W'; ar = 'L'; }
  else if (m.home_goals < m.away_goals) { hr = 'L'; ar = 'W'; }
  else                                  { hr = 'D'; ar = 'D'; }
  h.last_results.push(hr);
  a.last_results.push(ar);
}

const out = [];
const now = new Date().toISOString();
for (const s of stats.values()) {
  if (s.matches_played === 0) continue;
  const last5 = s.last_results.slice(-5).join('');
  out.push({
    team_id: s.team_id,
    league_id: s.league_id,
    matches_played: s.matches_played,
    goals_scored_avg:   +(s.total_scored / s.matches_played).toFixed(2),
    goals_conceded_avg: +(s.total_conceded / s.matches_played).toFixed(2),
    home_scored_avg:    s.home_matches ? +(s.home_scored / s.home_matches).toFixed(2)   : 0,
    home_conceded_avg:  s.home_matches ? +(s.home_conceded / s.home_matches).toFixed(2) : 0,
    away_scored_avg:    s.away_matches ? +(s.away_scored / s.away_matches).toFixed(2)   : 0,
    away_conceded_avg:  s.away_matches ? +(s.away_conceded / s.away_matches).toFixed(2) : 0,
    form: last5,
    updated_at: now
  });
}

return [{ json: { team_stats: out, count: out.length } }];
