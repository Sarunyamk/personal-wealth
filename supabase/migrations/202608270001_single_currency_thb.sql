begin;

update public.profiles set base_currency = 'THB' where base_currency <> 'THB';
update public.assets set currency = 'THB' where currency <> 'THB';

alter table public.profiles alter column base_currency set default 'THB';
alter table public.profiles drop constraint if exists profiles_base_currency_check;
alter table public.profiles
add constraint profiles_base_currency_check check (base_currency = 'THB');

alter table public.assets alter column currency set default 'THB';
alter table public.assets drop constraint if exists assets_currency_check;
alter table public.assets
add constraint assets_currency_check check (currency = 'THB');

revoke update on table public.profiles from authenticated;
grant update (display_name, theme, privacy_default)
on table public.profiles to authenticated;

commit;
