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
}

export interface FixtureWithDetails extends Fixture {
  home_team: Team | null;
  away_team: Team | null;
  league: League | null;
  prediction: Prediction | null;
}
