import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createSettingsService } from "../js/services/settings-service.js";

function localStatus() {
  const output = execSync("pnpm dlx supabase status -o json", { encoding: "utf8" });
  return JSON.parse(output.slice(output.indexOf("{")));
}

function client(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

const status = localStatus();
const service = client(status.API_URL, status.SERVICE_ROLE_KEY || status.SECRET_KEY);
const browser = client(status.API_URL, status.PUBLISHABLE_KEY || status.ANON_KEY);
const account = { email: `settings-smoke-${Date.now()}@example.test`, password: "Settings-smoke-password-1" };
let userId;

try {
  const created = await service.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const signedIn = await browser.auth.signInWithPassword(account);
  if (signedIn.error) throw signedIn.error;

  const settings = createSettingsService(browser);
  const updated = await settings.updateProfile(userId, {
    displayName: "Settings Smoke",
    theme: "high-contrast", privacyDefault: true,
  });
  assert.deepEqual({
    display_name: updated.display_name, base_currency: updated.base_currency,
    theme: updated.theme, privacy_default: updated.privacy_default,
    role: updated.role, status: updated.status,
  }, {
    display_name: "Settings Smoke", base_currency: "THB", theme: "high-contrast",
    privacy_default: true, role: "user", status: "active",
  });
  const readback = await settings.getProfile(userId);
  assert.equal(readback.display_name, "Settings Smoke");
  assert.equal(readback.base_currency, "THB");

  const currencyMutation = await browser.from("profiles").update({ base_currency: "USD" }).eq("id", userId);
  assert.ok(currencyMutation.error, "A user must not change the fixed THB currency");

  const escalation = await browser.from("profiles").update({ role: "admin", status: "disabled" }).eq("id", userId);
  assert.ok(escalation.error, "A user must not update protected role or status fields");
  console.log("Profile settings smoke passed for persistence, readback and protected fields.");
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
