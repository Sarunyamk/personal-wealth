import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_SEED } from "../js/data/seed.js";
import { createDatabase } from "../js/data/schema.js";
import {
  buildSupabaseImportPlan,
  summarizeSupabaseImport,
} from "../js/data/supabase-import.js";

test("Supabase import orders parents before children and preserves record IDs", () => {
  const plan = buildSupabaseImportPlan(createDatabase(DEMO_SEED));
  assert.ok(
    plan.findIndex(({ collection }) => collection === "assets") <
      plan.findIndex(({ collection }) => collection === "assetValueHistory"),
  );
  const assets = plan.find(({ collection }) => collection === "assets");
  assert.equal(assets.rows[0].id, DEMO_SEED.assets[0].id);
  assert.equal(assets.rows[0].current_value, DEMO_SEED.assets[0].currentValue);
  assert.equal("user_id" in assets.rows[0], false);
});

test("Supabase import maps history foreign keys and month dates", () => {
  const plan = buildSupabaseImportPlan(createDatabase(DEMO_SEED));
  const history = plan.find(({ collection }) => collection === "assetValueHistory").rows[0];
  assert.equal(history.asset_id, DEMO_SEED.assetValueHistory[0].entityId);
  assert.equal("entity_id" in history, false);
  const budget = plan.find(({ collection }) => collection === "budgets").rows[0];
  assert.match(budget.month, /^\d{4}-\d{2}-01$/);
});

test("Supabase import summary is derived from the generated batches", () => {
  const plan = buildSupabaseImportPlan(createDatabase(DEMO_SEED));
  const summary = summarizeSupabaseImport(plan);
  assert.equal(summary.assets, DEMO_SEED.assets.length);
  assert.equal(summary.transactions, DEMO_SEED.transactions.length);
});
