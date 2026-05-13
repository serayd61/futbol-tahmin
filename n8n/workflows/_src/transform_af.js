// API-Football (RapidAPI / api-sports.io) yanıtını leagues/teams/fixtures'a böl
// ID çakışmasını önlemek için 100_000_000 offset
// Birden çok input item gelebilir (multi-day backfill) — hepsinin response'unu birleştir
const OFFSET = 100000000;
const items = [];
for (const inp of $input.all()) {
  const r = (inp.json && inp.json.response) || [];
  for (const x of r) items.push(x);
}
const leaguesMap = new Map();
const teamsMap = new Map();
const fixturesMap = new Map();   // id ile dedupe (multi-day çağrıda aynı fixture tekrar gelebilir)

const statusMap = {
  TBD: 'SCHEDULED', NS: 'SCHEDULED',
  '1H': 'LIVE', HT: 'LIVE', '2H': 'LIVE', ET: 'LIVE', BT: 'LIVE', P: 'LIVE', LIVE: 'LIVE', INT: 'LIVE',
  FT: 'FINISHED', AET: 'FINISHED', PEN: 'FINISHED', AWD: 'FINISHED', WO: 'FINISHED',
  PST: 'POSTPONED', CANC: 'POSTPONED', ABD: 'POSTPONED', SUSP: 'POSTPONED'
};

const now = new Date().toISOString();

for (const it of items) {
  const f = it.fixture || {};
  const l = it.league || {};
  const home = (it.teams && it.teams.home) || {};
  const away = (it.teams && it.teams.away) || {};
  const goals = it.goals || {};
  if (!f.id || !l.id || !home.id || !away.id) continue;

  const lid = l.id + OFFSET;
  const hid = home.id + OFFSET;
  const aid = away.id + OFFSET;
  const fid = f.id + OFFSET;

  if (!leaguesMap.has(lid)) {
    leaguesMap.set(lid, {
      id: lid,
      name: l.name,
      country: l.country || null,
      logo: l.logo || null,
      season: l.season || null,
      source: 'api-football',
      updated_at: now
    });
  }

  for (const [t, id] of [[home, hid], [away, aid]]) {
    if (!teamsMap.has(id)) {
      teamsMap.set(id, {
        id: id,
        name: t.name,
        short_name: null,
        logo: t.logo || null,
        country: l.country || null,
        league_id: lid,
        updated_at: now
      });
    }
  }

  const sCode = (f.status && f.status.short) || 'NS';
  fixturesMap.set(fid, {
    id: fid,
    league_id: lid,
    season: l.season || null,
    utc_date: f.date,
    status: statusMap[sCode] || 'SCHEDULED',
    home_team_id: hid,
    away_team_id: aid,
    home_goals: (goals.home === undefined ? null : goals.home),
    away_goals: (goals.away === undefined ? null : goals.away),
    venue: (f.venue && f.venue.name) || null,
    source: 'api-football',
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
