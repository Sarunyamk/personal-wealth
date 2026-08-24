import assert from "node:assert/strict";
import test from "node:test";
import { renderMonthlyFinanceView } from "../js/views/monthly-finance-view.js";

const data = {
  month: "2026-08",
  summary: {
    income: 25000,
    expense: 3000,
    savings: 22000,
    transfers: 5000,
    savingsRate: 88,
    transactionCount: 1,
  },
  transactions: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      type: "expense",
      name: "<script>alert(1)</script>",
      category: "food & drink",
      amount: 3000,
      transactionDate: "2026-08-24",
    },
  ],
};

test("monthly finance view escapes transaction labels", () => {
  const html = renderMonthlyFinanceView({ data, isPrivate: false });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /food &amp; drink/);
});

test("monthly finance view masks sensitive amounts", () => {
  const html = renderMonthlyFinanceView({ data, isPrivate: true });
  assert.doesNotMatch(html, />฿25,000</);
  assert.match(html, /data-sensitive/);
});

test("monthly finance view renders a reconciliation difference", () => {
  const html = renderMonthlyFinanceView({
    data: {
      ...data,
      monthlyRecord: {
        status: "draft",
        reconciliation: {
          assetId: "asset-1",
          closingCash: 13000,
          assetValue: 13500,
          difference: -500,
        },
      },
      reconciliationAssets: [{ id: "asset-1", name: "Main Bank" }],
    },
    isPrivate: false,
  });
  assert.match(html, /Main Bank/);
  assert.match(html, /budget-negative/);
  assert.match(html, /-฿500|฿-500/);
});
