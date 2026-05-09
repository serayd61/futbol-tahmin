-- ============================================================
-- FUTBOL TAHMİN — Supabase Şema v1
-- Çalıştırma: Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- ============================================================

-- 1) LİGLER
create table if not exists leagues (
  id          bigint primary key,
  name        text not null,
  country     text,
  logo        text,
  season      int,
  source      text,                       -- 'football-data' | 'api-football'
  updated_at  timestamptz default now()
);

-- 2) TAKIMLAR
create table if not exists teams (
  id          bigint primary key,
  name        text not null,
  short_name  text,
  logo        text,
  country     text,
  league_id   bigint references leagues(id),
  updated_at  timestamptz default now()
);

-- 3) FİKSTÜR / MAÇLAR
create table if not exists fixtures (
  id            bigint primary key,
  league_id     bigint references leagues(id),
  season        int,
  utc_date      timestamptz not null,
  status        text,                     -- SCHEDULED | LIVE | FINISHED | POSTPONED
  home_team_id  bigint references teams(id),
  away_team_id  bigint references teams(id),
  home_goals    int,
  away_goals    int,
  venue         text,
  source        text,
  updated_at    timestamptz default now()
);
create index if not exists idx_fixtures_date          on fixtures (utc_date);
create index if not exists idx_fixtures_status        on fixtures (status);
create index if not exists idx_fixtures_league_season on fixtures (league_id, season);

-- 4) TAKIM İSTATİSTİKLERİ (her gece n8n yeniden hesaplar)
create table if not exists team_stats (
  team_id            bigint primary key references teams(id),
  league_id          bigint references leagues(id),
  matches_played     int default 0,
  goals_scored_avg   numeric(4,2) default 0,
  goals_conceded_avg numeric(4,2) default 0,
  home_scored_avg    numeric(4,2) default 0,
  home_conceded_avg  numeric(4,2) default 0,
  away_scored_avg    numeric(4,2) default 0,
  away_conceded_avg  numeric(4,2) default 0,
  form               text,                -- "WWLDW" son 5
  updated_at         timestamptz default now()
);

-- 5) TAHMİNLER
create table if not exists predictions (
  fixture_id          bigint primary key references fixtures(id) on delete cascade,
  prob_home_win       numeric(4,3),
  prob_draw           numeric(4,3),
  prob_away_win       numeric(4,3),
  predicted_score     text,
  expected_goals_home numeric(4,2),
  expected_goals_away numeric(4,2),
  prob_over_25        numeric(4,3),
  prob_under_25       numeric(4,3),
  confidence          text,                -- low | medium | high
  model_version       text default 'poisson-v1',
  computed_at         timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — anon key ile sadece OKUMA
-- ============================================================
alter table leagues     enable row level security;
alter table teams       enable row level security;
alter table fixtures    enable row level security;
alter table team_stats  enable row level security;
alter table predictions enable row level security;

drop policy if exists "public read leagues"     on leagues;
drop policy if exists "public read teams"       on teams;
drop policy if exists "public read fixtures"    on fixtures;
drop policy if exists "public read team_stats"  on team_stats;
drop policy if exists "public read predictions" on predictions;

create policy "public read leagues"     on leagues     for select using (true);
create policy "public read teams"       on teams       for select using (true);
create policy "public read fixtures"    on fixtures    for select using (true);
create policy "public read team_stats"  on team_stats  for select using (true);
create policy "public read predictions" on predictions for select using (true);

-- ============================================================
-- DOĞRULAMA SORGUSU — şu çıktıyı bana yapıştır
-- ============================================================
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
