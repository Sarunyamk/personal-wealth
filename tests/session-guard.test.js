import assert from "node:assert/strict";
import test from "node:test";
import { authStartupMessage, shouldReturnToLogin } from "../js/auth/session-guard.js";

test("session guard returns to login only when the account session ends", () => {
  assert.equal(shouldReturnToLogin("SIGNED_OUT"), true);
  assert.equal(shouldReturnToLogin("USER_DELETED"), true);
  assert.equal(shouldReturnToLogin("TOKEN_REFRESHED"), false);
  assert.equal(shouldReturnToLogin("SIGNED_IN"), false);
});

test("auth startup errors retain useful provider details", () => {
  assert.equal(authStartupMessage(new Error("Network unavailable")), "Network unavailable");
  assert.equal(authStartupMessage(), "เชื่อมต่อระบบบัญชีไม่สำเร็จ กรุณาลองใหม่");
});
