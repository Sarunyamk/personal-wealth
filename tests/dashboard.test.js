import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFinancialHealth,
  calculateSnapshotChange,
  filterSnapshotsByRange,
  toMonthStart,
} from "../js/domain/dashboard.js";

const snapshots = Array.from({ length: 8 }, (_, index) => ({
  snapshotDate: `2026-${String(index + 1).padStart(2, "0")}-01`,
  netWorth: 1000000 + index * 50000,
}));

test("trend ranges keep the latest ordered snapshots", () => {
  assert.equal(filterSnapshotsByRange(snapshots, "3M").length, 3);
  assert.equal(filterSnapshotsByRange(snapshots, "6M")[0].snapshotDate, "2026-03-01");
  assert.equal(filterSnapshotsByRange(snapshots, "ALL").length, 8);
});

test("month change handles positive growth and missing history", () => {
  assert.deepEqual(calculateSnapshotChange([]), { amount: null, percentage: null });
  const change = calculateSnapshotChange(snapshots);
  assert.equal(change.amount, 50000);
  assert.ok(change.percentage > 3 && change.percentage < 5);
});

test("financial health scores only available indicators", () => {
  const health = calculateFinancialHealth({
    totalAssets: 1000000,
    totalLiabilities: 100000,
    liquidAssets: 150000,
    netWorthGrowthPercentage: 2,
  });
  assert.equal(health.score, 100);
  assert.equal(health.status, "Looking good");
  assert.equal(health.emergencyFundMonths, null);
  assert.equal(health.savingsRate, null);
});

test("month start is stable for the provided local date", () => {
  assert.equal(toMonthStart(new Date(2026, 7, 24)), "2026-08-01");
});
