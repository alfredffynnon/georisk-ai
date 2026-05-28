create table if not exists public.expert_enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  expert_name text not null,
  question text not null,
  urgency text not null default 'standard',
  created_at timestamptz default now()
);

alter table public.expert_enquiries enable row level security;

drop policy if exists "Users manage own enquiries" on public.expert_enquiries;

create policy "Users manage own enquiries"
  on public.expert_enquiries
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
