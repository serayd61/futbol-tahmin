// Football-Data.org /v4/matches yanıtını leagues/teams/fixtures'a böl
// Birden çok input item gelebilir (chunked date ranges) — hepsini birleştir
const matches = [];
for (const item of $input.all()) {
  const ms = (item.json && item.json.matches) || [];
  for (const m of ms) matches.push(m);
}
const leaguesMap = new Map();
const teamsMap = new Map();
const fixturesMap = new Map();   // id ile dedupe (chunk'lar çakışırsa)

const statusMap = {
  SCHEDULED: 'SCHEDULED', TIMED: 'SCHEDULED',
  LIVE: 'LIVE', IN_PLAY: 'LIVE', PAUSED: 'LIVE',
  FINISHED: 'FINISHED', AWARDED: 'FINISHED',
  POSTPONED: 'POSTPONED', SUSPENDED: 'POSTPONED', CANCELLED: 'POSTPONED'
};

const now = new Date().toISOString();

for (const m of matches) {
  const c = m.competition || {};
  const home = m.homeTeam || {};
  const away = m.awayTeam || {};
  if (!c.id || !home.id || !away.id) continue;

  const seasonYear = (m.season && m.season.startDate) ? parseInt(m.season.startDate.slice(0,4)) : null;

  if (!leaguesMap.has(c.id)) {
    leaguesMap.set(c.id, {
      id: c.id,
      name: c.name,
      country: (c.area && c.area.name) || null,
      logo: c.emblem || null,
      season: seasonYear,
      source: 'football-data',
      updated_at: now
    });
  }

  for (const t of [home, away]) {
    if (!teamsMap.has(t.id)) {
      teamsMap.set(t.id, {
        id: t.id,
        name: t.name,
        short_name: t.shortName || t.tla || null,
        logo: t.crest || null,
        country: (c.area && c.area.name) || null,
        league_id: c.id,
        updated_at: now
      });
    }
  }

  const ft = (m.score && m.score.fullTime) || {};
  fixturesMap.set(m.id, {
    id: m.id,
    league_id: c.id,
    season: seasonYear,
    utc_date: m.utcDate,
    status: statusMap[m.status] || 'SCHEDULED',
    home_team_id: home.id,
    away_team_id: away.id,
    home_goals: (ft.home === undefined ? null : ft.home),
    away_goals: (ft.away === undefined ? null : ft.away),
    venue: m.venue || null,
    source: 'football-data',
    updated_at: now
  });
}

const fixtures = Array.from(fixturesMap.values());
return [{ json: {
  leagues: Array.from(leaguesMap.values()),
  teams: Array.from(teamsMap.values()),
  fixtures: fixtures,
  count: fixtures.length
}}];
