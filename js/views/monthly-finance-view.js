import { formatCurrency, formatDate, formatPercent } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";
import { presentAmount } from "../state/privacy.js";

const TYPE_LABELS = Object.freeze({ income: "รายรับ", expense: "รายจ่าย", transfer: "เงินออม/ลงทุน" });

function icon(name) {
  return `<span data-icon="${name}"></span>`;
}

function amount(value, isPrivate) {
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-value="${formatted}">${presentAmount(
    formatted,
    isPrivate,
  )}</span>`;
}

export function renderMonthlyFinanceLoading() {
  return `<header class="page__header"><div><p class="page__eyebrow">Monthly Finance</p>
    <h2 class="page__title">รายการรายเดือน</h2></div></header>
    <section class="monthly-summary" aria-label="กำลังโหลดข้อมูล">
      ${Array.from({ length: 4 }, () => `<div class="card monthly-stat"><span class="skeleton"></span><span class="skeleton"></span></div>`).join("")}
    </section>`;
}

export function renderMonthlyFinanceError() {
  return `<section class="card empty-state"><span class="empty-state__icon">${icon("triangle-alert")}</span>
    <h2>โหลดรายการไม่สำเร็จ</h2><p>ข้อมูลเดิมยังไม่ถูกเปลี่ยนแปลง</p>
    <button class="button" type="button" data-monthly-retry>ลองใหม่</button></section>`;
}

export function renderMonthlyFinanceView({ data, isPrivate }) {
  const { month, summary, transactions, budgetComparison = [] } = data;
  const isClosed = data.monthlyRecord?.status === "closed";
  const reconciliation = data.monthlyRecord?.reconciliation;
  const reconciliationAsset = data.reconciliationAssets?.find(
    (asset) => asset.id === reconciliation?.assetId,
  );
  const stats = [
    ["รายรับ", summary.income, "income"],
    ["รายจ่าย", summary.expense, "expense"],
    ["คงเหลือ", summary.savings, "savings"],
    ["เงินออม/ลงทุน", summary.transfers, "transfer"],
  ];
  const transactionList = transactions.length
    ? `<div class="transaction-list">${transactions
        .map(
          (transaction) => `<article class="card transaction-row">
            <span class="transaction-row__type transaction-row__type--${transaction.type}" aria-hidden="true">${icon(
              transaction.type === "income" ? "arrow-down-left" : transaction.type === "expense" ? "arrow-up-right" : "repeat-2",
            )}</span>
            <div class="transaction-row__identity"><strong>${escapeHtml(transaction.name)}</strong>
              <span>${escapeHtml(transaction.category)} · ${formatDate(transaction.transactionDate)}</span></div>
            <div class="transaction-row__amount"><strong>${amount(transaction.amount, isPrivate)}</strong>
              <span>${TYPE_LABELS[transaction.type]}</span></div>
            <button class="icon-button" type="button" data-transaction-archive="${transaction.id}" aria-label="เก็บ ${escapeHtml(
              transaction.name,
            )} เข้าคลัง">${icon("archive")}</button>
          </article>`,
        )
        .join("")}</div>`
    : `<section class="card empty-state monthly-empty"><span class="empty-state__icon">${icon("receipt-text")}</span>
        <h2>ยังไม่มีรายการในเดือนนี้</h2><p>เพิ่มรายรับ รายจ่าย หรือการโอนไปออมและลงทุน</p>
        <button class="button" type="button" data-transaction-open ${isClosed ? "disabled" : ""}>${icon("plus")}เพิ่มรายการ</button></section>`;

  return `<header class="page__header monthly-header"><div><p class="page__eyebrow">Monthly Finance</p>
      <h2 class="page__title">รายการรายเดือน</h2></div>
      <div class="monthly-header__actions"><label class="visually-hidden" for="finance-month">เลือกเดือน</label>
        <input class="field__input month-input" id="finance-month" type="month" value="${month}" data-finance-month />
        <span class="month-status month-status--${isClosed ? "closed" : "draft"}">${isClosed ? "Closed" : "Draft"}</span>
        <button class="button" type="button" data-transaction-open ${isClosed ? "disabled" : ""}>${icon("plus")}เพิ่มรายการ</button></div></header>
    <section class="monthly-summary" aria-label="สรุปรายเดือน">${stats
      .map(
        ([label, value, kind]) => `<article class="card monthly-stat monthly-stat--${kind}">
          <span>${label}</span><strong>${amount(value, isPrivate)}</strong></article>`,
      )
      .join("")}</section>
    <div class="monthly-meta"><p>${summary.transactionCount} รายการ</p>
      <p>อัตราออม <strong>${summary.savingsRate === null ? "-" : formatPercent(summary.savingsRate)}</strong></p></div>
    <section class="budget-section"><header class="budget-section__header"><div>
      <h3>แผนเทียบยอดจริง</h3><p>Actual คำนวณจากรายการในเดือนนี้</p></div>
      <button class="button button--secondary" type="button" data-budget-open ${isClosed ? "disabled" : ""}>${icon("plus")}เพิ่มแผน</button></header>
      ${
        budgetComparison.length
          ? `<div class="card budget-table" aria-label="แผนเทียบยอดจริง">
            <div class="budget-row budget-row--head"><span>หมวด</span><span>แผน</span><span>จริง</span><span>ต่าง</span></div>
            ${budgetComparison
              .map(
                (item) => `<button class="budget-row" type="button" data-budget-open data-type="${item.type}" data-category="${escapeHtml(item.category)}" ${isClosed ? "disabled" : ""}>
                  <span><strong>${escapeHtml(item.category)}</strong><small>${TYPE_LABELS[item.type]}</small></span>
                  <span>${amount(item.plannedAmount, isPrivate)}</span><span>${amount(item.actualAmount, isPrivate)}</span>
                  <span class="${item.variance < 0 ? "budget-negative" : "budget-positive"}">${amount(item.variance, isPrivate)}</span></button>`,
              )
              .join("")}</div>`
          : `<div class="card budget-empty"><p>ยังไม่มีแผนสำหรับเดือนนี้</p><button class="button button--secondary" type="button" data-budget-open ${isClosed ? "disabled" : ""}>วางแผนหมวดแรก</button></div>`
      }</section>
    <section class="month-close card"><div><strong>รายการประจำ ${data.recurringTransactions?.length ?? 0} รายการ</strong>
      <p>${isClosed ? "เดือนนี้ถูกปิดและสร้าง snapshot แล้ว" : "รายการประจำจะถูกเพิ่มเมื่อปิดเดือน"}</p></div>
      <div class="month-close__actions"><button class="button button--secondary" type="button" data-recurring-open ${isClosed ? "disabled" : ""}>${icon("repeat-2")}รายการประจำ</button>
        <button class="button" type="button" data-month-status="${isClosed ? "draft" : "closed"}">${isClosed ? "Reopen Month" : "Close Month"}</button></div></section>
    ${
      data.recurringTransactions?.length
        ? `<section class="recurring-list" aria-label="รายการประจำ">${data.recurringTransactions
            .map(
              (item) => `<article class="card recurring-row"><div><strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.category)} · ทุกวันที่ ${item.dayOfMonth}</span></div>
                <strong>${amount(item.amount, isPrivate)}</strong>
                <button class="icon-button" type="button" data-recurring-archive="${item.id}" aria-label="ปิดใช้งาน ${escapeHtml(item.name)}">${icon("archive")}</button></article>`,
            )
            .join("")}</section>`
        : ""
    }
    <section class="allocation-section"><header><div><h3>การจัดสรรเงินออม/ลงทุน</h3><p>คำนวณจาก Transfer ในเดือนนี้</p></div></header>
      ${
        data.transferAllocation?.length
          ? `<div class="card allocation-list">${data.transferAllocation
              .map(
                (item) => `<div class="allocation-row"><div><strong>${escapeHtml(item.category)}</strong><span>${formatPercent(item.percentage)}</span></div>
                  <strong>${amount(item.amount, isPrivate)}</strong><div class="allocation-bar"><span style="width:${item.percentage}%"></span></div></div>`,
              )
              .join("")}</div>`
          : `<div class="card budget-empty"><p>ยังไม่มี Transfer สำหรับเดือนนี้</p></div>`
      }</section>
    <section class="reconciliation card"><div><h3>ตรวจยอดเงินสดปลายเดือน</h3>
      ${
        reconciliation
          ? `<p>${escapeHtml(reconciliationAsset?.name ?? "Asset ที่เก็บไว้")} · ยอดปิด ${amount(reconciliation.closingCash, isPrivate)}</p>
            <strong class="${Math.abs(reconciliation.difference) < 0.005 ? "budget-positive" : "budget-negative"}">ส่วนต่าง ${amount(reconciliation.difference, isPrivate)}</strong>`
          : `<p>${data.reconciliationAssets?.length ? "ยังไม่ได้ตรวจยอดเดือนนี้" : "เพิ่ม Cash หรือ Bank Asset ก่อนตรวจยอด"}</p>`
      }</div><button class="button button--secondary" type="button" data-reconciliation-open ${isClosed || !data.reconciliationAssets?.length ? "disabled" : ""}>${icon("scale")}ตรวจยอด</button></section>
    ${transactionList}`;
}
