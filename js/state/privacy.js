const STORAGE_KEY = "wealth:privacy-mode";
export const MASKED_AMOUNT = "฿••••••";

export function createPrivacyState(storage = window.localStorage, defaultValue = false) {
  const storedValue = storage.getItem(STORAGE_KEY);
  let isPrivate = storedValue === null ? Boolean(defaultValue) : storedValue === "true";
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(isPrivate));
  }

  return Object.freeze({
    get value() {
      return isPrivate;
    },
    toggle() {
      isPrivate = !isPrivate;
      storage.setItem(STORAGE_KEY, String(isPrivate));
      notify();
      return isPrivate;
    },
    set(value) {
      isPrivate = Boolean(value);
      storage.setItem(STORAGE_KEY, String(isPrivate));
      notify();
      return isPrivate;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export function presentAmount(formattedAmount, isPrivate) {
  return isPrivate ? MASKED_AMOUNT : formattedAmount;
}
