// AF league season fetch — hedef ligleri sezon ile beraber liste
// Bu listeyi genişletebilirsin. league_id api-sports.io'dan: https://www.api-football.com/documentation-v3#operation/get-leagues
const targets = [
  { league: 203, season: 2025, name: 'Süper Lig (TR)' },
  { league: 204, season: 2025, name: '1. Lig (TR)' },
  // Daha fazla istersen:
  // { league: 39, season: 2025, name: 'Premier League' },
  // { league: 140, season: 2025, name: 'La Liga' },
  // { league: 78, season: 2025, name: 'Bundesliga' },
  // { league: 135, season: 2025, name: 'Serie A' },
  // { league: 61, season: 2025, name: 'Ligue 1' },
];

return targets.map(t => ({ json: t }));
