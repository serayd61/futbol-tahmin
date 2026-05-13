-- ============================================================
-- push_tokens — Expo Push Token'larını ve kullanıcının favori takımlarını saklar
-- ============================================================

create table if not exists push_tokens (
  id              uuid primary key default gen_random_uuid(),
  token           text unique not null,        -- ExponentPushToken[...]
  favorite_teams  bigint[] default '{}',       -- favori team_id'leri
  enabled         boolean default true,
  platform        text default 'ios',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_push_tokens_favorites on push_tokens using gin (favorite_teams);

-- Anon insert/update için (kullanıcı kendi token'ını upsert edebilsin)
alter table push_tokens enable row level security;

drop policy if exists "anon insert/update push_tokens" on push_tokens;
create policy "anon insert/update push_tokens"
  on push_tokens for all
  using (true)
  with check (true);

-- n8n (service_role) zaten her şeye erişebilir (RLS bypass).

select count(*) as token_count from push_tokens;
