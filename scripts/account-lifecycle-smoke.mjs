import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execSync("pnpm dlx supabase status -o json", { encoding: "utf8" });
  return JSON.parse(output.slice(output.indexOf("{")));
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function invoke(instance, action, userId) {
  const { data, error } = await instance.functions.invoke("admin-users", { body: { action, userId } });
  if (error || data?.error) throw error || new Error(data.error);
  return data;
}

const status = localStatus();
const publishableKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
const serviceKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
const service = client(status.API_URL, serviceKey);
const password = "Lifecycle-smoke-password-1";
const suffix = `${Date.now()}@example.test`;
const createdUserIds = new Set();

async function createUser(label) {
  const email = `lifecycle-${label}-${suffix}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUserIds.add(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(account) {
  const instance = client(status.API_URL, publishableKey);
  const result = await instance.auth.signInWithPassword({ email: account.email, password });
  return { instance, ...result };
}

try {
  const adminAccount = await createUser("admin");
  const targetAccount = await createUser("target");
  assert.match(adminAccount.id, /^[0-9a-f-]{36}$/i);
  execFileSync("docker", [
    "exec",
    "supabase_db_personal-wealth",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `update public.profiles set role = 'admin' where id = '${adminAccount.id}'::uuid`,
  ]);

  const adminLogin = await signIn(adminAccount);
  if (adminLogin.error) throw adminLogin.error;
  const targetLogin = await signIn(targetAccount);
  if (targetLogin.error) throw targetLogin.error;

  const selfDisable = await adminLogin.instance.functions.invoke("admin-users", {
    body: { action: "disable", userId: adminAccount.id },
  });
  assert.ok(selfDisable.error || selfDisable.data?.error, "An admin must not disable their own account");

  await invoke(adminLogin.instance, "disable", targetAccount.id);
  const { data: disabledProfile, error: disabledProfileError } = await service
    .from("profiles")
    .select("status,disabled_at")
    .eq("id", targetAccount.id)
    .single();
  if (disabledProfileError) throw disabledProfileError;
  assert.equal(disabledProfile.status, "disabled");
  assert.ok(disabledProfile.disabled_at);
  const disabledList = await adminLogin.instance.rpc("admin_list_users");
  if (disabledList.error) throw disabledList.error;
  assert.equal(
    disabledList.data.find((user) => user.id === targetAccount.id)?.status,
    "disabled",
    "A refreshed Admin list must show the disabled state",
  );
  const { data: activeAfterDisable, error: activeError } = await targetLogin.instance.rpc("is_active_user");
  if (activeError) throw activeError;
  assert.equal(activeAfterDisable, false);
  await targetLogin.instance.auth.signOut();
  assert.ok((await signIn(targetAccount)).error, "A disabled account must not sign in");

  await invoke(adminLogin.instance, "enable", targetAccount.id);
  const enabledLogin = await signIn(targetAccount);
  if (enabledLogin.error) throw enabledLogin.error;
  const enabledList = await adminLogin.instance.rpc("admin_list_users");
  if (enabledList.error) throw enabledList.error;
  assert.equal(
    enabledList.data.find((user) => user.id === targetAccount.id)?.status,
    "active",
    "A refreshed Admin list must show the enabled state",
  );
  const { data: activeAfterEnable, error: enabledActiveError } = await enabledLogin.instance.rpc("is_active_user");
  if (enabledActiveError) throw enabledActiveError;
  assert.equal(activeAfterEnable, true);
  const { data: asset, error: assetError } = await enabledLogin.instance
    .from("assets")
    .insert({ name: "Lifecycle asset", category: "cash", current_value: 100, liquidity_level: "high" })
    .select("id")
    .single();
  if (assetError) throw assetError;

  await invoke(adminLogin.instance, "delete", targetAccount.id);
  createdUserIds.delete(targetAccount.id);
  const { data: deletedProfiles, error: deletedProfileError } = await service
    .from("profiles")
    .select("id")
    .eq("id", targetAccount.id);
  if (deletedProfileError) throw deletedProfileError;
  assert.deepEqual(deletedProfiles, []);
  const { data: deletedAssets, error: deletedAssetError } = await service.from("assets").select("id").eq("id", asset.id);
  if (deletedAssetError) throw deletedAssetError;
  assert.deepEqual(deletedAssets, []);

  console.log("Account lifecycle smoke passed for disable, session blocking, enable, delete and cascade.");
} finally {
  await Promise.all([...createdUserIds].map((id) => service.auth.admin.deleteUser(id)));
}
