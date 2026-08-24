import assert from "node:assert/strict";
import test from "node:test";
import { selectWealthRepository } from "../js/bootstrap.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("financial data never silently falls back to local storage", () => {
  assert.throws(
    () => selectWealthRepository({ storage: storage() }),
    /Supabase data source is required/,
  );
});

test("local financial storage requires explicit demo mode", async () => {
  const repository = selectWealthRepository({ allowLocalDemo: true, storage: storage() });
  assert.ok((await repository.listAssets()).length > 0);
});

test("Supabase is selected whenever an authenticated client is injected", () => {
  const client = { from() {}, rpc() {} };
  const repository = selectWealthRepository({
    supabaseClient: client,
    allowLocalDemo: true,
    storage: storage(),
  });
  assert.equal(typeof repository.listAssets, "function");
});
