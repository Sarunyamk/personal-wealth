# Data Contracts

This document freezes the frontend data shape before the Phase 7 Supabase migration. Local camelCase
fields map to PostgreSQL snake_case columns. Money uses `numeric(18,2)`, never floating point. Dates
use `date`, timestamps use `timestamptz`, IDs use `uuid`, and all user-owned rows include a required
`user_id uuid` foreign key to `auth.users(id)` for RLS.

## Shared Rules

- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Ownership: `user_id` is immutable and indexed; RLS compares it with `auth.uid()`.
- Timestamps: mutable entities have `created_at` and `updated_at`; append-only events have `created_at`.
- Soft deletion: financial source records use `is_active boolean not null default true`.
- Amounts are finite and non-negative unless explicitly documented otherwise.
- Required names and categories are trimmed, non-empty text.
- Currency is an ISO-style three-letter code; MVP defaults to `THB`.
- Client-calculated summaries are never stored separately from their source records, except monthly snapshots.

## Entity Fields

| Collection / table | Fields beyond `id`, `user_id` | Keys and checks |
| --- | --- | --- |
| `assets` | `name`, `category`, `current_value`, `purchase_value?`, `institution?`, `account_name?`, `currency`, `liquidity_level`, `note?`, `is_active`, timestamps | `current_value >= 0`; optional purchase value `>= 0`; liquidity in `high, medium, low` |
| `liabilities` | `name`, `category`, `institution?`, `original_amount`, `current_balance`, `interest_rate?`, `monthly_payment?`, `start_date?`, `end_date?`, `due_day?`, `note?`, `is_active`, timestamps | amounts `>= 0`; rate `>= 0`; due day `1..31`; end date not before start date |
| `asset_value_history` | `asset_id`, `value`, `recorded_at`, `created_at` | FK asset cascade; value `>= 0`; unique `(asset_id, recorded_at)` |
| `liability_value_history` | `liability_id`, `balance`, `recorded_at`, `created_at` | FK liability cascade; balance `>= 0`; unique `(liability_id, recorded_at)` |
| `transactions` | `type`, `name`, `category`, `amount`, `transaction_date`, `note?`, `source_recurring_id?`, `is_active`, timestamps | type in `income, expense, transfer`; amount `> 0`; optional recurring FK set null; index `(user_id, transaction_date)` |
| `budgets` | `month`, `type`, `category`, `planned_amount`, timestamps | month is first day/month key; type as transaction; planned amount `>= 0`; unique `(user_id, month, type, category)` |
| `recurring_transactions` | `type`, `name`, `category`, `amount`, `day_of_month`, `start_month`, `end_month?`, `note?`, `is_active`, timestamps | amount `> 0`; day `1..31`; end month not before start month |
| `monthly_records` | `month`, `status`, `closed_at?`, reconciliation fields, timestamps | unique `(user_id, month)`; status in `draft, closed`; reconciliation asset FK; closed rows require `closed_at` |
| `goals` | `name`, `target_amount`, `current_amount`, `target_date?`, `is_completed`, timestamps | target `> 0`; current between `0` and target; completed implies current equals target |
| `goal_contributions` | `goal_id`, `amount`, `contribution_date`, `note?`, `created_at` | FK goal cascade; amount `> 0`; index `(goal_id, contribution_date)` |
| `snapshots` | `snapshot_date`, `total_assets`, `total_liabilities`, `net_worth`, `liquid_assets`, `investment_assets`, timestamps | unique `(user_id, snapshot_date)`; date is first of month; non-negative totals; net worth equals assets minus liabilities |
| `activities` | `entity_type`, `entity_id`, `action`, `amount?`, `created_at` | append-only audit feed; index `(user_id, created_at desc)` |

`monthly_records` reconciliation is represented locally as an object. In PostgreSQL it should use nullable
columns `reconciliation_asset_id`, `closing_cash`, `asset_value`, `difference`, and `reconciled_at` so the
values remain queryable and constrained. All five are either null together or populated together.

## Master Data

Phase 7 adds `profiles` (`id` FK auth user, display name, base currency, theme, timestamps) and
`categories` (`id`, optional owner, entity type, key, label, sort order, active flag). System category keys
are repeatable seeds. A unique constraint on `(coalesce(user_id, system-owner), entity_type, key)` prevents
duplicates while allowing future user categories.

## Atomic Operations

- Updating an asset or liability value writes its history row in the same transaction.
- Contributing to a goal updates the goal and inserts the contribution atomically.
- Closing a month materializes recurring transactions once, then records the closed state atomically.
- Snapshot upsert is idempotent by `(user_id, snapshot_date)`.

Fixtures in `js/data/seed.js` must satisfy these constraints. Runtime seed validation lives in
`js/domain/contracts.js`; repository mutation tests cover atomic behavior and uniqueness expectations.
