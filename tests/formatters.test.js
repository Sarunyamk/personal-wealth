import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
} from "../js/utils/formatters.js";

test("currency formatters preserve exact and compact meanings", () => {
  const exact = formatCurrency(2842500, { locale: "en-US" });
  const compact = formatCompactCurrency(2842500, { locale: "en-US" });
  assert.equal(exact, "฿2,842,500");
  assert.equal(compact, "฿2.84M");
  assert.equal(formatCurrency(Number.NaN), "-");
});

test("shared formatter remains Thai baht by default", () => {
  assert.match(formatCurrency(100, { locale: "en-US" }), /฿100/);
});

test("percent values are accepted in human percentage units", () => {
  assert.equal(formatPercent(37.5, { locale: "en-US" }), "37.5%");
  assert.equal(formatPercent(Number.NaN), "-");
});

test("dates format deterministically in UTC", () => {
  assert.equal(formatDate("2026-08-24", { locale: "en-GB" }), "24 Aug 2026");
  assert.equal(formatDate(null), "-");
});
