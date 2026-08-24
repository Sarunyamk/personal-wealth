export function getSupabaseConfig(config = globalThis.__APP_CONFIG__) {
  const supabaseUrl = config?.supabaseUrl?.trim() || null;
  const supabasePublishableKey = config?.supabasePublishableKey?.trim() || null;
  if (!supabaseUrl && !supabasePublishableKey) return null;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase URL and publishable key must be configured together.");
  }
  return Object.freeze({ supabaseUrl, supabasePublishableKey });
}

export function createSupabaseBrowserClient({
  config = globalThis.__APP_CONFIG__,
  library = globalThis.supabase,
} = {}) {
  const values = getSupabaseConfig(config);
  if (!values) return null;
  if (typeof library?.createClient !== "function") {
    throw new Error("The Supabase browser client could not be loaded.");
  }
  return library.createClient(values.supabaseUrl, values.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
