begin;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  status text,
  created_at timestamptz,
  disabled_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles actor
    where actor.id = (select auth.uid())
      and actor.role = 'admin'
      and actor.status = 'active'
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    users.id,
    users.email::text,
    profiles.display_name,
    profiles.role,
    profiles.status,
    profiles.created_at,
    profiles.disabled_at,
    users.email_confirmed_at,
    users.last_sign_in_at
  from auth.users users
  join public.profiles profiles on profiles.id = users.id
  order by profiles.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

commit;
