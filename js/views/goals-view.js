import { calculateGoalPercentage } from "../domain/calculators.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";
import { presentAmount } from "../state/privacy.js";

function icon(name) { return `<span data-icon="${name}"></span>`; }
function amount(value, isPrivate) {
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-value="${formatted}">${presentAmount(formatted, isPrivate)}</span>`;
}

function goalCard(goal, isPrivate) {
  const progress = calculateGoalPercentage(goal.currentAmount, goal.targetAmount);
  return `<article class="card goal-card ${goal.isCompleted ? "goal-card--completed" : ""}">
    <header><div><h3>${escapeHtml(goal.name)}</h3><p>เป้าหมาย ${formatDate(goal.targetDate)}</p></div>
      ${goal.isCompleted ? `<span class="goal-complete-badge">สำเร็จแล้ว</span>` : `<strong>${progress.toFixed(0)}%</strong>`}</header>
    <div class="progress" role="progressbar" aria-label="ความคืบหน้า ${escapeHtml(goal.name)}" aria-valuenow="${progress.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><div class="progress__bar" style="width:${progress}%"></div></div>
    <p class="goal-card__amount">${amount(goal.currentAmount, isPrivate)} <span>จาก ${amount(goal.targetAmount, isPrivate)}</span></p>
    <footer><button class="icon-button" type="button" data-goal-action="edit" data-id="${goal.id}" aria-label="แก้ไข ${escapeHtml(goal.name)}">${icon("pencil")}</button>
      <button class="icon-button" type="button" data-goal-action="history" data-id="${goal.id}" aria-label="ประวัติ ${escapeHtml(goal.name)}">${icon("history")}</button>
      ${goal.isCompleted ? "" : `<button class="button button--secondary" type="button" data-goal-action="contribute" data-id="${goal.id}">${icon("plus")}เพิ่มเงิน</button><button class="icon-button" type="button" data-goal-action="complete" data-id="${goal.id}" aria-label="ทำ ${escapeHtml(goal.name)} ให้สำเร็จ">${icon("check")}</button>`}</footer>
  </article>`;
}

export function renderGoalsView({ goals, isPrivate }) {
  const active = goals.filter((goal) => !goal.isCompleted);
  const completed = goals.filter((goal) => goal.isCompleted);
  return `<header class="page__header"><div><p class="page__eyebrow">Financial Goals</p><h2 class="page__title">เป้าหมายของคุณ</h2></div>
    <button class="button" type="button" data-goal-open>${icon("plus")}เพิ่ม Goal</button></header>
    ${goals.length === 0 ? `<section class="card empty-state"><span class="empty-state__icon">${icon("goal")}</span><h2>เริ่มเป้าหมายแรก</h2><p>กำหนดยอดและวันที่เพื่อวางแผนความคืบหน้า</p><button class="button" type="button" data-goal-open>เพิ่ม Goal</button></section>` : `
      <section class="goal-section"><header><h3>กำลังดำเนินการ</h3><span>${active.length}</span></header>${active.length ? `<div class="goal-grid">${active.map((goal) => goalCard(goal, isPrivate)).join("")}</div>` : `<div class="card goal-section__empty">ไม่มีเป้าหมายที่กำลังทำ</div>`}</section>
      ${completed.length ? `<section class="goal-section"><header><h3>สำเร็จแล้ว</h3><span>${completed.length}</span></header><div class="goal-grid">${completed.map((goal) => goalCard(goal, isPrivate)).join("")}</div></section>` : ""}`}
  `;
}
