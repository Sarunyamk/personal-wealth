create function public.record_asset_value(
  p_asset_id uuid,
  p_value numeric,
  p_recorded_at timestamptz default now()
)
returns public.assets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.assets;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_value < 0 then
    raise exception 'Asset value must be non-negative' using errcode = '22023';
  end if;

  update public.assets
  set current_value = p_value
  where id = p_asset_id and user_id = v_user_id and is_active
  returning * into v_asset;
  if not found then
    raise exception 'Active asset was not found' using errcode = 'P0002';
  end if;

  insert into public.asset_value_history (user_id, asset_id, value, recorded_at)
  values (v_user_id, p_asset_id, p_value, p_recorded_at);
  insert into public.activities (user_id, entity_type, entity_id, action, value)
  values (v_user_id, 'asset', p_asset_id, 'asset_value_updated', p_value);
  return v_asset;
end;
$$;

create function public.record_liability_balance(
  p_liability_id uuid,
  p_balance numeric,
  p_recorded_at timestamptz default now()
)
returns public.liabilities
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_liability public.liabilities;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_balance < 0 then
    raise exception 'Liability balance must be non-negative' using errcode = '22023';
  end if;

  update public.liabilities
  set current_balance = p_balance
  where id = p_liability_id and user_id = v_user_id and is_active
  returning * into v_liability;
  if not found then
    raise exception 'Active liability was not found' using errcode = 'P0002';
  end if;

  insert into public.liability_value_history (user_id, liability_id, balance, recorded_at)
  values (v_user_id, p_liability_id, p_balance, p_recorded_at);
  insert into public.activities (user_id, entity_type, entity_id, action, value)
  values (v_user_id, 'liability', p_liability_id, 'liability_balance_updated', p_balance);
  return v_liability;
end;
$$;

create function public.contribute_to_goal(
  p_goal_id uuid,
  p_amount numeric,
  p_contribution_date date,
  p_note text default null
)
returns public.goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.goals;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'Contribution must be greater than zero' using errcode = '22023';
  end if;

  update public.goals
  set current_amount = current_amount + p_amount
  where id = p_goal_id
    and user_id = v_user_id
    and not is_completed
    and current_amount + p_amount <= target_amount
  returning * into v_goal;
  if not found then
    raise exception 'Goal was not found or contribution exceeds remaining amount' using errcode = '22023';
  end if;

  insert into public.goal_contributions (user_id, goal_id, amount, contribution_date, note)
  values (v_user_id, p_goal_id, p_amount, p_contribution_date, nullif(btrim(p_note), ''));
  insert into public.activities (user_id, entity_type, entity_id, action, value)
  values (v_user_id, 'goal', p_goal_id, 'goal_contribution', p_amount);
  return v_goal;
end;
$$;

create function public.upsert_wealth_snapshot(
  p_snapshot_date date,
  p_total_assets numeric,
  p_total_liabilities numeric,
  p_liquid_assets numeric,
  p_investment_assets numeric
)
returns public.snapshots
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot public.snapshots;
  v_month date := date_trunc('month', p_snapshot_date)::date;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if least(p_total_assets, p_total_liabilities, p_liquid_assets, p_investment_assets) < 0 then
    raise exception 'Snapshot totals must be non-negative' using errcode = '22023';
  end if;

  insert into public.snapshots (
    user_id, snapshot_date, total_assets, total_liabilities, net_worth,
    liquid_assets, investment_assets
  ) values (
    v_user_id, v_month, p_total_assets, p_total_liabilities,
    p_total_assets - p_total_liabilities, p_liquid_assets, p_investment_assets
  )
  on conflict (user_id, snapshot_date) do update set
    total_assets = excluded.total_assets,
    total_liabilities = excluded.total_liabilities,
    net_worth = excluded.net_worth,
    liquid_assets = excluded.liquid_assets,
    investment_assets = excluded.investment_assets
  returning * into v_snapshot;

  insert into public.activities (user_id, entity_type, entity_id, action, value)
  values (v_user_id, 'snapshot', v_snapshot.id, 'snapshot_upserted', v_snapshot.net_worth);
  return v_snapshot;
end;
$$;

revoke all on function public.record_asset_value(uuid, numeric, timestamptz) from public, anon;
revoke all on function public.record_liability_balance(uuid, numeric, timestamptz) from public, anon;
revoke all on function public.contribute_to_goal(uuid, numeric, date, text) from public, anon;
revoke all on function public.upsert_wealth_snapshot(date, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.record_asset_value(uuid, numeric, timestamptz) to authenticated;
grant execute on function public.record_liability_balance(uuid, numeric, timestamptz) to authenticated;
grant execute on function public.contribute_to_goal(uuid, numeric, date, text) to authenticated;
grant execute on function public.upsert_wealth_snapshot(date, numeric, numeric, numeric, numeric) to authenticated;
