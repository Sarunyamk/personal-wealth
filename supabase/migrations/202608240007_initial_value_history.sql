insert into public.asset_value_history (user_id, asset_id, value, recorded_at)
select a.user_id, a.id, a.current_value, a.created_at
from public.assets a
where not exists (select 1 from public.asset_value_history h where h.asset_id = a.id);

insert into public.liability_value_history (user_id, liability_id, balance, recorded_at)
select l.user_id, l.id, l.current_balance, l.created_at
from public.liabilities l
where not exists (select 1 from public.liability_value_history h where h.liability_id = l.id);

create function public.record_initial_asset_value()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.asset_value_history (user_id, asset_id, value, recorded_at)
  values (new.user_id, new.id, new.current_value, new.created_at);
  return new;
end;
$$;

create function public.record_initial_liability_balance()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.liability_value_history (user_id, liability_id, balance, recorded_at)
  values (new.user_id, new.id, new.current_balance, new.created_at);
  return new;
end;
$$;

create trigger assets_record_initial_value after insert on public.assets
for each row execute function public.record_initial_asset_value();

create trigger liabilities_record_initial_balance after insert on public.liabilities
for each row execute function public.record_initial_liability_balance();

revoke all on function public.record_initial_asset_value() from public, anon, authenticated;
revoke all on function public.record_initial_liability_balance() from public, anon, authenticated;
