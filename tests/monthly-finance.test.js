import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBudgetComparison,
  buildTransferAllocation,
  recurringDateForMonth,
  filterTransactionsByMonth,
  normalizeTransaction,
  summarizeMonthlyTransactions,
} from "../js/domain/monthly-finance.js";
import { DEMO_SEED } from "../js/data/seed.js";

const records = [
  { type: "income", amount: 25000, transactionDate: "2026-08-01", isActive: true },
  { type: "expense", amount: 10000, transactionDate: "2026-08-05", isActive: true },
  { type: "transfer", amount: 5000, transactionDate: "2026-08-08", isActive: true },
  { type: "expense", amount: 999, transactionDate: "2026-07-05", isActive: true },
];

test("monthly summary excludes transfers from expense and savings", () => {
  assert.deepEqual(summarizeMonthlyTransactions(records), {
    income: 25000,
    expense: 10999,
    transfers: 5000,
    savings: 14001,
    cashFlow: 14001,
    savingsRate: 56.004,
    transactionCount: 4,
  });
});

test("month filtering is deterministic and does not mutate input", () => {
  const before = structuredClone(records);
  const result = filterTransactionsByMonth(records, "2026-08");
  assert.equal(result.length, 3);
  assert.deepEqual(records, before);
});

test("transaction normalization rejects missing and zero-value inputs", () => {
  assert.throws(() =>
    normalizeTransaction(
      { type: "expense", name: "", category: "food", amount: 0, transactionDate: "bad" },
      { id: "id", now: "2026-08-24T00:00:00.000Z" },
    ),
  );
});

test("budget comparison aggregates actual values without counting other types", () => {
  const result = buildBudgetComparison(
    [{ id: "budget", type: "expense", category: "Food", plannedAmount: 4000 }],
    [
      { type: "expense", category: "Food", amount: 1500, isActive: true },
      { type: "expense", category: "food", amount: 500, isActive: true },
      { type: "transfer", category: "Food", amount: 9000, isActive: true },
    ],
  );
  assert.deepEqual(result[0], {
    id: "budget",
    type: "expense",
    category: "Food",
    plannedAmount: 4000,
    actualAmount: 2000,
    variance: 2000,
  });
  assert.equal(result[1].type, "transfer");
});

test("recurring dates clamp to the final day of short months", () => {
  assert.equal(recurringDateForMonth("2026-02", 31), "2026-02-28");
  assert.equal(recurringDateForMonth("2028-02", 31), "2028-02-29");
});

test("transfer allocation groups categories and ignores expenses", () => {
  const allocation = buildTransferAllocation([
    { type: "transfer", category: "ETF", amount: 3000, isActive: true },
    { type: "transfer", category: "etf", amount: 2000, isActive: true },
    { type: "transfer", category: "Gold", amount: 5000, isActive: true },
    { type: "expense", category: "Gold", amount: 9000, isActive: true },
  ]);
  assert.equal(allocation.length, 2);
  assert.equal(allocation[0].amount, 5000);
  assert.equal(allocation[0].percentage, 50);
  assert.equal(allocation.reduce((sum, item) => sum + item.amount, 0), 10000);
});

test("spreadsheet demo seed derives August totals from source rows", () => {
  const august = filterTransactionsByMonth(DEMO_SEED.transactions, "2026-08");
  const summary = summarizeMonthlyTransactions(august);
  assert.equal(summary.income, 25000);
  assert.equal(summary.expense, 19750);
  assert.equal(summary.transfers, 18000);
  assert.equal(summary.transactionCount, 16);
});
