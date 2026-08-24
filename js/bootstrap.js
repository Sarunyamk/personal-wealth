import { DEMO_SEED } from "./data/seed.js";
import { createLocalStorageWealthRepository } from "./repositories/local-storage-wealth-repository.js";
import { createSupabaseWealthRepository } from "./repositories/supabase-wealth-repository.js";
import { createWealthService } from "./services/wealth-service.js";
import { createOnboardingState } from "./state/onboarding.js";

export function createAppServices({ storage = window.localStorage } = {}) {
  const wealthRepository = globalThis.__SUPABASE_CLIENT__
    ? createSupabaseWealthRepository(globalThis.__SUPABASE_CLIENT__)
    : createLocalStorageWealthRepository({ storage, seed: DEMO_SEED });
  return Object.freeze({
    wealth: createWealthService(wealthRepository),
    onboarding: createOnboardingState(storage),
  });
}
