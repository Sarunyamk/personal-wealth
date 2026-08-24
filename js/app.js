import { getDemoSummary } from "./services/demo-summary.js";
import { formatCurrency } from "./utils/formatters.js";

const statusElement = document.querySelector("[data-app-status]");

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

try {
  const summary = getDemoSummary();
  setText('[data-summary="assets"]', formatCurrency(summary.totalAssets));
  setText('[data-summary="liabilities"]', formatCurrency(summary.totalLiabilities));
  setText('[data-summary="net-worth"]', formatCurrency(summary.netWorth));

  if (statusElement) statusElement.textContent = "Foundation loaded — พร้อมเริ่ม Phase 1";
} catch (error) {
  if (statusElement) {
    statusElement.textContent = "ไม่สามารถโหลดข้อมูลตัวอย่างได้";
    statusElement.dataset.state = "error";
  }
  console.error(error);
}
