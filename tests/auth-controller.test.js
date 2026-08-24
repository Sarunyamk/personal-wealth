import assert from "node:assert/strict";
import test from "node:test";
import { authModeFromHash, passwordResetUrl } from "../js/auth/auth-controller.js";

test("auth guard reserves only the recovery hash for password reset", () => {
  assert.equal(authModeFromHash("#reset-password"), "reset");
  assert.equal(authModeFromHash("#dashboard"), "login");
  assert.equal(authModeFromHash(""), "login");
});

test("password reset callback preserves the GitHub Pages project path", () => {
  assert.equal(
    passwordResetUrl({ origin: "https://sarunyamk.github.io", pathname: "/personal-wealth/" }),
    "https://sarunyamk.github.io/personal-wealth/#reset-password",
  );
});
