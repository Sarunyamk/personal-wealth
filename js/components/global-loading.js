export function createGlobalLoadingController(root = document, minimumVisibleMs = 300) {
  const overlay = root.querySelector("[data-global-loading]");
  if (!overlay) throw new Error("Global loading overlay is missing.");
  const label = overlay.querySelector("[data-global-loading-label]");
  let pending = 0;
  let visibleAt = 0;
  let hideTimer;

  function setActive(active, message) {
    overlay.hidden = !active;
    if (active && message) label.textContent = message;
    root.querySelectorAll(".app-shell, .auth-shell").forEach((element) => {
      element.inert = active;
      if (active) element.setAttribute("aria-busy", "true");
      else element.removeAttribute("aria-busy");
    });
  }

  return Object.freeze({
    begin(message = "กำลังโหลดข้อมูล") {
      clearTimeout(hideTimer);
      pending += 1;
      if (overlay.hidden) visibleAt = Date.now();
      setActive(true, message);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        pending = Math.max(0, pending - 1);
        if (pending > 0) return;
        const remaining = Math.max(0, minimumVisibleMs - (Date.now() - visibleAt));
        hideTimer = setTimeout(() => {
          if (pending === 0) setActive(false);
        }, remaining);
      };
    },
    get pending() { return pending; },
  });
}

let controller;
function globalController() {
  controller ??= createGlobalLoadingController();
  return controller;
}

export function beginGlobalLoading(message) {
  return globalController().begin(message);
}

export async function trackGlobalLoading(promise, message) {
  const release = beginGlobalLoading(message);
  try { return await promise; }
  finally { release(); }
}

export function trackAsyncService(service, message = "กำลังโหลดข้อมูล", tracker = trackGlobalLoading) {
  if (!service) return service;
  return Object.freeze(Object.fromEntries(Object.entries(service).map(([property, value]) => [
    property,
    typeof value !== "function" ? value : (...args) => {
      const result = value.apply(service, args);
      return result instanceof Promise ? tracker(result, message) : result;
    },
  ])));
}
