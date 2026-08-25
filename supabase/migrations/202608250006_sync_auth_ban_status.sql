create function public.sync_profile_auth_ban()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.banned_until is not null and new.banned_until > now() then
    update public.profiles
    set status = 'disabled', disabled_at = coalesce(disabled_at, now())
    where id = new.id;
  else
    update public.profiles
    set status = 'active', disabled_at = null
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger auth_users_sync_profile_ban
after update of banned_until on auth.users
for each row
when (old.banned_until is distinct from new.banned_until)
execute function public.sync_profile_auth_ban();

update public.profiles profiles
set
  status = case
    when users.banned_until is not null and users.banned_until > now() then 'disabled'
    else 'active'
  end,
  disabled_at = case
    when users.banned_until is not null and users.banned_until > now()
      then coalesce(profiles.disabled_at, now())
    else null
  end
from auth.users users
where users.id = profiles.id;

revoke all on function public.sync_profile_auth_ban() from public, anon, authenticated;
