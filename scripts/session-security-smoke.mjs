import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execSync("pnpm dlx supabase status -o json", { encoding: "utf8" });
  return JSON.parse(output.slice(output.indexOf("{")));
}

function client(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function sql(statement) {
  execFileSync("docker", ["exec", "supabase_db_personal-wealth", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement]);
}

function jwtPayload(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

const status = localStatus();
const publishableKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
const service = client(status.API_URL, status.SERVICE_ROLE_KEY || status.SECRET_KEY);
const account = { email: `session-smoke-${Date.now()}@example.test`, password: "Session-smoke-password-1" };
let userId;

try {
  const created = await service.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const browser = client(status.API_URL, publishableKey);
  const signedIn = await browser.auth.signInWithPassword(account);
  if (signedIn.error) throw signedIn.error;
  const sessionId = jwtPayload(signedIn.data.session.access_token).session_id;

  const active = await browser.rpc("account_access_status");
  if (active.error) throw active.error;
  assert.equal(active.data, "active");

  sql(`update auth.sessions set created_at = now() - interval '8 days' where id = '${sessionId}'::uuid`);
  const expired = await browser.rpc("account_access_status");
  if (expired.error) throw expired.error;
  assert.equal(expired.data, "expired");
  const expiredRead = await browser.from("profiles").select("id").eq("id", userId);
  if (expiredRead.error) throw expiredRead.error;
  assert.deepEqual(expiredRead.data, [], "Expired session must be denied by restrictive RLS");

  sql(`update auth.sessions set created_at = now() where id = '${sessionId}'::uuid`);
  assert.equal((await browser.rpc("account_access_status")).data, "active");
  sql(`delete from auth.sessions where id = '${sessionId}'::uuid`);
  const revoked = await browser.rpc("account_access_status");
  if (revoked.error) throw revoked.error;
  assert.equal(revoked.data, "expired");

  console.log("Session security smoke passed for active, seven-day expiry, RLS denial and revocation.");
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
