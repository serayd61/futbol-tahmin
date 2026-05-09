import { supabase } from './supabase';
import type { FixtureWithDetails, Team, League, Prediction, Fixture } from './types';

const FIXTURE_FIELDS =
  'id, league_id, season, utc_date, status, home_team_id, away_team_id, home_goals, away_goals, venue';

// Fixture array'ini takım/lig/tahmin verileriyle birleştir
async function attachDetails(fixtures: Fixture[]): Promise<FixtureWithDetails[]> {
  if (fixtures.length === 0) return [];

  const teamIds   = Array.from(new Set(fixtures.flatMap(f => [f.home_team_id, f.away_team_id])));
  const leagueIds = Array.from(new Set(fixtures.map(f => f.league_id)));
  const fixtureIds = fixtures.map(f => f.id);

  const [teamsRes, leaguesRes, predsRes] = await Promise.all([
    supabase.from('teams').select('*').in('id', teamIds),
    supabase.from('leagues').select('*').in('id', leagueIds),
    supabase.from('predictions').select('*').in('fixture_id', fixtureIds),
  ]);

  const teamsMap   = new Map<number, Team>((teamsRes.data || []).map((t: Team) => [t.id, t]));
  const leaguesMap = new Map<number, League>((leaguesRes.data || []).map((l: League) => [l.id, l]));
  const predsMap   = new Map<number, Prediction>((predsRes.data || []).map((p: Prediction) => [p.fixture_id, p]));

  return fixtures.map(f => ({
    ...f,
    home_team:  teamsMap.get(f.home_team_id) || null,
    away_team:  teamsMap.get(f.away_team_id) || null,
    league:     leaguesMap.get(f.league_id) || null,
    prediction: predsMap.get(f.id) || null,
  }));
}

// Default davranış: sadece tahmini olan maçları döndür.
// Tüm maçlar için: { onlyPredicted: false } gönder.
export async function getTodayFixtures(opts: { onlyPredicted?: boolean } = {}): Promise<FixtureWithDetails[]> {
  const onlyPredicted = opts.onlyPredicted ?? true;

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .gte('utc_date', start.toISOString())
    .lt('utc_date', end.toISOString())
    .order('utc_date', { ascending: true });

  if (error) throw error;
  const all = await attachDetails((data || []) as Fixture[]);
  return onlyPredicted ? all.filter(f => f.prediction != null) : all;
}

export async function getUpcomingFixtures(daysAhead = 7, opts: { onlyPredicted?: boolean } = {}): Promise<FixtureWithDetails[]> {
  const onlyPredicted = opts.onlyPredicted ?? true;

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86400000);

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .gte('utc_date', now.toISOString())
    .lt('utc_date', end.toISOString())
    .eq('status', 'SCHEDULED')
    .order('utc_date', { ascending: true })
    .limit(500);

  if (error) throw error;
  const all = await attachDetails((data || []) as Fixture[]);
  return onlyPredicted ? all.filter(f => f.prediction != null) : all;
}

export async function getFixtureById(id: number): Promise<FixtureWithDetails | null> {
  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [withDetails] = await attachDetails([data as Fixture]);
  return withDetails;
}

export async function getTopPredictions(limit = 20): Promise<FixtureWithDetails[]> {
  // En yüksek confidence'lı yaklaşan maçlar
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .gte('utc_date', now.toISOString())
    .lt('utc_date', end.toISOString())
    .eq('status', 'SCHEDULED')
    .order('utc_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return attachDetails((data || []) as Fixture[]);
}
