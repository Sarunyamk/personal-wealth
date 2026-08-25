import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

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

  const updated = await browser.from("profiles").update({
    display_name: "Settings Smoke",
    base_currency: "USD",
    theme: "high-contrast",
    privacy_default: true,
  }).eq("id", userId).select("display_name,base_currency,theme,privacy_default,role,status").single();
  if (updated.error) throw updated.error;
  assert.deepEqual(updated.data, {
    display_name: "Settings Smoke", base_currency: "USD", theme: "high-contrast",
    privacy_default: true, role: "user", status: "active",
  });

  const escalation = await browser.from("profiles").update({ role: "admin", status: "disabled" }).eq("id", userId);
  assert.ok(escalation.error, "A user must not update protected role or status fields");
  console.log("Profile settings smoke passed for persistence, readback and protected fields.");
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
