export function showToast(message, { duration = 3000 } = {}) {
  const region = document.querySelector("[data-toast-region]");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), duration);
}
