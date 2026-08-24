import test from "node:test";
import assert from "node:assert/strict";
import {
  assertValidSeedData,
  isDate,
  isTimestamp,
  isUuid,
  validateAsset,
} from "../js/domain/contracts.js";
import { DEMO_SEED, EMPTY_SEED } from "../js/data/seed.js";

test("seed fixtures satisfy the data contracts", () => {
  assert.equal(assertValidSeedData(DEMO_SEED), true);
  assert.equal(assertValidSeedData(EMPTY_SEED), true);
});

test("UUID, date and timestamp checks reject misleading values", () => {
  assert.equal(isUuid("10000000-0000-4000-8000-000000000001"), true);
  assert.equal(isUuid("asset-1"), false);
  assert.equal(isDate("2026-02-28"), true);
  assert.equal(isDate("2026-02-31"), false);
  assert.equal(isTimestamp("2026-08-01T00:00:00.000Z"), true);
  assert.equal(isTimestamp("2026-08-01"), false);
});

test("asset validation reports invalid financial fields", () => {
  const errors = validateAsset({
    id: "not-a-uuid",
    name: "",
    category: "cash",
    currentValue: -1,
    currency: "USD",
    liquidityLevel: "instant",
    isActive: "yes",
    createdAt: "today",
    updatedAt: "today",
  });

  assert.ok(errors.length >= 7);
});
