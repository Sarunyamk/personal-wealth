import assert from "node:assert/strict";
import test from "node:test";
import {
  createTimedFetch,
  createSupabaseBrowserClient,
  getSupabaseConfig,
} from "../js/data/supabase-client.js";

test("Supabase client remains disabled when production config is absent", () => {
  assert.equal(getSupabaseConfig({ supabaseUrl: null, supabasePublishableKey: null }), null);
  assert.equal(
    createSupabaseBrowserClient({
      config: { supabaseUrl: null, supabasePublishableKey: null },
      library: null,
    }),
    null,
  );
});

test("Supabase config rejects partial credentials", () => {
  assert.throws(
    () => getSupabaseConfig({ supabaseUrl: "https://example.supabase.co" }),
    /configured together/,
  );
});

test("Supabase client uses only the URL and publishable key", () => {
  const calls = [];
  const client = createSupabaseBrowserClient({
    config: {
      supabaseUrl: " https://example.supabase.co ",
      supabasePublishableKey: " publishable-key ",
    },
    library: {
      createClient(...parameters) {
        calls.push(parameters);
        return { connected: true };
      },
    },
  });
  assert.deepEqual(client, { connected: true });
  assert.equal(calls[0][0], "https://example.supabase.co");
  assert.equal(calls[0][1], "publishable-key");
  assert.equal(calls[0][2].auth.persistSession, true);
  assert.equal(typeof calls[0][2].global.fetch, "function");
});

test("Supabase fetch fails within the configured timeout", async () => {
  const hangingFetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  await assert.rejects(
    createTimedFetch(hangingFetch, 5)("https://example.supabase.co"),
    /ใช้เวลานานเกินไป/,
  );
});
