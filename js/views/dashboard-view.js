import { calculateGoalPercentage } from "../domain/calculators.js";
import { formatCurrency, formatDate, formatPercent } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";

function icon(name) {
  return `<span data-icon="${name}"></span>`;
}

function amount(value, isPrivate, label = "ยอดเงิน") {
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-count-up data-number="${value}" data-value="${formatted}" aria-label="${label}">${
    isPrivate ? "฿••••••" : formatted
  }</span>`;
}

function signedChange(change, isPrivate) {
  if (change.amount === null) return `<span>ยังไม่มีข้อมูลเดือนก่อน</span>`;
  const positive = change.amount >= 0;
  const formatted = formatCurrency(Math.abs(change.amount));
  const value = isPrivate ? "฿••••••" : `${positive ? "+" : "-"}${formatted}`;
  const percentage =
    change.percentage === null ? "" : ` (${formatPercent(Math.abs(change.percentage))})`;
  return `${icon(positive ? "trending-up" : "trending-down")}<span>${value}${percentage} this month</span>`;
}

function metricCard(label, value, iconName, modifier, meta, isPrivate) {
  return `<article class="card metric-card metric-card--${modifier}">
    <div class="metric-card__header"><p class="metric-card__label">${label}</p>
      <span class="metric-card__icon">${icon(iconName)}</span></div>
    <p class="metric-card__value">${amount(value, isPrivate, label)}</p>
    <p class="metric-card__meta">${meta}</p>
  </article>`;
}

function goalsPanel(goals, isPrivate) {
  const visibleGoals = goals.filter((goal) => !goal.isCompleted).slice(0, 3);
  return `<article class="card dashboard-panel goals-panel">
    <header class="panel-header"><div><h2>Goals</h2><p>เป้าหมายที่กำลังทำ</p></div>
      <a href="#goals" aria-label="ดู Goals ทั้งหมด">${icon("chevron-right")}</a></header>
    ${
      visibleGoals.length === 0
        ? `<div class="panel-empty">ยังไม่มีเป้าหมาย</div>`
        : `<div class="goal-list">${visibleGoals
            .map((goal) => {
              const progress = calculateGoalPercentage(goal.currentAmount, goal.targetAmount);
              return `<div class="goal-row"><div class="goal-row__header"><strong>${escapeHtml(
                goal.name,
              )}</strong><span>${progress.toFixed(0)}%</span></div>
                <div class="progress" role="progressbar" aria-label="${escapeHtml(
                  goal.name,
                )}" aria-valuenow="${progress.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress__bar" style="width:${progress}%"></div></div>
                <p>${amount(goal.currentAmount, isPrivate)} / ${amount(
                  goal.targetAmount,
                  isPrivate,
                )}</p></div>`;
            })
            .join("")}</div>`
    }
  </article>`;
}

function healthPanel(health) {
  const ratio = (value) => (value === null ? "N/A" : formatPercent(value * 100));
  return `<article class="card dashboard-panel health-panel">
    <header class="panel-header"><div><h2>Financial Health</h2><p>Personal finance indicator</p></div></header>
    <div class="health-score"><strong>${health.score ?? "-"}</strong><span>/100</span>
      <p>${health.status}</p></div>
    <dl class="health-metrics">
      <div><dt>Debt ratio</dt><dd>${ratio(health.debtRatio)}</dd></div>
      <div><dt>Liquidity</dt><dd>${ratio(health.liquidityRatio)}</dd></div>
      <div><dt>Emergency fund</dt><dd>N/A</dd></div>
      <div><dt>Savings rate</dt><dd>N/A</dd></div>
    </dl>
  </article>`;
}

function activityPanel(activities, isPrivate) {
  const actionLabels = {
    asset_created: "เพิ่ม Asset",
    asset_updated: "แก้ไขข้อมูล",
    asset_value_updated: "อัปเดตมูลค่า",
    asset_deactivated: "ปิดใช้งาน",
    liability_created: "เพิ่ม Liability",
    liability_updated: "แก้ไขข้อมูล",
    liability_balance_updated: "อัปเดตยอดหนี้",
    liability_deactivated: "ปิดใช้งาน",
    snapshot_created: "สร้าง Snapshot",
    snapshot_updated: "อัปเดต Snapshot",
  };
  return `<section class="recent-activity" aria-labelledby="activity-title">
    <header class="panel-header"><div><h2 id="activity-title">Recent Activity</h2>
      <p>รายการเปลี่ยนแปลงล่าสุด</p></div></header>
    ${
      activities.length === 0
        ? `<div class="card panel-empty">ยังไม่มีกิจกรรมล่าสุด</div>`
        : `<div class="activity-list">${activities
            .slice(0, 5)
            .map(
              (activity) => `<article class="activity-row"><span class="activity-row__icon">${icon(
                activity.entityType === "liability" ? "landmark" : "wallet-cards",
              )}</span><div><strong>${escapeHtml(activity.entityName)}</strong>
                <p>${actionLabels[activity.action] ?? "อัปเดตข้อมูล"}</p></div>
                <div class="activity-row__value"><strong>${amount(
                  activity.value,
                  isPrivate,
                )}</strong><time datetime="${activity.createdAt}">${formatDate(
                  activity.createdAt.slice(0, 10),
                )}</time></div></article>`,
            )
            .join("")}</div>`
    }
  </section>`;
}

export function renderDashboardView({ data, range, ranges, snapshots, isPrivate }) {
  const { summary, change, goals, health, activities } = data;
  return `<header class="page__header"><div><p class="page__eyebrow">Good morning</p>
      <h2 class="page__title">ภาพรวมการเงินของคุณ</h2>
      <p class="page__description">Snapshot ${formatDate(data.snapshotResult.snapshot.snapshotDate)}</p></div>
    <button class="button" type="button" data-open-editor="asset">${icon(
      "plus",
    )}<span>เพิ่ม Asset</span></button></header>
    <section class="dashboard-grid" aria-label="สรุปฐานะการเงิน">
      <article class="card net-worth-card"><p class="net-worth-card__label">My Net Worth</p>
        <p class="net-worth-card__value">${amount(summary.netWorth, isPrivate, "มูลค่าสุทธิ")}</p>
        <p class="net-worth-card__change" data-direction="${
          change.amount !== null && change.amount < 0 ? "down" : "up"
        }">${signedChange(change, isPrivate)}</p></article>
      ${metricCard("Total Assets", summary.totalAssets, "wallet-cards", "asset", `${summary.assetCount} accounts`, isPrivate)}
      ${metricCard("Total Debt", summary.totalLiabilities, "landmark", "liability", `${summary.liabilityCount} active`, isPrivate)}
      ${metricCard("Liquid Cash", summary.liquidAssets, "circle-dollar-sign", "cash", "Available now", isPrivate)}
      <article class="card chart-card chart-card--trend"><header class="panel-header"><div>
        <h2>Net Worth</h2><p>Monthly trend</p></div><div class="range-control" aria-label="ช่วงเวลา">
          ${ranges
            .map(
              (item) => `<button type="button" data-trend-range="${item}" aria-pressed="${
                item === range
              }">${item}</button>`,
            )
            .join("")}</div></header>
        <div class="chart-frame">${
          snapshots.length === 0
            ? `<div class="panel-empty">ยังไม่มี Snapshot</div>`
            : `<canvas data-net-worth-chart aria-label="กราฟแนวโน้ม Net Worth" role="img"></canvas>`
        }</div></article>
      <article class="card chart-card chart-card--allocation"><header class="panel-header"><div>
        <h2>Asset Allocation</h2><p>By category</p></div></header>
        <div class="chart-frame chart-frame--donut">${
          summary.assetAllocation.length === 0
            ? `<div class="panel-empty">ยังไม่มี Asset</div>`
            : `<canvas data-allocation-chart aria-label="กราฟสัดส่วน Asset" role="img"></canvas>`
        }</div><div class="allocation-legend">${summary.assetAllocation
          .slice(0, 4)
          .map(
            (item) => `<span><i></i>${escapeHtml(item.category)} <strong>${item.percentage.toFixed(
              0,
            )}%</strong></span>`,
          )
          .join("")}</div></article>
      ${goalsPanel(goals, isPrivate)}${healthPanel(health)}
    </section>${activityPanel(activities, isPrivate)}`;
}

export function renderDashboardLoading() {
  return `<section class="dashboard-loading" aria-label="กำลังโหลด Dashboard">
    <div class="skeleton" style="height:8rem"></div><div class="dashboard-loading__row">
      <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
    <div class="skeleton" style="height:18rem"></div></section>`;
}

export function renderDashboardError() {
  return `<section class="card empty-state" role="alert">
    <span class="empty-state__icon">${icon("chart-no-axes-combined")}</span>
    <h2>โหลด Dashboard ไม่สำเร็จ</h2><p>ตรวจสอบพื้นที่จัดเก็บแล้วลองอีกครั้ง</p>
    <button class="button" type="button" data-dashboard-retry>ลองใหม่</button>
  </section>`;
}
