import { AppError, ERROR_CODES, validationError } from "../errors/app-error.js";

function normalizedEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError(["email must be valid"]);
  }
  return email;
}

function validatedPassword(value) {
  const password = String(value ?? "");
  if (password.length < 8) throw validationError(["password must contain at least 8 characters"]);
  return password;
}

function authError(error, action) {
  const message = /banned/i.test(error?.message ?? "")
    ? "บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
    : error?.message;
  return new AppError(ERROR_CODES.AUTH, `${action} failed.`, {
    cause: error,
    details: [message].filter(Boolean),
  });
}

function unwrap(result, action) {
  if (result.error) throw authError(result.error, action);
  return result.data;
}

export function createAuthService(client) {
  if (!client?.auth) throw new TypeError("A Supabase auth client is required.");

  return Object.freeze({
    async getSession() {
      return (unwrap(await client.auth.getSession(), "Restore session").session ?? null);
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("An auth listener is required.");
      const { data } = client.auth.onAuthStateChange((event, session) => listener({ event, session }));
      return () => data.subscription.unsubscribe();
    },
    async signUp({ email, password, displayName, emailRedirectTo }) {
      if (!emailRedirectTo) throw validationError(["email confirmation redirect URL is required"]);
      const data = unwrap(
        await client.auth.signUp({
          email: normalizedEmail(email),
          password: validatedPassword(password),
          options: {
            data: { display_name: String(displayName ?? "").trim() || null },
            emailRedirectTo,
          },
        }),
        "Sign up",
      );
      return Object.freeze({ user: data.user, session: data.session, requiresEmailConfirmation: !data.session });
    },
    async signIn({ email, password }) {
      const data = unwrap(
        await client.auth.signInWithPassword({
          email: normalizedEmail(email),
          password: validatedPassword(password),
        }),
        "Sign in",
      );
      return Object.freeze({ user: data.user, session: data.session });
    },
    async signOut() {
      unwrap(await client.auth.signOut(), "Sign out");
    },
    async requestPasswordReset(email, redirectTo) {
      normalizedEmail(email);
      if (!redirectTo) throw validationError(["password reset redirect URL is required"]);
      unwrap(
        await client.auth.resetPasswordForEmail(normalizedEmail(email), { redirectTo }),
        "Request password reset",
      );
    },
    async updatePassword(password) {
      const data = unwrap(
        await client.auth.updateUser({ password: validatedPassword(password) }),
        "Update password",
      );
      return data.user;
    },
  });
}

export { normalizedEmail, validatedPassword };
