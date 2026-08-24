import { createAppServices } from "./bootstrap.js";
import { requestConfirmation } from "./components/confirmation.js";
import { mountDashboardCharts, unmountDashboardCharts } from "./components/charts.js";
import { hydrateIcons } from "./components/icons.js";
import { showToast } from "./components/toast.js";
import {
  NAVIGATION,
  PRIMARY_MOBILE_VIEWS,
  getNavigationItem,
  getViewIdFromHash,
} from "./config/navigation.js";
import { TREND_RANGES, filterSnapshotsByRange } from "./domain/dashboard.js";
import { createPrivacyState, presentAmount } from "./state/privacy.js";
import { formatCurrency, formatDate } from "./utils/formatters.js";
import { escapeHtml } from "./utils/html.js";
import {
  renderDashboardError,
  renderDashboardLoading,
  renderDashboardView,
} from "./views/dashboard-view.js";
import { renderAssetsView, renderLiabilitiesView } from "./views/records-view.js";
import {
  renderMonthlyFinanceError,
  renderMonthlyFinanceLoading,
  renderMonthlyFinanceView,
} from "./views/monthly-finance-view.js";

const page = document.querySelector("[data-page]");
const topbarTitle = document.querySelector("[data-topbar-title]");
const privacyButton = document.querySelector("[data-privacy-toggle]");
const assetDialog = document.querySelector("[data-asset-dialog]");
const liabilityDialog = document.querySelector("[data-liability-dialog]");
const quickDialog = document.querySelector("[data-quick-dialog]");
const historyDialog = document.querySelector("[data-history-dialog]");
const transactionDialog = document.querySelector("[data-transaction-dialog]");
const budgetDialog = document.querySelector("[data-budget-dialog]");
const moreDialog = document.querySelector("[data-more-dialog]");
const privacyState = createPrivacyState();
const { wealth } = createAppServices();
const viewState = {
  dashboard: { range: "6M" },
  assets: { query: "", category: "all" },
  liabilities: { query: "", category: "all" },
  transactions: { month: new Date().toISOString().slice(0, 7) },
};
let searchRenderTimer;

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

function renderPlaceholder(view) {
  const messages = {
    transactions: ["ยังไม่มี Transaction", "รายการรายรับและรายจ่ายจะแสดงที่นี่", "receipt-text"],
    goals: ["เริ่มเป้าหมายแรกของคุณ", "กำหนดจำนวนเงินและวันที่ที่ต้องการไปให้ถึง", "goal"],
    reports: ["Reports กำลังรอข้อมูล", "รายงานจะแสดงเมื่อมีข้อมูลย้อนหลัง", "chart-no-axes-combined"],
    settings: ["ตั้งค่า Personal Wealth", "การตั้งค่าบัญชีและรูปแบบการแสดงผลจะอยู่ที่นี่", "settings"],
  };
  const [title, description, icon] = messages[view.id];
  page.innerHTML = `<header class="page__header"><div><p class="page__eyebrow">Personal Wealth</p>
      <h2 class="page__title">${view.label}</h2></div></header>
    <section class="card empty-state"><span class="empty-state__icon">${iconPlaceholder(icon)}</span>
      <h2>${title}</h2><p>${description}</p></section>`;
}

function updatePrivacyUi(isPrivate) {
  document.querySelectorAll("[data-sensitive]").forEach((element) => {
    element.textContent = presentAmount(element.dataset.value, isPrivate);
    element.setAttribute("aria-label", isPrivate ? "ยอดเงินถูกซ่อน" : element.dataset.value);
  });
  privacyButton.setAttribute("aria-pressed", String(isPrivate));
  const icon = privacyButton.querySelector("[data-icon]");
  icon.dataset.icon = isPrivate ? "eye" : "eye-off";
  icon.removeAttribute("data-icon-ready");
  privacyButton.querySelector("[data-privacy-label]").textContent =
    isPrivate ? "แสดงยอดเงิน" : "ซ่อนยอดเงิน";
  hydrateIcons(privacyButton);
}

function updateActiveNavigation(viewId) {
  document.querySelectorAll("[data-nav-view]").forEach((link) => {
    if (link.dataset.navView === viewId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

async function renderCurrentView() {
  const viewId = getViewIdFromHash(window.location.hash);
  const view = getNavigationItem(viewId);
  let dashboardData;
  unmountDashboardCharts();
  topbarTitle.textContent = view.label;
  document.title = `${view.label} · Personal Wealth`;

  if (viewId === "dashboard") {
    page.innerHTML = renderDashboardLoading();
    try {
      dashboardData = await wealth.getDashboardData();
    } catch (error) {
      page.innerHTML = renderDashboardError();
      hydrateIcons(page);
      console.error(error);
      return;
    }
    const snapshots = filterSnapshotsByRange(
      dashboardData.snapshots,
      viewState.dashboard.range,
    );
    page.innerHTML = renderDashboardView({
      data: dashboardData,
      range: viewState.dashboard.range,
      ranges: TREND_RANGES,
      snapshots,
      isPrivate: privacyState.value,
    });
  } else if (viewId === "assets") {
    page.innerHTML = renderAssetsView({
      assets: await wealth.listAssets(),
      ...viewState.assets,
      isPrivate: privacyState.value,
    });
  } else if (viewId === "liabilities") {
    page.innerHTML = renderLiabilitiesView({
      liabilities: await wealth.listLiabilities(),
      ...viewState.liabilities,
      isPrivate: privacyState.value,
    });
  } else if (viewId === "transactions") {
    page.innerHTML = renderMonthlyFinanceLoading();
    try {
      page.innerHTML = renderMonthlyFinanceView({
        data: await wealth.getMonthlyFinance(viewState.transactions.month),
        isPrivate: privacyState.value,
      });
    } catch (error) {
      page.innerHTML = renderMonthlyFinanceError();
      console.error(error);
    }
  } else {
    renderPlaceholder(view);
  }

  page.dataset.entering = "true";
  window.setTimeout(() => delete page.dataset.entering, 300);
  updateActiveNavigation(viewId);
  updatePrivacyUi(privacyState.value);
  hydrateIcons(page);
  if (dashboardData) {
    mountDashboardCharts({
      snapshots: filterSnapshotsByRange(
        dashboardData.snapshots,
        viewState.dashboard.range,
      ),
      allocation: dashboardData.summary.assetAllocation,
      isPrivate: privacyState.value,
    });
  }
}

function setFormError(form, message = "") {
  const error = form.querySelector("[role='alert']");
  if (!error) return;
  error.textContent = message;
  error.hidden = message === "";
}

function field(form, name) {
  return form.elements.namedItem(name);
}

function setSubmitting(form, isSubmitting) {
  if (isSubmitting) form.dataset.submitting = "true";
  else delete form.dataset.submitting;
  form.querySelector("[type='submit']").disabled = isSubmitting;
}

async function openEditor(entity, id = null) {
  if (entity === "asset") {
    const form = document.querySelector("[data-asset-form]");
    form.reset();
    setFormError(form);
    field(form, "id").value = id ?? "";
    document.querySelector("[data-asset-dialog-title]").textContent = id ? "แก้ไข Asset" : "เพิ่ม Asset";
    if (id) {
      const asset = await wealth.getAsset(id);
      field(form, "name").value = asset.name;
      field(form, "category").value = asset.category;
      field(form, "value").value = asset.currentValue;
      field(form, "institution").value = asset.institution ?? "";
      field(form, "liquidity").value = asset.liquidityLevel;
    }
    assetDialog.showModal();
    return;
  }

  const form = document.querySelector("[data-liability-form]");
  form.reset();
  setFormError(form);
  field(form, "id").value = id ?? "";
  document.querySelector("[data-liability-dialog-title]").textContent =
    id ? "แก้ไข Liability" : "เพิ่ม Liability";
  if (id) {
    const liability = await wealth.getLiability(id);
    for (const name of [
      "name",
      "category",
      "originalAmount",
      "currentBalance",
      "interestRate",
      "monthlyPayment",
      "institution",
    ]) {
      field(form, name).value = liability[name] ?? "";
    }
  }
  liabilityDialog.showModal();
}

async function openQuickUpdate(entity, id) {
  const form = document.querySelector("[data-quick-form]");
  form.reset();
  setFormError(form);
  field(form, "entityType").value = entity;
  field(form, "id").value = id;
  const record = entity === "asset" ? await wealth.getAsset(id) : await wealth.getLiability(id);
  const value = entity === "asset" ? record.currentValue : record.currentBalance;
  document.querySelector("[data-quick-title]").textContent =
    entity === "asset" ? "อัปเดตมูลค่า Asset" : "อัปเดตยอดหนี้";
  document.querySelector("[data-quick-current]").textContent = `ยอดปัจจุบัน ${formatCurrency(value)}`;
  field(form, "value").value = value;
  quickDialog.showModal();
}

async function openHistory(entity, id) {
  const record = entity === "asset" ? await wealth.getAsset(id) : await wealth.getLiability(id);
  const history =
    entity === "asset"
      ? await wealth.listAssetValueHistory(id)
      : await wealth.listLiabilityValueHistory(id);
  const currentValue = entity === "asset" ? record.currentValue : record.currentBalance;
  const valueField = entity === "asset" ? "value" : "balance";
  document.querySelector("[data-history-title]").textContent = record.name;
  document.querySelector("[data-history-body]").innerHTML = `
    <div class="history-summary"><div><strong>${escapeHtml(record.category)}</strong>
      <p class="record-card__meta">${escapeHtml(record.institution ?? "ไม่ระบุสถาบัน")}</p></div>
      <span class="history-summary__value">${amountMarkup(currentValue, "ยอดปัจจุบัน")}</span></div>
    <ul class="history-list">${history
      .slice()
      .reverse()
      .map(
        (item) => `<li class="history-item"><time datetime="${item.recordedAt}">${formatDate(
          item.recordedAt.slice(0, 10),
        )}</time><strong>${amountMarkup(item[valueField], "มูลค่า")}</strong></li>`,
      )
      .join("")}</ul>`;
  updatePrivacyUi(privacyState.value);
  historyDialog.showModal();
}

async function deactivateRecord(entity, id) {
  const record = entity === "asset" ? await wealth.getAsset(id) : await wealth.getLiability(id);
  const confirmed = await requestConfirmation({
    title: "ปิดใช้งานรายการ",
    message: `ปิดใช้งาน “${record.name}” หรือไม่? ประวัติจะยังถูกเก็บไว้`,
    confirmLabel: "ปิดใช้งาน",
  });
  if (!confirmed) return;
  if (entity === "asset") await wealth.deactivateAsset(id);
  else await wealth.deactivateLiability(id);
  await renderCurrentView();
  showToast("ปิดใช้งานรายการแล้ว");
}

function openTransactionDialog() {
  const form = document.querySelector("[data-transaction-form]");
  form.reset();
  setFormError(form);
  field(form, "transactionDate").value = `${viewState.transactions.month}-01`;
  transactionDialog.showModal();
}

function openBudgetDialog(type = "expense", category = "") {
  const form = document.querySelector("[data-budget-form]");
  form.reset();
  setFormError(form);
  field(form, "month").value = viewState.transactions.month;
  field(form, "type").value = type;
  field(form, "category").value = category;
  budgetDialog.showModal();
}

async function archiveTransaction(id) {
  const confirmed = await requestConfirmation({
    title: "เก็บรายการเข้าคลัง",
    message: "รายการนี้จะไม่ถูกรวมในยอดรายเดือน แต่ยังเก็บไว้ในประวัติ",
    confirmLabel: "เก็บเข้าคลัง",
  });
  if (!confirmed) return;
  await wealth.deactivateTransaction(id);
  await renderCurrentView();
  showToast("เก็บรายการเข้าคลังแล้ว");
}

async function handleRecordAction(button) {
  const { recordAction: action, entity, id } = button.dataset;
  if (action === "edit") await openEditor(entity, id);
  if (action === "quick-update") await openQuickUpdate(entity, id);
  if (action === "history") await openHistory(entity, id);
  if (action === "deactivate") await deactivateRecord(entity, id);
}

function bindInteractions() {
  privacyButton.addEventListener("click", () => privacyState.toggle());
  privacyState.subscribe(async (isPrivate) => {
    updatePrivacyUi(isPrivate);
    if (getViewIdFromHash(window.location.hash) === "dashboard") {
      await renderCurrentView();
    }
  });
  window.addEventListener("hashchange", () => renderCurrentView());

  document.addEventListener("click", async (event) => {
    const rangeButton = event.target.closest("[data-trend-range]");
    const retryButton = event.target.closest("[data-dashboard-retry]");
    const editorButton = event.target.closest("[data-open-editor]");
    const actionButton = event.target.closest("[data-record-action]");
    const transactionOpen = event.target.closest("[data-transaction-open]");
    const transactionArchive = event.target.closest("[data-transaction-archive]");
    const budgetOpen = event.target.closest("[data-budget-open]");
    if (retryButton) await renderCurrentView();
    if (rangeButton) {
      viewState.dashboard.range = rangeButton.dataset.trendRange;
      await renderCurrentView();
    }
    if (editorButton) await openEditor(editorButton.dataset.openEditor);
    if (actionButton) await handleRecordAction(actionButton);
    if (transactionOpen) openTransactionDialog();
    if (transactionArchive) await archiveTransaction(transactionArchive.dataset.transactionArchive);
    if (budgetOpen) openBudgetDialog(budgetOpen.dataset.type, budgetOpen.dataset.category);
    if (event.target.closest("[data-monthly-retry]")) await renderCurrentView();
    if (event.target.closest("[data-asset-close]")) assetDialog.close();
    if (event.target.closest("[data-liability-close]")) liabilityDialog.close();
    if (event.target.closest("[data-quick-close]")) quickDialog.close();
    if (event.target.closest("[data-history-close]")) historyDialog.close();
    if (event.target.closest("[data-transaction-close]")) transactionDialog.close();
    if (event.target.closest("[data-budget-close]")) budgetDialog.close();
    if (event.target.closest("[data-more-open]")) moreDialog.showModal();
    if (event.target.closest("[data-more-close]")) moreDialog.close();
    if (event.target.closest("[data-more-link]")) moreDialog.close();
  });

  page.addEventListener("input", (event) => {
    if (!event.target.matches("[data-record-search]")) return;
    const viewId = getViewIdFromHash(window.location.hash);
    viewState[viewId].query = event.target.value;
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = window.setTimeout(async () => {
      await renderCurrentView();
      const input = page.querySelector("[data-record-search]");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }, 150);
  });
  page.addEventListener("change", (event) => {
    if (event.target.matches("[data-finance-month]")) {
      viewState.transactions.month = event.target.value;
      renderCurrentView();
      return;
    }
    if (!event.target.matches("[data-record-filter]")) return;
    const viewId = getViewIdFromHash(window.location.hash);
    viewState[viewId].category = event.target.value;
    renderCurrentView();
  });

  document.querySelector("[data-asset-form]").addEventListener("submit", submitAssetForm);
  document.querySelector("[data-liability-form]").addEventListener("submit", submitLiabilityForm);
  document.querySelector("[data-quick-form]").addEventListener("submit", submitQuickForm);
  document
    .querySelector("[data-transaction-form]")
    .addEventListener("submit", submitTransactionForm);
  document.querySelector("[data-budget-form]").addEventListener("submit", submitBudgetForm);
}

async function submitBudgetForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting) return;
  setSubmitting(form, true);
  const data = new FormData(form);
  try {
    await wealth.upsertBudget({
      month: data.get("month"),
      type: data.get("type"),
      category: data.get("category"),
      plannedAmount: data.get("plannedAmount"),
    });
    budgetDialog.close();
    await renderCurrentView();
    showToast("บันทึกแผนแล้ว");
  } catch (error) {
    setFormError(form, error.details?.[0] ?? "กรุณาตรวจสอบข้อมูล");
  } finally {
    setSubmitting(form, false);
  }
}

async function submitTransactionForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting) return;
  setSubmitting(form, true);
  const data = new FormData(form);
  try {
    await wealth.createTransaction({
      type: data.get("type"),
      name: data.get("name"),
      category: data.get("category"),
      amount: data.get("amount"),
      transactionDate: data.get("transactionDate"),
      note: data.get("note"),
    });
    viewState.transactions.month = String(data.get("transactionDate")).slice(0, 7);
    transactionDialog.close();
    await renderCurrentView();
    showToast("เพิ่มรายการแล้ว");
  } catch (error) {
    setFormError(form, error.details?.[0] ?? "กรุณาตรวจสอบข้อมูล");
  } finally {
    setSubmitting(form, false);
  }
}

async function submitAssetForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting) return;
  setSubmitting(form, true);
  const data = new FormData(form);
  const input = {
    name: data.get("name"),
    category: data.get("category"),
    currentValue: data.get("value"),
    institution: data.get("institution"),
    currency: "THB",
    liquidityLevel: data.get("liquidity"),
  };
  try {
    const id = data.get("id");
    if (id) await wealth.updateAsset(id, input);
    else await wealth.createAsset(input);
    assetDialog.close();
    await renderCurrentView();
    showToast(id ? "บันทึกการแก้ไขแล้ว" : "เพิ่ม Asset แล้ว");
  } catch (error) {
    setFormError(form, error.details?.[0] ?? "กรุณาตรวจสอบข้อมูล");
  } finally {
    setSubmitting(form, false);
  }
}

async function submitLiabilityForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting) return;
  setSubmitting(form, true);
  const data = new FormData(form);
  const optionalNumber = (name) => (data.get(name) === "" ? null : data.get(name));
  const input = {
    name: data.get("name"),
    category: data.get("category"),
    originalAmount: data.get("originalAmount"),
    currentBalance: data.get("currentBalance"),
    interestRate: optionalNumber("interestRate"),
    monthlyPayment: optionalNumber("monthlyPayment"),
    institution: data.get("institution"),
  };
  try {
    const id = data.get("id");
    if (id) await wealth.updateLiability(id, input);
    else await wealth.createLiability(input);
    liabilityDialog.close();
    await renderCurrentView();
    showToast(id ? "บันทึกการแก้ไขแล้ว" : "เพิ่ม Liability แล้ว");
  } catch (error) {
    setFormError(form, error.details?.[0] ?? "กรุณาตรวจสอบข้อมูล");
  } finally {
    setSubmitting(form, false);
  }
}

async function submitQuickForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting) return;
  setSubmitting(form, true);
  const data = new FormData(form);
  try {
    if (data.get("entityType") === "asset") {
      await wealth.updateAssetValue(data.get("id"), data.get("value"));
    } else {
      await wealth.updateLiabilityBalance(data.get("id"), data.get("value"));
    }
    quickDialog.close();
    await renderCurrentView();
    showToast("อัปเดตยอดแล้ว");
  } catch (error) {
    setFormError(form, error.details?.[0] ?? "กรุณาตรวจสอบข้อมูล");
  } finally {
    setSubmitting(form, false);
  }
}

try {
  renderNavigation();
  hydrateIcons();
  bindInteractions();
  await renderCurrentView();
} catch (error) {
  page.innerHTML = `<section class="card empty-state"><h2>ไม่สามารถโหลดข้อมูลได้</h2>
    <p>ลองรีเฟรชหน้าอีกครั้ง</p><button class="button" type="button"
      onclick="window.location.reload()">ลองใหม่</button></section>`;
  console.error(error);
}
