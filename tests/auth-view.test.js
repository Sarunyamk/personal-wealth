import assert from "node:assert/strict";
import test from "node:test";
import { renderAuthView } from "../js/views/auth-view.js";

test("login view exposes email, current password and recovery actions", () => {
  const html = renderAuthView({ mode: "login", email: "user@example.com" });
  assert.match(html, /data-mode="login"/);
  assert.match(html, /autocomplete="email"/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /data-auth-mode="forgot"/);
  assert.match(html, /data-auth-mode="signup"/);
});

test("signup view requires matching new-password fields and escapes state", () => {
  const html = renderAuthView({ mode: "signup", email: "<unsafe>@example.com", error: "<invalid>" });
  assert.equal((html.match(/autocomplete="new-password"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<unsafe>|<invalid>/);
  assert.match(html, /role="alert"/);
});

test("reset and forgot views render focused fields", () => {
  const forgot = renderAuthView({ mode: "forgot" });
  const reset = renderAuthView({ mode: "reset" });
  assert.doesNotMatch(forgot, /type="password"/);
  assert.equal((reset.match(/type="password"/g) ?? []).length, 2);
});

test("pending auth view prevents repeated submission", () => {
  const html = renderAuthView({ pending: true, message: "Check your inbox" });
  assert.match(html, /disabled aria-busy="true"/);
  assert.match(html, /role="status"/);
});
