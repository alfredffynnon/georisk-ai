create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry_vertical text not null,
  markets text[] not null default '{}',
  key_assets text,
  supply_chain text,
  currency_exposure text[] default '{}',
  risk_appetite text default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.country_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_profile_id uuid not null references public.company_profiles(id) on delete cascade,
  country_code text not null,
  brief_content jsonb not null,
  created_at timestamptz default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null,
  role text not null constraint chat_messages_role_check check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table public.alert_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null,
  enabled boolean default true,
  rate_move_threshold numeric default 0.5,
  political_risk_level text default 'high',
  jurisdiction_alerts boolean default true,
  email_enabled boolean default true,
  created_at timestamptz default now(),
  unique (user_id, country_code)
);

alter table public.company_profiles enable row level security;
alter table public.country_briefs enable row level security;
alter table public.chat_messages enable row level security;
alter table public.alert_settings enable row level security;

create policy "Users can manage own profile"
  on public.company_profiles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can see own briefs"
  on public.country_briefs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can see own messages"
  on public.chat_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can manage own alerts"
  on public.alert_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
