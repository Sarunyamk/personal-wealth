alter table public.profiles
add column privacy_default boolean not null default false;

revoke update on table public.profiles from authenticated;
grant update (display_name, base_currency, theme, privacy_default)
on table public.profiles to authenticated;
