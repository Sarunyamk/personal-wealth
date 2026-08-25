import assert from "node:assert/strict";
import test from "node:test";
import { renderAdminError, renderAdminUsers } from "../js/views/admin-view.js";

test("admin user cards escape identities and protect the current account", () => {
  const html = renderAdminUsers({
    currentUserId: "u1",
    users: [
      { id: "u1", email: "admin@example.com", display_name: "<Admin>", role: "admin", status: "active" },
      { id: "u2", email: "user@example.com", role: "user", status: "disabled" },
    ],
  });
  assert.doesNotMatch(html, /<Admin>/);
  assert.match(html, /&lt;Admin&gt;/);
  assert.match(html, /data-admin-action="disable"[^>]+disabled/);
  assert.match(html, /data-admin-action="enable" data-user-id="u2"/);
});

test("admin view has a retryable error state", () => {
  const html = renderAdminError({ details: ["<Forbidden>"] });
  assert.match(html, /data-admin-retry/);
  assert.match(html, /&lt;Forbidden&gt;/);
  assert.doesNotMatch(html, /<Forbidden>/);
});
