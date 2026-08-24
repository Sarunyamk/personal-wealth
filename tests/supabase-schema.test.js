import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");
const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");

test("Supabase migration defines every frozen data contract table", () => {
  const tables = [
    "profiles",
    "categories",
    "assets",
    "liabilities",
    "asset_value_history",
    "liability_value_history",
    "recurring_transactions",
    "transactions",
    "budgets",
    "monthly_records",
    "goals",
    "goal_contributions",
    "snapshots",
    "activities",
  ];
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table public\\.${table} \\(`));
  }
});

test("child records enforce same-owner foreign keys and monthly uniqueness", () => {
  for (const parent of ["assets", "liabilities", "recurring_transactions", "goals"]) {
    assert.match(migration, new RegExp(`references public\\.${parent} \\(user_id, id\\)`));
  }
  assert.match(migration, /unique \(user_id, month, type, category\)/);
  assert.match(migration, /unique \(user_id, snapshot_date\)/);
  assert.match(migration, /where source_recurring_id is not null/);
});

test("master category seed is repeatable and never creates a user-owned row", () => {
  assert.match(seed, /on conflict \(user_id, entity_type, key\)/);
  assert.match(migration, /on conflict \(user_id, entity_type, key\)/);
  assert.doesNotMatch(seed, /\([^)"']*auth\.uid\(\)/);
  assert.ok((seed.match(/\(null, '/g) ?? []).length >= 20);
});

test("atomic RPCs derive ownership from auth session and reject anonymous execution", () => {
  for (const operation of [
    "record_asset_value",
    "record_liability_balance",
    "contribute_to_goal",
    "upsert_wealth_snapshot",
    "materialize_recurring_transactions",
  ]) {
    assert.match(migration, new RegExp(`create function public\\.${operation}\\(`));
    assert.match(migration, new RegExp(`revoke all on function public\\.${operation}[^;]+anon;`));
  }
  assert.ok((migration.match(/security invoker/g) ?? []).length >= 4);
  assert.ok((migration.match(/auth\.uid\(\)/g) ?? []).length >= 4);
});

test("browser inserts derive user ownership from the authenticated database session", () => {
  for (const table of [
    "assets",
    "liabilities",
    "transactions",
    "budgets",
    "monthly_records",
    "goals",
    "snapshots",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} alter column user_id set default auth\\.uid\\(\\)`),
    );
  }
});

test("RLS denies anonymous table access and scopes every user-owned table", () => {
  const userTables = [
    "assets",
    "liabilities",
    "asset_value_history",
    "liability_value_history",
    "recurring_transactions",
    "transactions",
    "budgets",
    "monthly_records",
    "goals",
    "goal_contributions",
    "snapshots",
    "activities",
  ];
  for (const table of userTables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon;`));
    assert.match(
      migration,
      new RegExp(`create policy [^\\n]+ on public\\.${table}[\\s\\S]+?auth\\.uid\\(\\)`),
    );
  }
});

test("new auth users receive a profile without exposing the trigger function", () => {
  assert.match(migration, /create function public\.handle_new_user\(\)/);
  assert.match(migration, /after insert on auth\.users/);
  assert.match(
    migration,
    /revoke all on function public\.handle_new_user\(\) from public, anon, authenticated;/,
  );
});
