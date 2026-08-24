import assert from "node:assert/strict";
import test from "node:test";
import {
  fromSupabaseRow,
  toSupabaseRow,
} from "../js/repositories/supabase-row-mapper.js";

test("Supabase rows map database numerics and hide ownership internals", () => {
  assert.deepEqual(
    fromSupabaseRow({
      id: "asset-id",
      user_id: "private-owner",
      current_value: "120500.25",
      purchase_value: null,
      is_active: true,
      created_at: "2026-08-24T00:00:00Z",
    }),
    {
      id: "asset-id",
      currentValue: 120500.25,
      purchaseValue: null,
      isActive: true,
      createdAt: "2026-08-24T00:00:00Z",
    },
  );
});

test("monthly reconciliation columns map back to the local nested contract", () => {
  assert.deepEqual(
    fromSupabaseRow({
      month: "2026-08-01",
      reconciliation_asset_id: "asset-id",
      closing_cash: "1000",
      asset_value: "900",
      difference: "100",
      reconciled_at: "2026-08-24T00:00:00Z",
    }),
    {
      month: "2026-08",
      reconciliation: {
        assetId: "asset-id",
        closingCash: 1000,
        assetValue: 900,
        difference: 100,
        reconciledAt: "2026-08-24T00:00:00Z",
      },
    },
  );
});

test("repository inputs map to snake case without client-controlled owner fields", () => {
  assert.deepEqual(
    toSupabaseRow({
      id: "client-id",
      userId: "forged-owner",
      name: "Savings",
      currentValue: 5000,
      optional: undefined,
    }),
    { name: "Savings", current_value: 5000 },
  );
});
