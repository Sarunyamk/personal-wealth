import assert from "node:assert/strict";
import test from "node:test";
import {
  authCallbackUrl,
  authErrorFromHash,
  authModeFromHash,
  passwordResetUrl,
} from "../js/auth/auth-controller.js";

test("auth guard reserves only the recovery hash for password reset", () => {
  assert.equal(authModeFromHash("#reset-password"), "reset");
  assert.equal(authModeFromHash("#dashboard"), "login");
  assert.equal(authModeFromHash(""), "login");
});

test("auth callback explains expired confirmation links", () => {
  assert.equal(
    authErrorFromHash("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"),
    "ลิงก์ยืนยันหมดอายุหรือถูกใช้แล้ว กรุณาสมัครหรือขอลิงก์ใหม่",
  );
  assert.equal(authErrorFromHash("#dashboard"), "");
});

test("password reset callback preserves the GitHub Pages project path", () => {
  assert.equal(
    passwordResetUrl({ origin: "https://sarunyamk.github.io", pathname: "/personal-wealth/" }),
    "https://sarunyamk.github.io/personal-wealth/#reset-password",
  );
});

test("signup callback preserves the GitHub Pages project path", () => {
  assert.equal(
    authCallbackUrl({ origin: "https://sarunyamk.github.io", pathname: "/personal-wealth/" }),
    "https://sarunyamk.github.io/personal-wealth/",
  );
});
