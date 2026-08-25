import assert from "node:assert/strict";
import test from "node:test";
import { createAdminService } from "../js/services/admin-service.js";

test("admin service invokes only the server-side account function", async () => {
  const calls = [];
  const admin = createAdminService({
    functions: {
      async invoke(name, options) {
        calls.push([name, options]);
        return { data: options.body.action === "list" ? { users: [{ id: "u1" }] } : { ok: true } };
      },
    },
  });
  assert.deepEqual(await admin.listUsers(), [{ id: "u1" }]);
  await admin.disableUser("u1");
  await admin.enableUser("u1");
  await admin.deleteUser("u1");
  assert.deepEqual(
    calls.map(([, options]) => options.body.action),
    ["list", "disable", "enable", "delete"],
  );
});
