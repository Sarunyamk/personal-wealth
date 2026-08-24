import test from "node:test";
import assert from "node:assert/strict";
import { getNavigationItem, getViewIdFromHash } from "../js/config/navigation.js";

test("hash navigation resolves known views", () => {
  assert.equal(getViewIdFromHash("#assets"), "assets");
  assert.equal(getViewIdFromHash("#/goals"), "goals");
});

test("unknown or empty routes fall back to dashboard", () => {
  assert.equal(getViewIdFromHash(""), "dashboard");
  assert.equal(getViewIdFromHash("#unknown"), "dashboard");
  assert.equal(getNavigationItem("unknown").id, "dashboard");
});
