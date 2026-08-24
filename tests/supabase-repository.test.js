import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_CODES } from "../js/errors/app-error.js";
import {
  createSupabaseWealthRepository,
  databaseError,
} from "../js/repositories/supabase-wealth-repository.js";

class FakeQuery {
  constructor(result, calls) {
    this.result = result;
    this.calls = calls;
  }

  record(method, ...parameters) {
    this.calls.push([method, ...parameters]);
    return this;
  }

  select(...parameters) { return this.record("select", ...parameters); }
  eq(...parameters) { return this.record("eq", ...parameters); }
  order(...parameters) { return this.record("order", ...parameters); }
  limit(...parameters) { return this.record("limit", ...parameters); }
  single(...parameters) { return this.record("single", ...parameters); }
  maybeSingle(...parameters) { return this.record("maybeSingle", ...parameters); }
  insert(...parameters) { return this.record("insert", ...parameters); }
  update(...parameters) { return this.record("update", ...parameters); }
  upsert(...parameters) { return this.record("upsert", ...parameters); }

  then(resolve, reject) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function fakeClient({ tableResult = { data: [], error: null }, rpcResult } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      return new FakeQuery(tableResult, calls);
    },
    rpc(name, parameters) {
      calls.push(["rpc", name, parameters]);
      return Promise.resolve(rpcResult ?? { data: null, error: null });
    },
  };
}

test("Supabase repository lists active assets and maps numeric rows", async () => {
  const client = fakeClient({
    tableResult: { data: [{ id: "a1", current_value: "5000", is_active: true }], error: null },
  });
  const repository = createSupabaseWealthRepository(client);
  assert.deepEqual(await repository.listAssets(), [
    { id: "a1", currentValue: 5000, isActive: true },
  ]);
  assert.ok(client.calls.some((call) => call[0] === "eq" && call[1] === "is_active"));
});

test("Supabase repository sends value changes through the atomic RPC", async () => {
  const client = fakeClient({
    rpcResult: { data: { id: "a1", current_value: "7500" }, error: null },
  });
  const repository = createSupabaseWealthRepository(client);
  assert.deepEqual(await repository.updateAssetValue("a1", 7500), {
    id: "a1",
    currentValue: 7500,
  });
  assert.deepEqual(client.calls[0], [
    "rpc",
    "record_asset_value",
    { p_asset_id: "a1", p_value: 7500 },
  ]);
});

test("Supabase errors retain stable domain error codes", () => {
  assert.equal(databaseError({ code: "23505", message: "duplicate" }, "Create").code, ERROR_CODES.CONFLICT);
  assert.equal(databaseError({ code: "PGRST116", message: "missing" }, "Get").code, ERROR_CODES.NOT_FOUND);
  assert.equal(databaseError({ code: "23514", message: "check" }, "Save").code, ERROR_CODES.VALIDATION);
});
