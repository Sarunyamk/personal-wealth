import assert from "node:assert/strict";
import test from "node:test";
import { renderAnnualReportView } from "../js/views/annual-report-view.js";

function report(overrides = {}) {
  return {
    year: 2026,
    activeMonths: 2,
    totals: { income: 50000, expense: 20000, savings: 30000, transfers: 10000, savingsRate: 60 },
    averages: { income: 25000, expense: 10000, savings: 15000 },
    openingNetWorth: 400000,
    closingNetWorth: 500000,
    netWorthGrowth: 100000,
    snapshots: [{ snapshotDate: "2026-01-01", netWorth: 400000 }],
    expenseCategories: [{ category: "Food & Drink", amount: 20000 }],
    months: Array.from({ length: 12 }, (_, index) => ({ month: `2026-${String(index + 1).padStart(2, "0")}`, income: 0, expense: 0, savings: 0, transfers: 0 })),
    ...overrides,
  };
}

test("annual report view renders partial data and escapes categories", () => {
  const html = renderAnnualReportView({ data: report(), isPrivate: false });
  assert.match(html, /2 จาก 12 เดือน/);
  assert.match(html, /Food &amp; Drink/);
  assert.match(html, /data-annual-cashflow-chart/);
  assert.match(html, /data-annual-expense-chart/);
});

test("annual report view masks financial values", () => {
  const html = renderAnnualReportView({ data: report(), isPrivate: true });
  assert.doesNotMatch(html, />฿50,000</);
  assert.match(html, /data-sensitive/);
});

test("annual report view has a dedicated empty year state", () => {
  const html = renderAnnualReportView({
    data: report({ activeMonths: 0, snapshots: [] }),
    isPrivate: false,
  });
  assert.match(html, /ยังไม่มีข้อมูลในปี 2026/);
  assert.doesNotMatch(html, /data-annual-cashflow-chart/);
});
