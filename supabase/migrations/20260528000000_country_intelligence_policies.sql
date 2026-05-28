create index if not exists country_briefs_user_country_created_idx
  on public.country_briefs (user_id, country_code, created_at desc);

create index if not exists chat_messages_user_country_created_idx
  on public.chat_messages (user_id, country_code, created_at);

create policy "Users can insert own country briefs"
  on public.country_briefs
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.company_profiles
      where company_profiles.id = country_briefs.company_profile_id
        and company_profiles.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own messages"
  on public.chat_messages
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
