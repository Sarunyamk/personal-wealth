import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202608240001_initial_schema.sql", import.meta.url),
  "utf8",
);
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
  assert.doesNotMatch(seed, /\([^)"']*auth\.uid\(\)/);
  assert.ok((seed.match(/\(null, '/g) ?? []).length >= 20);
});
