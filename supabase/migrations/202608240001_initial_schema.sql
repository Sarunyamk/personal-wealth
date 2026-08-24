create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  base_currency text not null default 'THB' check (base_currency ~ '^[A-Z]{3}$'),
  theme text not null default 'fresh' check (theme in ('fresh', 'high-contrast')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('asset', 'liability', 'income', 'expense', 'transfer')),
  key text not null check (key = btrim(key) and length(key) > 0),
  label text not null check (label = btrim(label) and length(label) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_owner_entity_key_unique unique nulls not distinct (user_id, entity_type, key)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and length(name) > 0),
  category text not null check (category = btrim(category) and length(category) > 0),
  current_value numeric(18,2) not null check (current_value >= 0),
  purchase_value numeric(18,2) check (purchase_value >= 0),
  institution text,
  account_name text,
  currency text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),
  liquidity_level text not null default 'low' check (liquidity_level in ('high', 'medium', 'low')),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and length(name) > 0),
  category text not null check (category = btrim(category) and length(category) > 0),
  institution text,
  original_amount numeric(18,2) not null check (original_amount >= 0),
  current_balance numeric(18,2) not null check (current_balance >= 0 and current_balance <= original_amount),
  interest_rate numeric(8,4) check (interest_rate >= 0),
  monthly_payment numeric(18,2) check (monthly_payment >= 0),
  start_date date,
  end_date date,
  due_day smallint check (due_day between 1 and 31),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (user_id, id)
);

create table public.asset_value_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id uuid not null,
  value numeric(18,2) not null check (value >= 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, asset_id) references public.assets (user_id, id) on delete cascade,
  unique (asset_id, recorded_at)
);

create table public.liability_value_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  liability_id uuid not null,
  balance numeric(18,2) not null check (balance >= 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, liability_id) references public.liabilities (user_id, id) on delete cascade,
  unique (liability_id, recorded_at)
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  name text not null check (name = btrim(name) and length(name) > 0),
  category text not null check (category = btrim(category) and length(category) > 0),
  amount numeric(18,2) not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_month date not null check (start_month = date_trunc('month', start_month)::date),
  end_month date check (end_month = date_trunc('month', end_month)::date and end_month >= start_month),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  name text not null check (name = btrim(name) and length(name) > 0),
  category text not null check (category = btrim(category) and length(category) > 0),
  amount numeric(18,2) not null check (amount > 0),
  transaction_date date not null,
  note text,
  source_recurring_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, source_recurring_id) references public.recurring_transactions (user_id, id) on delete set null (source_recurring_id)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null check (category = btrim(category) and length(category) > 0),
  planned_amount numeric(18,2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, type, category)
);

create table public.monthly_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  status text not null default 'draft' check (status in ('draft', 'closed')),
  closed_at timestamptz,
  reconciliation_asset_id uuid,
  closing_cash numeric(18,2) check (closing_cash >= 0),
  asset_value numeric(18,2) check (asset_value >= 0),
  difference numeric(18,2),
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, reconciliation_asset_id) references public.assets (user_id, id) on delete set null (reconciliation_asset_id),
  unique (user_id, month),
  check ((status = 'draft' and closed_at is null) or (status = 'closed' and closed_at is not null)),
  check (
    (reconciliation_asset_id is null and closing_cash is null and asset_value is null and difference is null and reconciled_at is null)
    or
    (reconciliation_asset_id is not null and closing_cash is not null and asset_value is not null and difference = closing_cash - asset_value and reconciled_at is not null)
  )
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and length(name) > 0),
  target_amount numeric(18,2) not null check (target_amount > 0),
  current_amount numeric(18,2) not null default 0 check (current_amount >= 0 and current_amount <= target_amount),
  target_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_completed or current_amount = target_amount),
  unique (user_id, id)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  contribution_date date not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade
);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null check (snapshot_date = date_trunc('month', snapshot_date)::date),
  total_assets numeric(18,2) not null check (total_assets >= 0),
  total_liabilities numeric(18,2) not null check (total_liabilities >= 0),
  net_worth numeric(18,2) not null,
  liquid_assets numeric(18,2) not null check (liquid_assets >= 0),
  investment_assets numeric(18,2) not null check (investment_assets >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (net_worth = total_assets - total_liabilities),
  unique (user_id, snapshot_date)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('asset', 'liability', 'transaction', 'goal', 'snapshot', 'month')),
  entity_id uuid not null,
  action text not null check (action = btrim(action) and length(action) > 0),
  value numeric(18,2),
  created_at timestamptz not null default now()
);

create index assets_user_active_idx on public.assets (user_id, is_active);
create index liabilities_user_active_idx on public.liabilities (user_id, is_active);
create index asset_history_asset_recorded_idx on public.asset_value_history (asset_id, recorded_at desc);
create index liability_history_liability_recorded_idx on public.liability_value_history (liability_id, recorded_at desc);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc) where is_active;
create unique index transactions_recurring_month_unique
on public.transactions (user_id, source_recurring_id, transaction_date)
where source_recurring_id is not null;
create index recurring_user_active_idx on public.recurring_transactions (user_id, is_active);
create index goal_contributions_goal_date_idx on public.goal_contributions (goal_id, contribution_date desc);
create index activities_user_created_idx on public.activities (user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets
for each row execute function public.set_updated_at();
create trigger liabilities_set_updated_at before update on public.liabilities
for each row execute function public.set_updated_at();
create trigger recurring_transactions_set_updated_at before update on public.recurring_transactions
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();
create trigger monthly_records_set_updated_at before update on public.monthly_records
for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();
create trigger snapshots_set_updated_at before update on public.snapshots
for each row execute function public.set_updated_at();
