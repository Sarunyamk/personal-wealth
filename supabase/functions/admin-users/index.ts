import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function projectKey(keysName: string, legacyName: string) {
  const keys = Deno.env.get(keysName);
  if (keys) {
    const defaultKey = JSON.parse(keys)?.default;
    if (defaultKey) return defaultKey;
  }
  const legacyKey = Deno.env.get(legacyName);
  if (legacyKey) return legacyKey;
  throw new Error(`Missing ${keysName} default key`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = projectKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const serviceRoleKey = projectKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return response({ error: "Unauthorized" }, 401);
    const actorId = authData.user.id;
    const { data: actor, error: actorError } = await userClient
      .from("profiles")
      .select("role,status")
      .eq("id", actorId)
      .single();
    if (actorError) {
      console.error("Unable to read the caller profile", actorError);
      return response({ error: "Unable to verify the current profile" }, 403);
    }
    if (actor?.role !== "admin" || actor.status !== "active") {
      return response({ error: `Admin access requires an active admin profile (current: ${actor?.role ?? "missing"}/${actor?.status ?? "missing"})` }, 403);
    }

    const body = request.method === "GET" ? { action: "list" } : await request.json();
    if (body.action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: profiles, error: profileError } = await adminClient
        .from("profiles")
        .select("id,display_name,role,status,created_at,disabled_at");
      if (profileError) throw profileError;
      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return response({
        users: data.users.map((user) => ({
          id: user.id,
          email: user.email,
          emailConfirmedAt: user.email_confirmed_at,
          lastSignInAt: user.last_sign_in_at,
          createdAt: user.created_at,
          ...profilesById.get(user.id),
        })),
      });
    }

    const userId = String(body.userId ?? "");
    if (!userId) return response({ error: "userId is required" }, 400);
    if (userId === actorId && ["disable", "delete"].includes(body.action)) {
      return response({ error: "An admin cannot disable or delete their own account" }, 409);
    }
    const { data: target } = await adminClient
      .from("profiles")
      .select("role,status")
      .eq("id", userId)
      .single();
    if (!target) return response({ error: "User not found" }, 404);
    if (target.role === "admin" && ["disable", "delete"].includes(body.action)) {
      const { count } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "active");
      if ((count ?? 0) <= 1) return response({ error: "The last active admin is protected" }, 409);
    }

    if (body.action === "disable") {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) throw error;
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("id,status,disabled_at")
        .eq("id", userId)
        .single();
      if (profileError || profile?.status !== "disabled") {
        throw profileError ?? new Error("Profile did not synchronize to disabled");
      }
      return response({ ok: true, user: profile });
    }

    if (body.action === "enable") {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (error) throw error;
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("id,status,disabled_at")
        .eq("id", userId)
        .single();
      if (profileError || profile?.status !== "active") {
        throw profileError ?? new Error("Profile did not synchronize to active");
      }
      return response({ ok: true, user: profile });
    }

    if (body.action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(userId, false);
      if (error) throw error;
      return response({ ok: true });
    }
    return response({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error(error);
    return response({ error: "Admin operation failed" }, 500);
  }
});
