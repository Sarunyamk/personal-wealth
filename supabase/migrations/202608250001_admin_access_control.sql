alter table public.profiles
add column role text not null default 'user' check (role in ('user', 'admin')),
add column status text not null default 'active' check (status in ('active', 'disabled')),
add column disabled_at timestamptz;

alter table public.profiles
add constraint profiles_disabled_state_check check (
  (status = 'active' and disabled_at is null)
  or (status = 'disabled' and disabled_at is not null)
);

revoke update on table public.profiles from authenticated;
grant update (display_name, base_currency, theme) on table public.profiles to authenticated;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

create policy profiles_require_active_user on public.profiles
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy categories_require_active_user on public.categories
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy assets_require_active_user on public.assets
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy liabilities_require_active_user on public.liabilities
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy asset_history_require_active_user on public.asset_value_history
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy liability_history_require_active_user on public.liability_value_history
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy recurring_require_active_user on public.recurring_transactions
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy transactions_require_active_user on public.transactions
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy budgets_require_active_user on public.budgets
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy monthly_records_require_active_user on public.monthly_records
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy goals_require_active_user on public.goals
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy goal_contributions_require_active_user on public.goal_contributions
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy snapshots_require_active_user on public.snapshots
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));

create policy activities_require_active_user on public.activities
as restrictive for all to authenticated
using ((select public.is_active_user()))
with check ((select public.is_active_user()));
