import test from "node:test";
import assert from "node:assert/strict";
import { filterRecords, renderAssetsView } from "../js/views/records-view.js";

const records = [
  { name: "SCB Saving", institution: "SCB", category: "bank-account" },
  { name: "Gold", institution: null, category: "gold" },
];

test("record filtering combines search and category without mutating records", () => {
  assert.deepEqual(filterRecords(records, { query: "scb", category: "bank-account" }), [
    records[0],
  ]);
  assert.deepEqual(filterRecords(records, { query: "gold", category: "bank-account" }), []);
  assert.equal(records.length, 2);
});

test("record views escape user-controlled names and institutions", () => {
  const html = renderAssetsView({
    assets: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: '<img src=x onerror="alert(1)">',
        institution: "A&B",
        category: "other",
        currentValue: 100,
        updatedAt: "2026-08-24T00:00:00.000Z",
      },
    ],
    query: "",
    category: "all",
    isPrivate: false,
  });

  assert.equal(html.includes("<img src=x"), false);
  assert.equal(html.includes("&lt;img src=x"), true);
  assert.equal(html.includes("A&amp;B"), true);
});
