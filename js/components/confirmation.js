export function requestConfirmation({
  title = "ยืนยันการทำรายการ",
  message,
  confirmLabel = "ยืนยัน",
} = {}) {
  const dialog = document.querySelector("[data-confirm-dialog]");
  if (!dialog) return Promise.resolve(false);

  dialog.querySelector("[data-confirm-title]").textContent = title;
  dialog.querySelector("[data-confirm-message]").textContent = message ?? "";
  dialog.querySelector("[data-confirm-action]").textContent = confirmLabel;
  dialog.showModal();

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), {
      once: true,
    });
  });
}
