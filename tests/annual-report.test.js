import assert from "node:assert/strict";
import test from "node:test";
import { buildAnnualExpenseCategories, buildAnnualReport, buildAnnualReportCsv } from "../js/domain/annual-report.js";

const transactions = [
  { type: "income", category: "salary", amount: 25000, transactionDate: "2026-01-01", isActive: true },
  { type: "expense", category: "Food", amount: 3000, transactionDate: "2026-01-02", isActive: true },
  { type: "transfer", category: "ETF", amount: 5000, transactionDate: "2026-01-03", isActive: true },
  { type: "expense", category: "food", amount: 4000, transactionDate: "2026-02-02", isActive: true },
  { type: "income", category: "salary", amount: 99999, transactionDate: "2025-12-01", isActive: true },
];

test("annual flow totals exclude transfers from income and expense", () => {
  const report = buildAnnualReport({ year: 2026, transactions });
  assert.equal(report.totals.income, 25000);
  assert.equal(report.totals.expense, 7000);
  assert.equal(report.totals.transfers, 5000);
  assert.equal(report.totals.savings, 18000);
  assert.equal(report.activeMonths, 2);
  assert.equal(report.averages.expense, 3500);
});

test("annual net worth uses opening and closing points without summing snapshots", () => {
  const report = buildAnnualReport({
    year: 2026,
    snapshots: [
      { snapshotDate: "2025-12-01", netWorth: 100000 },
      { snapshotDate: "2026-01-01", netWorth: 110000 },
      { snapshotDate: "2026-12-01", netWorth: 150000 },
    ],
  });
  assert.equal(report.openingNetWorth, 100000);
  assert.equal(report.closingNetWorth, 150000);
  assert.equal(report.netWorthGrowth, 50000);
});

test("annual expense categories group case-insensitively", () => {
  assert.deepEqual(buildAnnualExpenseCategories(transactions, 2026), [
    { category: "Food", amount: 7000 },
  ]);
});

test("annual CSV preserves report totals and escapes category labels", () => {
  const report = {
    ...buildAnnualReport({ year: 2026, transactions }),
    expenseCategories: [{ category: 'Food, "Drink"', amount: 7000 }],
  };
  const csv = buildAnnualReportCsv(report);
  assert.match(csv, /TOTAL,25000,7000,18000,5000/);
  assert.match(csv, /"Food, ""Drink""",7000/);
  assert.equal(csv.split("\r\n").filter((line) => /^2026-\d{2},/.test(line)).length, 12);
});
