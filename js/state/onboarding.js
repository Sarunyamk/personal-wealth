export const ONBOARDING_STORAGE_KEY = "personal-wealth:onboarding";
export const ONBOARDING_STEPS = Object.freeze(["asset", "debt", "goal"]);

function readState(storage) {
  try {
    const value = JSON.parse(storage.getItem(ONBOARDING_STORAGE_KEY));
    if (value?.completed === true) return { stepIndex: 3, completed: true };
    if (Number.isInteger(value?.stepIndex) && value.stepIndex >= 0 && value.stepIndex < 3) {
      return { stepIndex: value.stepIndex, completed: false };
    }
  } catch {
    // Invalid onboarding state is safe to restart because it contains no financial data.
  }
  return { stepIndex: 0, completed: false };
}

export function createOnboardingState(storage) {
  if (!storage) throw new TypeError("Storage is required.");
  let state = readState(storage);
  const persist = () => storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  const value = () => Object.freeze({ ...state, step: ONBOARDING_STEPS[state.stepIndex] ?? null });
  const advance = () => {
    const nextIndex = state.stepIndex + 1;
    state = nextIndex >= ONBOARDING_STEPS.length
      ? { stepIndex: ONBOARDING_STEPS.length, completed: true }
      : { stepIndex: nextIndex, completed: false };
    persist();
    return value();
  };

  return Object.freeze({
    get value() { return value(); },
    advance,
    skipDebt() {
      if (ONBOARDING_STEPS[state.stepIndex] !== "debt") {
        throw new Error("Only the debt step can be skipped.");
      }
      return advance();
    },
    complete() {
      state = { stepIndex: ONBOARDING_STEPS.length, completed: true };
      persist();
      return value();
    },
    reset() {
      state = { stepIndex: 0, completed: false };
      persist();
      return value();
    },
  });
}
