import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_CODES } from "../js/errors/app-error.js";
import { createSettingsService, validateProfileSettings } from "../js/services/settings-service.js";

test("profile settings are normalized and validated", () => {
  assert.deepEqual(validateProfileSettings({ displayName: "  Mink ", baseCurrency: "thb", theme: "fresh", privacyDefault: true }), {
    display_name: "Mink", base_currency: "THB", theme: "fresh", privacy_default: true,
  });
  assert.throws(() => validateProfileSettings({ displayName: "", baseCurrency: "BTC", theme: "dark" }), { code: ERROR_CODES.VALIDATION });
});

test("settings service updates current profile preference fields", async () => {
  const calls = [];
  const result = { id: "u1", display_name: "Mink", base_currency: "THB", theme: "fresh", privacy_default: true };
  const updateQuery = {
    eq(column, value) { calls.push(["update-eq", column, value]); return this; },
    select(columns) { calls.push(["update-select", columns]); return this; },
    async single() { calls.push(["update-single"]); return { data: result, error: null }; },
  };
  const selectQuery = {
    eq(column, value) { calls.push(["select-eq", column, value]); return this; },
    async single() { calls.push(["single"]); return { data: result, error: null }; },
  };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        update(values) { calls.push(["update", values]); return updateQuery; },
        select(columns) { calls.push(["select", columns]); return selectQuery; },
      };
    },
    auth: {},
  };
  const profile = await createSettingsService(client).updateProfile("u1", { displayName: "Mink", baseCurrency: "THB", theme: "fresh", privacyDefault: true });
  assert.equal(profile, result);
  assert.equal(calls.filter(([method]) => method === "from").length, 1);
  assert.deepEqual(calls.slice(-3), [["update-eq", "id", "u1"], ["update-select", "*"], ["update-single"]]);
});

test("settings service reads the current profile directly from Supabase", async () => {
  const result = { id: "u1", base_currency: "USD" };
  const query = { eq() { return this; }, async single() { return { data: result, error: null }; } };
  const client = { from() { return { select() { return query; } }; }, auth: {} };
  assert.equal(await createSettingsService(client).getProfile("u1"), result);
});

test("password change revokes sessions globally", async () => {
  const calls = [];
  const client = { from() {}, auth: {
    async updateUser(input) { calls.push(["update", input]); return { error: null }; },
    async signOut(input) { calls.push(["signOut", input]); return { error: null }; },
  } };
  await createSettingsService(client).changePasswordAndSignOut("new-password");
  assert.deepEqual(calls, [["update", { password: "new-password" }], ["signOut", { scope: "global" }]]);
});
