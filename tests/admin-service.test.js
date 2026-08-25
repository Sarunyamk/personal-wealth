import assert from "node:assert/strict";
import test from "node:test";
import { createAdminService } from "../js/services/admin-service.js";

test("admin service invokes only the server-side account function", async () => {
  const calls = [];
  const admin = createAdminService({
    async rpc(name) {
      calls.push([name]);
      return { data: [{ id: "u1", last_sign_in_at: "2026-08-25T00:00:00Z" }] };
    },
    functions: {
      async invoke(name, options) {
        calls.push([name, options]);
        const status = options.body.action === "disable" ? "disabled" : "active";
        return { data: options.body.action === "delete" ? { ok: true } : { ok: true, user: { status } } };
      },
    },
  });
  assert.deepEqual(await admin.listUsers(), [{ id: "u1", last_sign_in_at: "2026-08-25T00:00:00Z", emailConfirmedAt: undefined, lastSignInAt: "2026-08-25T00:00:00Z" }]);
  await admin.disableUser("u1");
  await admin.enableUser("u1");
  await admin.deleteUser("u1");
  assert.deepEqual(
    calls.slice(1).map(([, options]) => options.body.action),
    ["disable", "enable", "delete"],
  );
});

test("admin service rejects a successful response without persisted status", async () => {
  const admin = createAdminService({
    async rpc() { return { data: [] }; },
    functions: { async invoke() { return { data: { ok: true, user: { status: "active" } } }; } },
  });
  await assert.rejects(admin.disableUser("u1"), /not persisted/i);
});

test("admin service preserves the Edge Function response error", async () => {
  const admin = createAdminService({
    async rpc() {
      return { data: [] };
    },
    functions: {
      async invoke() {
        return {
          data: null,
          error: {
            message: "Edge Function returned a non-2xx status code",
            context: { json: async () => ({ error: "Forbidden" }) },
          },
        };
      },
    },
  });

  await assert.rejects(admin.disableUser("u1"), (error) => {
    assert.deepEqual(error.details, ["Forbidden", "Edge Function returned a non-2xx status code"]);
    return true;
  });
});

test("admin user listing reports database RPC errors without invoking the Edge Function", async () => {
  let invoked = false;
  const admin = createAdminService({
    async rpc(name) {
      assert.equal(name, "admin_list_users");
      return { error: { message: "ADMIN_REQUIRED" } };
    },
    functions: { async invoke() { invoked = true; } },
  });

  await assert.rejects(admin.listUsers(), (error) => error.details.includes("ADMIN_REQUIRED"));
  assert.equal(invoked, false);
});
