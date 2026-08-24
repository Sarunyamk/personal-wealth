import assert from "node:assert/strict";
import test from "node:test";
import { createOnboardingState } from "../js/state/onboarding.js";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("onboarding advances asset, debt and goal steps", () => {
  const state = createOnboardingState(storage());
  assert.equal(state.value.step, "asset");
  assert.equal(state.advance().step, "debt");
  assert.equal(state.skipDebt().step, "goal");
  assert.equal(state.advance().completed, true);
});

test("onboarding restores completion and only permits skipping debt", () => {
  const store = storage();
  const first = createOnboardingState(store);
  assert.throws(() => first.skipDebt());
  first.complete();
  assert.equal(createOnboardingState(store).value.completed, true);
});
