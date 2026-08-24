import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_CODES } from "../js/errors/app-error.js";
import { createAuthService } from "../js/services/auth-service.js";

function authClient(overrides = {}) {
  const calls = [];
  const success = (data = {}) => Promise.resolve({ data, error: null });
  return {
    calls,
    auth: {
      getSession: () => success({ session: { user: { id: "u1" } } }),
      onAuthStateChange: (listener) => {
        calls.push(["subscribe", listener]);
        return { data: { subscription: { unsubscribe: () => calls.push(["unsubscribe"]) } } };
      },
      signUp: (input) => { calls.push(["signUp", input]); return success({ user: { id: "u1" }, session: null }); },
      signInWithPassword: (input) => { calls.push(["signIn", input]); return success({ user: { id: "u1" }, session: { access_token: "token" } }); },
      signOut: () => success(),
      resetPasswordForEmail: (email, options) => { calls.push(["reset", email, options]); return success(); },
      updateUser: (input) => { calls.push(["update", input]); return success({ user: { id: "u1" } }); },
      ...overrides,
    },
  };
}

test("auth service normalizes signup identity and reports confirmation state", async () => {
  const client = authClient();
  const auth = createAuthService(client);
  const result = await auth.signUp({ email: " USER@Example.COM ", password: "password1", displayName: " Mink " });
  assert.equal(result.requiresEmailConfirmation, true);
  assert.deepEqual(client.calls[0][1], {
    email: "user@example.com",
    password: "password1",
    options: { data: { display_name: "Mink" } },
  });
});

test("auth service restores sessions and unsubscribes listeners", async () => {
  const client = authClient();
  const auth = createAuthService(client);
  assert.equal((await auth.getSession()).user.id, "u1");
  const unsubscribe = auth.subscribe(() => {});
  unsubscribe();
  assert.equal(client.calls.at(-1)[0], "unsubscribe");
});

test("auth service validates credentials before calling Supabase", async () => {
  const client = authClient();
  const auth = createAuthService(client);
  await assert.rejects(auth.signIn({ email: "invalid", password: "short" }), {
    code: ERROR_CODES.VALIDATION,
  });
  assert.deepEqual(client.calls, []);
});

test("auth service maps provider errors to a stable auth error", async () => {
  const client = authClient({
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Invalid login credentials" } }),
  });
  const auth = createAuthService(client);
  await assert.rejects(auth.signIn({ email: "user@example.com", password: "password1" }), {
    code: ERROR_CODES.AUTH,
  });
});

test("password reset uses the configured callback and update validates strength", async () => {
  const client = authClient();
  const auth = createAuthService(client);
  await auth.requestPasswordReset("user@example.com", "https://example.com/#reset-password");
  await auth.updatePassword("new-password");
  assert.deepEqual(client.calls[0], [
    "reset",
    "user@example.com",
    { redirectTo: "https://example.com/#reset-password" },
  ]);
  assert.deepEqual(client.calls[1], ["update", { password: "new-password" }]);
});
