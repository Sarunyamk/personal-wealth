import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_SEED } from "../js/data/seed.js";
import { createMemoryWealthRepository } from "../js/repositories/memory-wealth-repository.js";
import { createWealthService } from "../js/services/wealth-service.js";

test("wealth service derives every summary value from repository records", async () => {
  const service = createWealthService(createMemoryWealthRepository({ seed: DEMO_SEED }));
  const summary = await service.getSummary();

  assert.equal(summary.totalAssets, 3100000);
  assert.equal(summary.totalLiabilities, 707500);
  assert.equal(summary.netWorth, 2392500);
  assert.equal(summary.liquidAssets, 300000);
  assert.equal(summary.assetCount, 3);
  assert.equal(summary.liabilityCount, 1);
  assert.equal(summary.assetAllocation.length, 3);
});

test("dashboard data syncs the current month without duplicating its snapshot", async () => {
  const repository = createMemoryWealthRepository({ seed: DEMO_SEED });
  const service = createWealthService(repository);
  const data = await service.getDashboardData({ date: new Date(2026, 7, 24) });

  assert.equal(data.snapshots.length, 8);
  assert.equal(data.snapshotResult.changed, false);
  assert.equal(data.change.amount, 34500);
  assert.equal(data.goals.length, 1);
  assert.ok(data.health.score >= 0 && data.health.score <= 100);
  assert.equal(data.activities[0].entityName, "Emergency Savings");
});
