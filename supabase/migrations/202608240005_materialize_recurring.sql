create function public.materialize_recurring_transactions(p_month date)
returns setof public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  return query
  insert into public.transactions (
    user_id, type, name, category, amount, transaction_date, note, source_recurring_id
  )
  select
    v_user_id,
    recurring.type,
    recurring.name,
    recurring.category,
    recurring.amount,
    (
      v_month
      + (
        least(
          recurring.day_of_month,
          extract(day from (v_month + interval '1 month - 1 day'))::integer
        ) - 1
      ) * interval '1 day'
    )::date,
    recurring.note,
    recurring.id
  from public.recurring_transactions as recurring
  where recurring.user_id = v_user_id
    and recurring.is_active
    and recurring.start_month <= v_month
    and (recurring.end_month is null or recurring.end_month >= v_month)
  on conflict (user_id, source_recurring_id, transaction_date)
    where source_recurring_id is not null
  do nothing
  returning *;
end;
$$;

revoke all on function public.materialize_recurring_transactions(date) from public, anon;
grant execute on function public.materialize_recurring_transactions(date) to authenticated;
