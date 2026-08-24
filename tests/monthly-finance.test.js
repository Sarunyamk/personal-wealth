import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBudgetComparison,
  filterTransactionsByMonth,
  normalizeTransaction,
  summarizeMonthlyTransactions,
} from "../js/domain/monthly-finance.js";

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
