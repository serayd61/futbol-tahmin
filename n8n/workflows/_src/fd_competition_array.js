// Football-Data.org competition listesi (current season default)
// Her biri /v4/competitions/{id}/matches ile o ligin tüm current sezonunu çeker.
// FD free tier sadece current season'a izin verir; multi-season paid tier gerek.

const competitions = [
  { id: 2021, name: 'Premier League' },
  { id: 2014, name: 'La Liga' },
  { id: 2019, name: 'Serie A' },
  { id: 2002, name: 'Bundesliga' },
  { id: 2015, name: 'Ligue 1' },
  { id: 2003, name: 'Eredivisie' },
  { id: 2017, name: 'Primeira Liga' },
  { id: 2013, name: 'Brasileirão' },
  { id: 2016, name: 'Championship' },
  { id: 2152, name: 'Copa Libertadores' },
  { id: 2001, name: 'UEFA Champions League' },
];

return competitions.map(c => ({ json: { competition_id: c.id, name: c.name } }));
