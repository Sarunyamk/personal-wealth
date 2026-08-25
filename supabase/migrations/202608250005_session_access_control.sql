create function public.account_access_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'signed_out'
    when not exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    ) then 'disabled'
    when not exists (
      select 1
      from auth.sessions
      where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
        and user_id = auth.uid()
        and created_at > now() - interval '7 days'
    ) then 'expired'
    else 'active'
  end;
$$;

revoke all on function public.account_access_status() from public, anon;
grant execute on function public.account_access_status() to authenticated;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.account_access_status() = 'active';
$$;
