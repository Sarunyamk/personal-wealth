import { DEMO_SEED } from "./data/seed.js";
import { createLocalStorageWealthRepository } from "./repositories/local-storage-wealth-repository.js";
import { createSupabaseWealthRepository } from "./repositories/supabase-wealth-repository.js";
import { createWealthService } from "./services/wealth-service.js";
import { createOnboardingState } from "./state/onboarding.js";
import { createAdminService } from "./services/admin-service.js";
import { createSettingsService } from "./services/settings-service.js";

export function selectWealthRepository({ supabaseClient, allowLocalDemo = false, storage } = {}) {
  if (supabaseClient) return createSupabaseWealthRepository(supabaseClient);
  if (allowLocalDemo) return createLocalStorageWealthRepository({ storage, seed: DEMO_SEED });
  throw new Error("A Supabase data source is required outside explicit local demo mode.");
}

export function createAppServices({ storage = window.localStorage } = {}) {
  const wealthRepository = selectWealthRepository({
    supabaseClient: globalThis.__SUPABASE_CLIENT__,
    allowLocalDemo: globalThis.__ALLOW_LOCAL_DEMO__ === true,
    storage,
  });
  return Object.freeze({
    wealth: createWealthService(wealthRepository),
    onboarding: createOnboardingState(storage),
    admin:
      globalThis.__CURRENT_PROFILE__?.role === "admin" && globalThis.__SUPABASE_CLIENT__
        ? createAdminService(globalThis.__SUPABASE_CLIENT__)
        : null,
    settings: globalThis.__SUPABASE_CLIENT__
      ? createSettingsService(globalThis.__SUPABASE_CLIENT__)
      : null,
  });
}
