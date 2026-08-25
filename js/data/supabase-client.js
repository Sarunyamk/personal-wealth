export function getSupabaseConfig(config = globalThis.__APP_CONFIG__) {
  const supabaseUrl = config?.supabaseUrl?.trim() || null;
  const supabasePublishableKey = config?.supabasePublishableKey?.trim() || null;
  if (!supabaseUrl && !supabasePublishableKey) return null;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase URL and publishable key must be configured together.");
  }
  return Object.freeze({ supabaseUrl, supabasePublishableKey });
}

export function createTimedFetch(fetchImplementation = globalThis.fetch, timeoutMs = 15_000) {
  if (typeof fetchImplementation !== "function") throw new TypeError("A fetch implementation is required.");
  return async function timedFetch(input, init = {}) {
    const controller = new AbortController();
    const upstreamSignal = init.signal;
    const abortFromUpstream = () => controller.abort(upstreamSignal.reason);
    if (upstreamSignal?.aborted) abortFromUpstream();
    else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      return await fetchImplementation(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new Error("การเชื่อมต่อ Supabase ใช้เวลานานเกินไป กรุณาลองใหม่", { cause: error });
      throw error;
    } finally {
      clearTimeout(timer);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    }
  };
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
    global: { fetch: createTimedFetch(globalThis.fetch) },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
