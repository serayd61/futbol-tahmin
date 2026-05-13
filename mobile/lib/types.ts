// Supabase şemasıyla bire bir tipler
export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';

export interface League {
  id: number;
  name: string;
  country: string | null;
  logo: string | null;
  season: number | null;
}

export interface Team {
  id: number;
  name: string;
  short_name: string | null;
  logo: string | null;
  country: string | null;
  league_id: number;
}

export interface Fixture {
  id: number;
  league_id: number;
  season: number | null;
  utc_date: string;
  status: FixtureStatus;
  home_team_id: number;
  away_team_id: number;
  home_goals: number | null;
  away_goals: number | null;
  venue: string | null;
}

// V3 — Dixon-Coles modeli yeni jsonb kolonlarını taşır.
// score_matrix: 7x7 ortak olasılık matrisi (Poisson grid + DC τ correction)
// home_advantage: lige özgü γ katsayısı (ev sahibi xG çarpanı)
// factors: feature attribution (log-odds katkıları)
export interface PredictionFactors {
  home_advantage?: number;       // log(γ_league)
  team_strength_diff?: number;   // log(home_str / away_str)
  form_diff?: number;            // formH_mult - formA_mult
  dc_correction?: number;
  shrinkage_pull?: number;
  min_matches?: number;
  xg_home_raw?: number;
  xg_away_raw?: number;
}

export interface Prediction {
  fixture_id: number;
  prob_home_win: number;
  prob_draw: number;
  prob_away_win: number;
  predicted_score: string;
  expected_goals_home: number;
  expected_goals_away: number;
  prob_over_25: number;
  prob_under_25: number;
  confidence: 'low' | 'medium' | 'high';
  model_version: string;
  ai_comment?: string | null;
  ai_generated_at?: string | null;
  // V3 — Dixon-Coles ekstra alanları
  score_matrix?: number[][] | null;
  home_advantage?: number | null;
  rho?: number | null;
  factors?: PredictionFactors | null;
  // V3.1 — BTTS (KGV/KGY) pazarı (dc-v1 sonrası)
  prob_btts_yes?: number | null;
  prob_btts_no?: number | null;
}

export interface FixtureWithDetails extends Fixture {
  home_team: Team | null;
  away_team: Team | null;
  league: League | null;
  prediction: Prediction | null;
}

export interface AccuracyStats {
  total: number;
  hit_1x2: number;
  pct_1x2: number;          // 0..100
  hit_score: number;
  pct_score: number;
  hit_over_under: number;
  pct_over_under: number;
}

export interface RecentMatch {
  fixture_id: number;
  utc_date: string;
  is_home: boolean;
  team_goals: number;
  opp_goals: number;
  opp_id: number;
  opp_name?: string;
  result: 'W' | 'L' | 'D';
}

export interface H2HMatch {
  fixture_id: number;
  utc_date: string;
  home_team_id: number;
  away_team_id: number;
  home_goals: number;
  away_goals: number;
  home_name?: string;
  away_name?: string;
}

// =====================================================================
// V3 — Tahmin Sepeti (Pick Basket) tipleri
// =====================================================================

/** Tahmin sepetinde seçilebilecek pazarlar */
export type Market =
  | '1X2_HOME' | '1X2_DRAW' | '1X2_AWAY'
  | 'OVER_25' | 'UNDER_25'
  | 'BTTS_YES' | 'BTTS_NO';

/** Bir maç için yapılmış tek pick — sepete eklenir */
export interface BasketPick {
  fixture_id: number;
  market: Market;
  prob: number;                    // kayıt anındaki model olasılığı
  // UI için (Supabase'e gitmez, local state)
  home_team_name?: string;
  away_team_name?: string;
  league_name?: string;
  utc_date?: string;
}

/** Backend'deki user_baskets satırı */
export interface Basket {
  id: string;                       // uuid
  user_id: string;
  name: string;
  combined_prob: number | null;
  total_picks: number;
  status: 'pending' | 'partial' | 'complete';
  hits: number;
  misses: number;
  points: number;
  created_at: string;
  resolved_at: string | null;
}

/** Backend'deki user_basket_picks satırı (skorlanmış) */
export interface BasketPickRow {
  basket_id: string;
  fixture_id: number;
  market: Market;
  prob: number;
  result: 'hit' | 'miss' | null;
  created_at: string;
}

/** Ligler sekmesindeki lig kartı (leagues_overview view'ı) */
export interface LeagueOverview {
  league_id: number;
  name: string;
  country: string | null;
  logo: string | null;
  today_matches: number;
  week_matches: number;
  total_evaluated: number | null;
  accuracy_1x2: number | null;     // 0..1
  brier_1x2: number | null;
}

export interface OutcomeRow {
  fixture_id: number;
  predicted_score: string;
  prob_home_win: number;
  prob_draw: number;
  prob_away_win: number;
  prob_over_25: number;
  confidence: 'low' | 'medium' | 'high';
  home_goals: number;
  away_goals: number;
  utc_date: string;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  hit_1x2: number;          // 0 or 1
  hit_score: number;
  hit_over_under: number;
  // Enriched (client-side join)
  home_team_name?: string;
  away_team_name?: string;
  league_name?: string;
}
