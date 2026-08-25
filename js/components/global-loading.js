export function createGlobalLoadingController(root = document) {
  const overlay = root.querySelector("[data-global-loading]");
  if (!overlay) throw new Error("Global loading overlay is missing.");
  const label = overlay.querySelector("[data-global-loading-label]");
  let pending = 0;

  function update(message) {
    const active = pending > 0;
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
      pending += 1;
      update(message);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        pending = Math.max(0, pending - 1);
        update();
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
