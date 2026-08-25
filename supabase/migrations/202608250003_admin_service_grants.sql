begin;

grant select on table public.profiles to service_role;
grant update (status, disabled_at) on table public.profiles to service_role;

grant select on table
  public.categories,
  public.assets,
  public.liabilities,
  public.asset_value_history,
  public.liability_value_history,
  public.recurring_transactions,
  public.transactions,
  public.budgets,
  public.monthly_records,
  public.goals,
  public.goal_contributions,
  public.snapshots,
  public.activities
to service_role;

commit;
