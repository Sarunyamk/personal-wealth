import { formatCurrency, formatPercent } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";
import { presentAmount } from "../state/privacy.js";

function icon(name) { return `<span data-icon="${name}"></span>`; }
function amount(value, isPrivate) {
  if (value === null) return "-";
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-value="${formatted}">${presentAmount(formatted, isPrivate)}</span>`;
}
function monthLabel(month) {
  return new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export function renderAnnualReportLoading() {
  return `<header class="page__header"><div><p class="page__eyebrow">Annual Report</p><h2 class="page__title">ภาพรวมรายปี</h2></div></header>
    <div class="report-summary">${Array.from({ length: 4 }, () => `<div class="card report-stat"><span class="skeleton"></span><span class="skeleton"></span></div>`).join("")}</div>`;
}

export function renderAnnualReportError() {
  return `<section class="card empty-state" role="alert"><span class="empty-state__icon">${icon("triangle-alert")}</span>
    <h2>โหลดรายงานไม่สำเร็จ</h2><p>ลองเลือกปีหรือโหลดข้อมูลอีกครั้ง</p><button class="button" type="button" data-report-retry>ลองใหม่</button></section>`;
}

export function renderAnnualReportView({ data, isPrivate }) {
  const empty = data.activeMonths === 0 && data.snapshots.length === 0;
  if (empty) return `<header class="page__header report-header"><div><p class="page__eyebrow">Annual Report</p><h2 class="page__title">ภาพรวมรายปี</h2></div>
    <input class="field__input year-input" type="number" min="1900" max="9999" value="${data.year}" data-report-year aria-label="เลือกปี" /></header>
    <section class="card empty-state"><span class="empty-state__icon">${icon("chart-no-axes-combined")}</span><h2>ยังไม่มีข้อมูลในปี ${data.year}</h2><p>เพิ่มรายการรายเดือนหรือ Net Worth snapshot เพื่อเริ่มรายงาน</p></section>`;
  const stats = [
    ["รายรับทั้งปี", data.totals.income], ["รายจ่ายทั้งปี", data.totals.expense],
    ["เงินคงเหลือ", data.totals.savings], ["เงินออม/ลงทุน", data.totals.transfers],
  ];
  return `<header class="page__header report-header"><div><p class="page__eyebrow">Annual Report</p><h2 class="page__title">ภาพรวมปี ${data.year}</h2></div>
      <div class="report-actions"><input class="field__input year-input" type="number" min="1900" max="9999" value="${data.year}" data-report-year aria-label="เลือกปี" />
        <button class="button button--secondary" type="button" data-report-export>${icon("download")}CSV</button></div></header>
    ${data.activeMonths < 12 ? `<p class="report-partial">มีข้อมูลรายการ ${data.activeMonths} จาก 12 เดือน</p>` : ""}
    <section class="report-summary" aria-label="สรุปรายปี">${stats.map(([label, value]) => `<article class="card report-stat"><span>${label}</span><strong>${amount(value, isPrivate)}</strong></article>`).join("")}</section>
    <section class="net-worth-points"><div><span>Opening Net Worth</span><strong>${amount(data.openingNetWorth, isPrivate)}</strong></div>
      <div><span>Closing Net Worth</span><strong>${amount(data.closingNetWorth, isPrivate)}</strong></div>
      <div><span>การเติบโต</span><strong>${amount(data.netWorthGrowth, isPrivate)}</strong></div>
      <div><span>อัตราออม</span><strong>${data.totals.savingsRate === null ? "-" : formatPercent(data.totals.savingsRate)}</strong></div></section>
    <section class="report-charts"><article class="card report-chart"><h3>Cash Flow รายเดือน</h3><div class="report-chart__frame"><canvas data-annual-cashflow-chart role="img" aria-label="กราฟรายรับและรายจ่ายรายเดือน"></canvas></div></article>
      <article class="card report-chart"><h3>Net Worth Trend</h3><div class="report-chart__frame">${data.snapshots.length ? `<canvas data-annual-networth-chart role="img" aria-label="กราฟ Net Worth รายปี"></canvas>` : `<div class="panel-empty">ยังไม่มี Snapshot ในปีนี้</div>`}</div></article></section>
    <section class="report-details"><article><h3>ค่าเฉลี่ยต่อเดือนที่มีข้อมูล</h3><dl class="report-averages"><div><dt>รายรับ</dt><dd>${amount(data.averages.income, isPrivate)}</dd></div><div><dt>รายจ่าย</dt><dd>${amount(data.averages.expense, isPrivate)}</dd></div><div><dt>คงเหลือ</dt><dd>${amount(data.averages.savings, isPrivate)}</dd></div></dl></article>
      <article><h3>หมวดรายจ่ายสูงสุด</h3>${data.expenseCategories.length ? `<div class="expense-breakdown"><div class="expense-chart-frame"><canvas data-annual-expense-chart role="img" aria-label="กราฟหมวดรายจ่าย"></canvas></div><ol class="expense-ranking">${data.expenseCategories.slice(0, 5).map((item) => `<li><span>${escapeHtml(item.category)}</span><strong>${amount(item.amount, isPrivate)}</strong></li>`).join("")}</ol></div>` : `<p class="report-muted">ยังไม่มีรายจ่าย</p>`}</article></section>
    <section class="annual-table-wrap card" tabindex="0" aria-label="ตารางสรุปรายเดือน เลื่อนแนวนอนเพื่อดูข้อมูลทั้งหมด"><table class="annual-table"><thead><tr><th>เดือน</th><th>รายรับ</th><th>รายจ่าย</th><th>คงเหลือ</th><th>ออม/ลงทุน</th></tr></thead><tbody>${data.months.map((month) => `<tr><th>${monthLabel(month.month)}</th><td>${amount(month.income, isPrivate)}</td><td>${amount(month.expense, isPrivate)}</td><td>${amount(month.savings, isPrivate)}</td><td>${amount(month.transfers, isPrivate)}</td></tr>`).join("")}</tbody></table></section>`;
}
