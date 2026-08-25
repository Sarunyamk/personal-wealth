import assert from "node:assert/strict";
import { execSync } from "node:child_process";
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

const status = localStatus();
const admin = client(status.API_URL, status.SERVICE_ROLE_KEY || status.SECRET_KEY);
const emailSuffix = `${Date.now()}@example.test`;
const password = "Rls-smoke-password-1";
const createdUserIds = [];

async function createTestUser(label) {
  const email = `rls-${label}-${emailSuffix}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const signedIn = client(status.API_URL, status.PUBLISHABLE_KEY || status.ANON_KEY);
  const { error: signInError } = await signedIn.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return signedIn;
}

try {
  const userA = await createTestUser("a");
  const userB = await createTestUser("b");

  const { data: asset, error: createError } = await userA
    .from("assets")
    .insert({ name: "RLS private asset", category: "cash", current_value: 1000, liquidity_level: "high" })
    .select("id,name")
    .single();
  if (createError) throw createError;

  const { data: leakedRows, error: selectError } = await userB.from("assets").select("id").eq("id", asset.id);
  if (selectError) throw selectError;
  assert.deepEqual(leakedRows, [], "User B must not read User A's asset");

  const { data: updatedRows, error: updateError } = await userB
    .from("assets")
    .update({ name: "Cross-account update" })
    .eq("id", asset.id)
    .select("id");
  if (updateError) throw updateError;
  assert.deepEqual(updatedRows, [], "User B must not update User A's asset");

  const { error: rpcError } = await userB.rpc("record_asset_value", {
    p_asset_id: asset.id,
    p_value: 2000,
    p_recorded_at: new Date().toISOString(),
  });
  assert.ok(rpcError, "User B must not mutate User A's asset through an RPC");

  const { data: ownerAsset, error: ownerError } = await userA.from("assets").select("name").eq("id", asset.id).single();
  if (ownerError) throw ownerError;
  assert.equal(ownerAsset.name, "RLS private asset");

  const userAId = createdUserIds[0];
  const { error: deleteError } = await admin.auth.admin.deleteUser(userAId);
  if (deleteError) throw deleteError;
  createdUserIds.shift();
  const { data: orphan, error: cascadeError } = await admin.from("assets").select("id").eq("id", asset.id);
  if (cascadeError) throw cascadeError;
  assert.deepEqual(orphan, [], "Deleting an Auth user must cascade to owned assets");

  console.log("RLS isolation smoke passed for two local users, direct mutation and delete cascade.");
} finally {
  await Promise.all(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
}
