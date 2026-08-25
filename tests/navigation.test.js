import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_NAVIGATION,
  NAVIGATION,
  getNavigationItem,
  getViewIdFromHash,
} from "../js/config/navigation.js";

test("hash navigation resolves known views", () => {
  assert.equal(getViewIdFromHash("#assets"), "assets");
  assert.equal(getViewIdFromHash("#/goals"), "goals");
});

test("admin routing is additive and unavailable to regular users", () => {
  const adminNavigation = [...NAVIGATION, ADMIN_NAVIGATION];
  assert.equal(getViewIdFromHash("#admin"), "dashboard");
  assert.equal(getViewIdFromHash("#admin", adminNavigation), "admin");
  assert.equal(getNavigationItem("admin", adminNavigation).label, "Admin");
  assert.ok(adminNavigation.some(({ id }) => id === "settings"));
});

test("unknown or empty routes fall back to dashboard", () => {
  assert.equal(getViewIdFromHash(""), "dashboard");
  assert.equal(getViewIdFromHash("#unknown"), "dashboard");
  assert.equal(getNavigationItem("unknown").id, "dashboard");
});
