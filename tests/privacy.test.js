import test from "node:test";
import assert from "node:assert/strict";
import { MASKED_AMOUNT, createPrivacyState, presentAmount } from "../js/state/privacy.js";

function createMemoryStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set("wealth:privacy-mode", initialValue);
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("privacy state restores, persists and publishes changes", () => {
  const storage = createMemoryStorage("true");
  const state = createPrivacyState(storage);
  const changes = [];
  state.subscribe((value) => changes.push(value));

  assert.equal(state.value, true);
  assert.equal(state.toggle(), false);
  assert.deepEqual(changes, [false]);
  assert.equal(storage.getItem("wealth:privacy-mode"), "false");
});

test("amount presentation masks the entire formatted value", () => {
  assert.equal(presentAmount("฿2,842,500", false), "฿2,842,500");
  assert.equal(presentAmount("฿2,842,500", true), MASKED_AMOUNT);
});

test("privacy state uses profile default only without a device preference", () => {
  assert.equal(createPrivacyState(createMemoryStorage(), true).value, true);
  assert.equal(createPrivacyState(createMemoryStorage("false"), true).value, false);
});
