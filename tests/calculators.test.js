import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAssetAllocation,
  calculateDebtPaidPercentage,
  calculateGoalPercentage,
  calculateLiquidAssets,
  calculateNetWorth,
  sumAssets,
  sumLiabilities,
} from "../js/domain/calculators.js";

const assets = [
  { category: "cash", currentValue: 300000, liquidityLevel: "high", isActive: true },
  { category: "investment", currentValue: 700000, liquidityLevel: "medium", isActive: true },
  { category: "cash", currentValue: 50000, liquidityLevel: "high", isActive: false },
];
const liabilities = [
  { currentBalance: 200000, isActive: true },
  { currentBalance: 100000, isActive: false },
];

test("summary calculations ignore inactive records", () => {
  assert.equal(sumAssets(assets), 1000000);
  assert.equal(sumLiabilities(liabilities), 200000);
  assert.equal(calculateNetWorth(assets, liabilities), 800000);
  assert.equal(calculateLiquidAssets(assets), 300000);
});

test("asset allocation groups by category and totals 100 percent", () => {
  const allocation = calculateAssetAllocation(assets);
  assert.deepEqual(allocation, [
    { category: "investment", value: 700000, percentage: 70 },
    { category: "cash", value: 300000, percentage: 30 },
  ]);
});

test("progress calculations clamp between 0 and 100", () => {
  assert.equal(calculateDebtPaidPercentage(1000, 750), 25);
  assert.equal(calculateDebtPaidPercentage(1000, -100), 100);
  assert.equal(calculateDebtPaidPercentage(0, 0), 0);
  assert.equal(calculateGoalPercentage(250, 1000), 25);
  assert.equal(calculateGoalPercentage(1500, 1000), 100);
  assert.equal(calculateGoalPercentage(-20, 1000), 0);
});

test("empty and malformed values return stable totals", () => {
  assert.equal(calculateNetWorth(), 0);
  assert.equal(sumAssets([{ currentValue: Number.NaN }]), 0);
  assert.deepEqual(calculateAssetAllocation([]), []);
});
