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
        <button class="button" type="button" data-transaction-open>${icon("plus")}เพิ่มรายการ</button></section>`;

  return `<header class="page__header monthly-header"><div><p class="page__eyebrow">Monthly Finance</p>
      <h2 class="page__title">รายการรายเดือน</h2></div>
      <div class="monthly-header__actions"><label class="visually-hidden" for="finance-month">เลือกเดือน</label>
        <input class="field__input month-input" id="finance-month" type="month" value="${month}" data-finance-month />
        <button class="button" type="button" data-transaction-open>${icon("plus")}เพิ่มรายการ</button></div></header>
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
      <button class="button button--secondary" type="button" data-budget-open>${icon("plus")}เพิ่มแผน</button></header>
      ${
        budgetComparison.length
          ? `<div class="card budget-table" role="table" aria-label="แผนเทียบยอดจริง">
            <div class="budget-row budget-row--head" role="row"><span>หมวด</span><span>แผน</span><span>จริง</span><span>ต่าง</span></div>
            ${budgetComparison
              .map(
                (item) => `<button class="budget-row" type="button" role="row" data-budget-open data-type="${item.type}" data-category="${escapeHtml(item.category)}">
                  <span><strong>${escapeHtml(item.category)}</strong><small>${TYPE_LABELS[item.type]}</small></span>
                  <span>${amount(item.plannedAmount, isPrivate)}</span><span>${amount(item.actualAmount, isPrivate)}</span>
                  <span class="${item.variance < 0 ? "budget-negative" : "budget-positive"}">${amount(item.variance, isPrivate)}</span></button>`,
              )
              .join("")}</div>`
          : `<div class="card budget-empty"><p>ยังไม่มีแผนสำหรับเดือนนี้</p><button class="button button--secondary" type="button" data-budget-open>วางแผนหมวดแรก</button></div>`
      }</section>
    ${transactionList}`;
}
