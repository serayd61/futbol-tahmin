import { supabase } from './supabase';
import type {
  FixtureWithDetails, Team, League, Prediction, Fixture,
  AccuracyStats, OutcomeRow, RecentMatch, H2HMatch,
  LeagueOverview, BasketPick, Basket, Market,
} from './types';

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

  // V3 — Aynı fixture için birden çok model_version olabilir (poisson-v2 + dc-v1).
  // Tercih sırası: dc-v1 > poisson-v2 > poisson-v1 (yeni modeli öne çıkar).
  // dc-v1 score_matrix + home_advantage + factors taşır, UI bunları render edebilir.
  const MODEL_PRIORITY: Record<string, number> = {
    'dc-v1':      3,
    'poisson-v2': 2,
    'poisson-v1': 1,
  };
  const predsMap = new Map<number, Prediction>();
  for (const p of (predsRes.data || []) as Prediction[]) {
    const existing = predsMap.get(p.fixture_id);
    const newPriority = MODEL_PRIORITY[p.model_version] ?? 0;
    const oldPriority = existing ? (MODEL_PRIORITY[existing.model_version] ?? 0) : -1;
    if (!existing || newPriority > oldPriority) predsMap.set(p.fixture_id, p);
  }

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

// =====================================================
// V2 — Accuracy stats (son 30 gün özeti)
// =====================================================
export async function getAccuracyStats(daysBack = 30): Promise<AccuracyStats> {
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();

  const { data, error } = await supabase
    .from('prediction_outcomes')
    .select('hit_1x2, hit_score, hit_over_under')
    .gte('utc_date', cutoff);

  if (error) throw error;
  const rows = (data || []) as Array<{ hit_1x2: number; hit_score: number; hit_over_under: number }>;

  const total = rows.length;
  const sum1 = rows.reduce((s, r) => s + (r.hit_1x2 || 0), 0);
  const sumS = rows.reduce((s, r) => s + (r.hit_score || 0), 0);
  const sumO = rows.reduce((s, r) => s + (r.hit_over_under || 0), 0);

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
  return {
    total,
    hit_1x2: sum1,
    pct_1x2: pct(sum1),
    hit_score: sumS,
    pct_score: pct(sumS),
    hit_over_under: sumO,
    pct_over_under: pct(sumO),
  };
}

// V2 — Son N bitmiş maçın tahmin sonuçları (zenginleştirilmiş)
export async function getRecentOutcomes(limit = 20): Promise<OutcomeRow[]> {
  const { data, error } = await supabase
    .from('prediction_outcomes')
    .select('*')
    .order('utc_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data || []) as OutcomeRow[];
  if (rows.length === 0) return [];

  // Takım + lig isimlerini ekle
  const teamIds = Array.from(new Set(rows.flatMap(r => [r.home_team_id, r.away_team_id])));
  const leagueIds = Array.from(new Set(rows.map(r => r.league_id)));
  const [teamsRes, leaguesRes] = await Promise.all([
    supabase.from('teams').select('id, name').in('id', teamIds),
    supabase.from('leagues').select('id, name').in('id', leagueIds),
  ]);
  const tMap = new Map<number, string>((teamsRes.data || []).map((t: { id: number; name: string }) => [t.id, t.name]));
  const lMap = new Map<number, string>((leaguesRes.data || []).map((l: { id: number; name: string }) => [l.id, l.name]));

  return rows.map(r => ({
    ...r,
    home_team_name: tMap.get(r.home_team_id),
    away_team_name: tMap.get(r.away_team_id),
    league_name:    lMap.get(r.league_id),
  }));
}

// =====================================================
// V2 Faz 2 — Takım son 5 maç formu
// =====================================================
export async function getTeamRecentForm(teamId: number, limit = 5): Promise<RecentMatch[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, utc_date, home_team_id, away_team_id, home_goals, away_goals, status')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FINISHED')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)
    .order('utc_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data || []) as Array<{
    id: number; utc_date: string;
    home_team_id: number; away_team_id: number;
    home_goals: number; away_goals: number;
  }>;
  if (rows.length === 0) return [];

  const oppIds = rows.map(r => r.home_team_id === teamId ? r.away_team_id : r.home_team_id);
  const { data: teams } = await supabase.from('teams').select('id, name').in('id', oppIds);
  const tMap = new Map<number, string>((teams || []).map((t: { id: number; name: string }) => [t.id, t.name]));

  return rows.map(r => {
    const isHome = r.home_team_id === teamId;
    const teamGoals = isHome ? r.home_goals : r.away_goals;
    const oppGoals  = isHome ? r.away_goals : r.home_goals;
    const oppId     = isHome ? r.away_team_id : r.home_team_id;
    const result: 'W' | 'L' | 'D' =
      teamGoals > oppGoals ? 'W' :
      teamGoals < oppGoals ? 'L' : 'D';
    return {
      fixture_id: r.id,
      utc_date: r.utc_date,
      is_home: isHome,
      team_goals: teamGoals,
      opp_goals: oppGoals,
      opp_id: oppId,
      opp_name: tMap.get(oppId),
      result,
    };
  });
}

// =====================================================
// V2 Faz 2 — Head-to-Head: iki takım arası geçmiş
// =====================================================
export async function getH2H(teamAId: number, teamBId: number, limit = 10): Promise<H2HMatch[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, utc_date, home_team_id, away_team_id, home_goals, away_goals, status')
    .or(
      `and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),` +
      `and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`
    )
    .eq('status', 'FINISHED')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)
    .order('utc_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data || []) as Array<{
    id: number; utc_date: string;
    home_team_id: number; away_team_id: number;
    home_goals: number; away_goals: number;
  }>;
  if (rows.length === 0) return [];

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', [teamAId, teamBId]);
  const tMap = new Map<number, string>((teams || []).map((t: { id: number; name: string }) => [t.id, t.name]));

  return rows.map(r => ({
    fixture_id: r.id,
    utc_date: r.utc_date,
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    home_goals: r.home_goals,
    away_goals: r.away_goals,
    home_name: tMap.get(r.home_team_id),
    away_name: tMap.get(r.away_team_id),
  }));
}

// =====================================================
// V2 Faz 2 — Takım arama (favori takım eklerken kullanılır)
// =====================================================
export async function searchTeams(query: string, limit = 30): Promise<Team[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .ilike('name', `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []) as Team[];
}

// V2 Faz 2 — Belirli takımların yaklaşan maçları (favoriler filter için)
export async function getFixturesForTeams(teamIds: number[], daysAhead = 7): Promise<FixtureWithDetails[]> {
  if (teamIds.length === 0) return [];
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86400000);

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .gte('utc_date', now.toISOString())
    .lt('utc_date', end.toISOString())
    .eq('status', 'SCHEDULED')
    .order('utc_date', { ascending: true });

  if (error) throw error;
  return attachDetails((data || []) as Fixture[]);
}

// =====================================================================
// V3 — Model Brier / kalibrasyon karşılaştırma
// =====================================================================

export interface ModelBrierRow {
  model_version: string;
  total: number;
  accuracy_1x2: number;       // 0..1
  accuracy_score: number;
  accuracy_over25: number;
  brier_1x2: number;          // düşük iyi (0..1)
  brier_over25: number;
}

/** model_brier view'ından her model_version için baseline + Brier */
export async function getModelBrier(): Promise<ModelBrierRow[]> {
  const { data, error } = await supabase
    .from('model_brier')
    .select('*')
    .order('total', { ascending: false });
  if (error) throw error;
  return (data || []) as ModelBrierRow[];
}

// =====================================================================
// V3 — Tahmin Sepeti query'leri
// =====================================================================

/** Ligler sekmesi için lig kartları. Bu hafta ≥1 maçı olan veya geçmişte
 *  değerlendirilmiş tüm ligler döner. */
export async function getLeaguesOverview(): Promise<LeagueOverview[]> {
  const { data, error } = await supabase
    .from('leagues_overview')
    .select('*')
    .order('week_matches', { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as LeagueOverview[];
}

/** Belirli bir lig için önümüzdeki 7 gündeki maçlar + tahminler. */
export async function getFixturesByLeague(
  leagueId: number,
  daysAhead = 7,
): Promise<FixtureWithDetails[]> {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86400000);

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS)
    .eq('league_id', leagueId)
    .eq('status', 'SCHEDULED')
    .gte('utc_date', now.toISOString())
    .lt('utc_date', end.toISOString())
    .order('utc_date', { ascending: true })
    .limit(200);
  if (error) throw error;
  const all = await attachDetails((data || []) as Fixture[]);
  return all.filter(f => f.prediction != null);
}

/** Sepeti Supabase'e kaydet. Auth gerekir.
 *  Backend trigger maçlar bitince otomatik skorlayacak. */
export async function saveBasket(
  picks: BasketPick[],
  name?: string,
): Promise<Basket> {
  if (picks.length === 0) throw new Error('Sepet boş, en az 1 pick gerekli');

  // Birleşik olasılık = pick olasılıklarının çarpımı (independence varsayımı)
  const combinedProb = picks.reduce((acc, p) => acc * (p.prob || 0), 1);

  // 1) Sepeti oluştur
  const { data: basket, error: bErr } = await supabase
    .from('user_baskets')
    .insert({
      name: name || `Sepet ${new Date().toLocaleDateString('tr-TR')}`,
      combined_prob: +combinedProb.toFixed(5),
      total_picks: picks.length,
    })
    .select()
    .single();
  if (bErr) throw bErr;

  // 2) Pick'leri ekle
  const { error: pErr } = await supabase
    .from('user_basket_picks')
    .insert(picks.map(p => ({
      basket_id: basket.id,
      fixture_id: p.fixture_id,
      market: p.market,
      prob: p.prob,
    })));
  if (pErr) throw pErr;

  return basket as Basket;
}

/** Kullanıcının kayıtlı sepetleri (newest first). */
export async function getMyBaskets(limit = 30): Promise<Basket[]> {
  const { data, error } = await supabase
    .from('user_baskets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Basket[];
}

/** Belirli sepetin pick'leri + her pick'in fixture/teams detay (UI için). */
export async function getBasketDetail(basketId: string) {
  const { data: picks, error } = await supabase
    .from('user_basket_picks')
    .select('*')
    .eq('basket_id', basketId);
  if (error) throw error;
  if (!picks || picks.length === 0) return [];

  // Pick'lerin fixture detaylarını çek
  const fixtureIds = picks.map(p => p.fixture_id);
  const { data: fixturesRaw } = await supabase
    .from('fixtures')
    .select(FIXTURE_FIELDS + ', home_goals, away_goals')
    .in('id', fixtureIds);

  const fixtures = (fixturesRaw || []) as unknown as Fixture[];
  const teamIds = Array.from(new Set(fixtures.flatMap(f => [f.home_team_id, f.away_team_id])));
  const { data: teamsRaw } = await supabase
    .from('teams').select('id, name, short_name').in('id', teamIds);

  type TeamLite = { id: number; name: string; short_name: string | null };
  const teams = (teamsRaw || []) as unknown as TeamLite[];
  const tMap = new Map<number, TeamLite>(teams.map(t => [t.id, t]));
  const fMap = new Map<number, Fixture>(fixtures.map(f => [f.id, f]));

  return picks.map(p => {
    const f = fMap.get(p.fixture_id);
    return {
      ...p,
      fixture: f || null,
      home_team: f ? tMap.get(f.home_team_id) || null : null,
      away_team: f ? tMap.get(f.away_team_id) || null : null,
    };
  });
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
