create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.asset_value_history enable row level security;
alter table public.liability_value_history enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.monthly_records enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.snapshots enable row level security;
alter table public.activities enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.categories from anon;
revoke all on table public.assets from anon;
revoke all on table public.liabilities from anon;
revoke all on table public.asset_value_history from anon;
revoke all on table public.liability_value_history from anon;
revoke all on table public.recurring_transactions from anon;
revoke all on table public.transactions from anon;
revoke all on table public.budgets from anon;
revoke all on table public.monthly_records from anon;
revoke all on table public.goals from anon;
revoke all on table public.goal_contributions from anon;
revoke all on table public.snapshots from anon;
revoke all on table public.activities from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update on table public.assets to authenticated;
grant select, insert, update on table public.liabilities to authenticated;
grant select, insert, update on table public.asset_value_history to authenticated;
grant select, insert, update on table public.liability_value_history to authenticated;
grant select, insert, update on table public.recurring_transactions to authenticated;
grant select, insert, update on table public.transactions to authenticated;
grant select, insert, update on table public.budgets to authenticated;
grant select, insert, update on table public.monthly_records to authenticated;
grant select, insert, update on table public.goals to authenticated;
grant select, insert, update on table public.goal_contributions to authenticated;
grant select, insert, update on table public.snapshots to authenticated;
grant select, insert, update on table public.activities to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy categories_select_available on public.categories
for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy categories_insert_own on public.categories
for insert to authenticated with check (user_id = (select auth.uid()));
create policy categories_update_own on public.categories
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy categories_delete_own on public.categories
for delete to authenticated using (user_id = (select auth.uid()));

create policy assets_select_own on public.assets
for select to authenticated using (user_id = (select auth.uid()));
create policy assets_insert_own on public.assets
for insert to authenticated with check (user_id = (select auth.uid()));
create policy assets_update_own on public.assets
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy liabilities_select_own on public.liabilities
for select to authenticated using (user_id = (select auth.uid()));
create policy liabilities_insert_own on public.liabilities
for insert to authenticated with check (user_id = (select auth.uid()));
create policy liabilities_update_own on public.liabilities
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy asset_history_select_own on public.asset_value_history
for select to authenticated using (user_id = (select auth.uid()));
create policy asset_history_insert_own on public.asset_value_history
for insert to authenticated with check (user_id = (select auth.uid()));
create policy asset_history_update_own on public.asset_value_history
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy liability_history_select_own on public.liability_value_history
for select to authenticated using (user_id = (select auth.uid()));
create policy liability_history_insert_own on public.liability_value_history
for insert to authenticated with check (user_id = (select auth.uid()));
create policy liability_history_update_own on public.liability_value_history
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy recurring_select_own on public.recurring_transactions
for select to authenticated using (user_id = (select auth.uid()));
create policy recurring_insert_own on public.recurring_transactions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy recurring_update_own on public.recurring_transactions
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy transactions_select_own on public.transactions
for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy transactions_update_own on public.transactions
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy budgets_select_own on public.budgets
for select to authenticated using (user_id = (select auth.uid()));
create policy budgets_insert_own on public.budgets
for insert to authenticated with check (user_id = (select auth.uid()));
create policy budgets_update_own on public.budgets
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy monthly_records_select_own on public.monthly_records
for select to authenticated using (user_id = (select auth.uid()));
create policy monthly_records_insert_own on public.monthly_records
for insert to authenticated with check (user_id = (select auth.uid()));
create policy monthly_records_update_own on public.monthly_records
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy goals_select_own on public.goals
for select to authenticated using (user_id = (select auth.uid()));
create policy goals_insert_own on public.goals
for insert to authenticated with check (user_id = (select auth.uid()));
create policy goals_update_own on public.goals
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy goal_contributions_select_own on public.goal_contributions
for select to authenticated using (user_id = (select auth.uid()));
create policy goal_contributions_insert_own on public.goal_contributions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy goal_contributions_update_own on public.goal_contributions
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy snapshots_select_own on public.snapshots
for select to authenticated using (user_id = (select auth.uid()));
create policy snapshots_insert_own on public.snapshots
for insert to authenticated with check (user_id = (select auth.uid()));
create policy snapshots_update_own on public.snapshots
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy activities_select_own on public.activities
for select to authenticated using (user_id = (select auth.uid()));
create policy activities_insert_own on public.activities
for insert to authenticated with check (user_id = (select auth.uid()));
create policy activities_update_own on public.activities
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
