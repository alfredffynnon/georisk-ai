create extension if not exists "pgcrypto" with schema extensions;

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sector text,
  geography text,
  assets text,
  dependencies text,
  created_at timestamptz not null default now()
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  region text,
  urgency text constraint scenarios_urgency_check check (urgency in ('high', 'medium', 'low')),
  development_stage text constraint scenarios_development_stage_check check (
    development_stage in ('emerging', 'active', 'escalating', 'stabilising', 'resolved')
  ),
  affected_sectors text,
  sources text,
  status text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transmission_mechanisms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  affected_sectors text,
  impact_severity text constraint transmission_mechanisms_impact_severity_check check (
    impact_severity in ('high', 'medium', 'low')
  )
);

create table public.exposure_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  brief_content text,
  created_at timestamptz not null default now()
);

create table public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create index portfolios_user_id_idx on public.portfolios (user_id);
create index exposure_briefs_user_id_idx on public.exposure_briefs (user_id);
create index exposure_briefs_portfolio_id_idx on public.exposure_briefs (portfolio_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scenarios_set_updated_at
before update on public.scenarios
for each row
execute function public.set_updated_at();

alter table public.portfolios enable row level security;
alter table public.exposure_briefs enable row level security;

create policy "Users can read own portfolios"
  on public.portfolios
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own portfolios"
  on public.portfolios
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own portfolios"
  on public.portfolios
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own portfolios"
  on public.portfolios
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read own exposure briefs"
  on public.exposure_briefs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own exposure briefs"
  on public.exposure_briefs
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.portfolios
      where portfolios.id = exposure_briefs.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

create policy "Users can update own exposure briefs"
  on public.exposure_briefs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.portfolios
      where portfolios.id = exposure_briefs.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own exposure briefs"
  on public.exposure_briefs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
