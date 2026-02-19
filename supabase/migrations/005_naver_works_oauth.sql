-- Naver Works OAuth token storage
create table if not exists external_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_external_auth_tokens_user_provider
  on external_auth_tokens (user_id, provider);

alter table external_auth_tokens enable row level security;

drop policy if exists "Users can read own external tokens" on external_auth_tokens;
create policy "Users can read own external tokens"
  on external_auth_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own external tokens" on external_auth_tokens;
create policy "Users can insert own external tokens"
  on external_auth_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own external tokens" on external_auth_tokens;
create policy "Users can update own external tokens"
  on external_auth_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
