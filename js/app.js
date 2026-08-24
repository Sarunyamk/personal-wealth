import { hydrateIcons } from "./components/icons.js";
import { showToast } from "./components/toast.js";
import { createAppServices } from "./bootstrap.js";
import {
  NAVIGATION,
  PRIMARY_MOBILE_VIEWS,
  getNavigationItem,
  getViewIdFromHash,
} from "./config/navigation.js";
import { createPrivacyState, presentAmount } from "./state/privacy.js";
import { formatCurrency } from "./utils/formatters.js";

const page = document.querySelector("[data-page]");
const topbarTitle = document.querySelector("[data-topbar-title]");
const privacyButton = document.querySelector("[data-privacy-toggle]");
const entryDialog = document.querySelector("[data-entry-dialog]");
const moreDialog = document.querySelector("[data-more-dialog]");
const privacyState = createPrivacyState();
const { wealth } = createAppServices();
let summary;

function iconPlaceholder(name) {
  return `<span data-icon="${name}"></span>`;
}

function renderNavigation() {
  const desktopNav = document.querySelector("[data-desktop-nav]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  const moreMenu = document.querySelector("[data-more-menu]");

  desktopNav.innerHTML = NAVIGATION.map(
    ({ id, label, icon }) => `
      <a class="sidebar-nav__item" href="#${id}" data-nav-view="${id}">
        ${iconPlaceholder(icon)}<span>${label}</span>
      </a>`,
  ).join("");

  const primaryItems = NAVIGATION.filter(({ id }) => PRIMARY_MOBILE_VIEWS.includes(id));
  mobileNav.innerHTML = `${primaryItems
    .map(
      ({ id, shortLabel, icon }) => `
        <a class="mobile-nav__item" href="#${id}" data-nav-view="${id}">
          ${iconPlaceholder(icon)}<span>${shortLabel}</span>
        </a>`,
    )
    .join("")}
    <button class="mobile-nav__item" type="button" data-more-open>
      ${iconPlaceholder("menu")}<span>More</span>
    </button>`;

  moreMenu.innerHTML = NAVIGATION.filter(({ id }) => !PRIMARY_MOBILE_VIEWS.includes(id))
    .map(
      ({ id, label, icon }) => `
        <a class="more-menu__item" href="#${id}" data-more-link>
          ${iconPlaceholder(icon)}<span>${label}</span>
          <span class="more-menu__chevron" data-icon="chevron-right"></span>
        </a>`,
    )
    .join("");
}

function amountMarkup(value, label) {
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-value="${formatted}" aria-label="${label}">
    ${presentAmount(formatted, privacyState.value)}
  </span>`;
}

function renderDashboard() {
  page.innerHTML = `
    <header class="page__header">
      <div>
        <p class="page__eyebrow">Good morning</p>
        <h2 class="page__title">ภาพรวมการเงินของคุณ</h2>
        <p class="page__description">ข้อมูลล่าสุดเดือนสิงหาคม 2026</p>
      </div>
      <button class="button" type="button" data-entry-open>
        ${iconPlaceholder("plus")}<span>เพิ่ม Asset</span>
      </button>
    </header>
    <section class="dashboard-grid" aria-label="สรุปฐานะการเงิน">
      <article class="card net-worth-card">
        <p class="net-worth-card__label">My Net Worth</p>
        <p class="net-worth-card__value">${amountMarkup(summary.netWorth, "มูลค่าสุทธิ")}</p>
        <p class="net-worth-card__change">
          ${iconPlaceholder("trending-up")}<span>+4.2% this month</span>
        </p>
      </article>
      ${metricCard("Total Assets", summary.totalAssets, "wallet-cards", "asset", `${summary.assetCount} accounts`)}
      ${metricCard("Total Debt", summary.totalLiabilities, "landmark", "liability", `${summary.liabilityCount} active loan`)}
      ${metricCard("Liquid Cash", summary.liquidAssets, "circle-dollar-sign", "cash", "Available now")}
      ${chartPlaceholder("Net Worth", "Monthly trend", "chart-no-axes-combined", "")}
      ${chartPlaceholder("Asset Allocation", "By category", "wallet-cards", "chart-placeholder--allocation")}
    </section>`;
}

function metricCard(label, value, icon, modifier, meta) {
  return `<article class="card metric-card metric-card--${modifier}">
    <div class="metric-card__header">
      <p class="metric-card__label">${label}</p>
      <span class="metric-card__icon">${iconPlaceholder(icon)}</span>
    </div>
    <p class="metric-card__value">${amountMarkup(value, label)}</p>
    <p class="metric-card__meta">${meta}</p>
  </article>`;
}

function chartPlaceholder(title, subtitle, icon, className) {
  return `<article class="card chart-placeholder ${className}">
    <header class="chart-placeholder__header">
      <div><h2>${title}</h2><p>${subtitle}</p></div>
      <span class="metric-card__icon">${iconPlaceholder(icon)}</span>
    </header>
    <div class="chart-placeholder__canvas" aria-hidden="true">
      <span class="skeleton" style="width: 72%; height: 45%"></span>
    </div>
  </article>`;
}

function renderPlaceholder(view) {
  const messages = {
    assets: ["ยังไม่มีรายการ Asset", "เพิ่ม Asset แรกเพื่อเริ่มติดตามทรัพย์สินของคุณ", "wallet-cards"],
    liabilities: ["ยังไม่มีรายการหนี้", "เพิ่มยอดหนี้เพื่อดูความคืบหน้าในการชำระ", "landmark"],
    transactions: ["ยังไม่มี Transaction", "รายการรายรับและรายจ่ายจะแสดงที่นี่", "receipt-text"],
    goals: ["เริ่มเป้าหมายแรกของคุณ", "กำหนดจำนวนเงินและวันที่ที่ต้องการไปให้ถึง", "goal"],
    reports: ["Reports กำลังรอข้อมูล", "รายงานจะแสดงเมื่อมีข้อมูลย้อนหลัง", "chart-no-axes-combined"],
    settings: ["ตั้งค่า Personal Wealth", "การตั้งค่าบัญชีและรูปแบบการแสดงผลจะอยู่ที่นี่", "settings"],
  };
  const [title, description, icon] = messages[view.id];
  page.innerHTML = `
    <header class="page__header">
      <div><p class="page__eyebrow">Personal Wealth</p><h2 class="page__title">${view.label}</h2></div>
    </header>
    <section class="card empty-state">
      <span class="empty-state__icon">${iconPlaceholder(icon)}</span>
      <h2>${title}</h2><p>${description}</p>
      <button class="button" type="button" data-entry-open>${iconPlaceholder("plus")}<span>เพิ่มรายการ</span></button>
    </section>`;
}

function updatePrivacyUi(isPrivate) {
  document.querySelectorAll("[data-sensitive]").forEach((element) => {
    element.textContent = presentAmount(element.dataset.value, isPrivate);
    element.setAttribute("aria-label", isPrivate ? "ยอดเงินถูกซ่อน" : element.dataset.value);
  });
  privacyButton.setAttribute("aria-pressed", String(isPrivate));
  privacyButton.querySelector("[data-icon]").dataset.icon = isPrivate ? "eye" : "eye-off";
  privacyButton.querySelector("[data-icon]").removeAttribute("data-icon-ready");
  privacyButton.querySelector("[data-privacy-label]").textContent = isPrivate ? "แสดงยอดเงิน" : "ซ่อนยอดเงิน";
  hydrateIcons(privacyButton);
}

function updateActiveNavigation(viewId) {
  document.querySelectorAll("[data-nav-view]").forEach((link) => {
    if (link.dataset.navView === viewId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function renderCurrentView() {
  const viewId = getViewIdFromHash(window.location.hash);
  const view = getNavigationItem(viewId);
  topbarTitle.textContent = view.label;
  document.title = `${view.label} · Personal Wealth`;
  if (viewId === "dashboard") renderDashboard();
  else renderPlaceholder(view);
  page.dataset.entering = "true";
  window.setTimeout(() => delete page.dataset.entering, 300);
  updateActiveNavigation(viewId);
  updatePrivacyUi(privacyState.value);
  hydrateIcons(page);
}

function bindInteractions() {
  privacyButton.addEventListener("click", () => privacyState.toggle());
  privacyState.subscribe(updatePrivacyUi);
  window.addEventListener("hashchange", renderCurrentView);
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-entry-open]")) entryDialog.showModal();
    if (event.target.closest("[data-dialog-close]")) entryDialog.close();
    if (event.target.closest("[data-more-open]")) moreDialog.showModal();
    if (event.target.closest("[data-more-close]")) moreDialog.close();
    if (event.target.closest("[data-more-link]")) moreDialog.close();
  });
  document.querySelector("[data-entry-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await wealth.createAsset({
        name: data.get("name"),
        currentValue: data.get("value"),
        category: "other",
        currency: "THB",
        liquidityLevel: "low",
      });
      summary = await wealth.getSummary();
      form.reset();
      entryDialog.close();
      if (getViewIdFromHash(window.location.hash) === "dashboard") renderCurrentView();
      showToast("บันทึก Asset แล้ว");
    } catch (error) {
      showToast("บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
      console.error(error);
    }
  });
}

try {
  summary = await wealth.getSummary();
  renderNavigation();
  hydrateIcons();
  bindInteractions();
  renderCurrentView();
} catch (error) {
  page.innerHTML = `<section class="card empty-state">
    <h2>ไม่สามารถโหลดข้อมูลได้</h2><p>ลองรีเฟรชหน้าอีกครั้ง</p>
    <button class="button" type="button" onclick="window.location.reload()">ลองใหม่</button>
  </section>`;
  console.error(error);
}
