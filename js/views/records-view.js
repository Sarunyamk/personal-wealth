import { calculateDebtPaidPercentage } from "../domain/calculators.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";

export const ASSET_CATEGORIES = Object.freeze([
  ["all", "ทุกประเภท"],
  ["cash", "Cash"],
  ["bank-account", "Bank Account"],
  ["investment", "Investment"],
  ["stock", "Stock"],
  ["fund", "Mutual Fund"],
  ["crypto", "Crypto"],
  ["gold", "Gold"],
  ["property", "Property"],
  ["vehicle", "Vehicle"],
  ["business", "Business"],
  ["other", "Other"],
]);

export const LIABILITY_CATEGORIES = Object.freeze([
  ["all", "ทุกประเภท"],
  ["credit-card", "Credit Card"],
  ["home-loan", "Home Loan"],
  ["car-loan", "Car Loan"],
  ["personal-loan", "Personal Loan"],
  ["education-loan", "Education Loan"],
  ["business-loan", "Business Loan"],
  ["other-debt", "Other Debt"],
]);

function icon(name) {
  return `<span data-icon="${name}"></span>`;
}

function categoryLabel(categories, value) {
  return categories.find(([id]) => id === value)?.[1] ?? value;
}

function amount(value, isPrivate) {
  const formatted = formatCurrency(value);
  return `<span class="amount" data-sensitive data-value="${formatted}">${
    isPrivate ? "฿••••••" : formatted
  }</span>`;
}

function toolbar({ query, category, categories, entity }) {
  return `<div class="records-toolbar">
    <label class="search-field">
      ${icon("search")}
      <span class="visually-hidden">ค้นหา ${entity}</span>
      <input class="field__input" type="search" value="${escapeHtml(query)}"
        placeholder="ค้นหา..." data-record-search />
    </label>
    <label class="field">
      <span class="visually-hidden">กรองประเภท</span>
      <select class="field__input" data-record-filter>
        ${categories
          .map(
            ([value, label]) =>
              `<option value="${value}"${value === category ? " selected" : ""}>${label}</option>`,
          )
          .join("")}
      </select>
    </label>
  </div>`;
}

function actionButton(action, entity, id, iconName, label) {
  return `<button class="icon-button" type="button" data-record-action="${action}"
    data-entity="${entity}" data-id="${id}" aria-label="${label}" title="${label}">
    ${icon(iconName)}
  </button>`;
}

function emptyRecords(entity, hasRecords) {
  const isAsset = entity === "asset";
  return `<section class="card empty-state">
    <span class="empty-state__icon">${icon(isAsset ? "wallet-cards" : "landmark")}</span>
    <h2>${hasRecords ? "ไม่พบรายการที่ค้นหา" : isAsset ? "ยังไม่มีรายการ Asset" : "ยังไม่มีรายการหนี้"}</h2>
    <p>${hasRecords ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เพิ่มรายการแรกเพื่อเริ่มติดตามฐานะการเงิน"}</p>
    ${
      hasRecords
        ? ""
        : `<button class="button" type="button" data-open-editor="${entity}">${icon("plus")}<span>เพิ่มรายการ</span></button>`
    }
  </section>`;
}

export function filterRecords(records, { query = "", category = "all" } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const matchesCategory = category === "all" || record.category === category;
    const haystack = `${record.name} ${record.institution ?? ""}`.toLocaleLowerCase();
    return matchesCategory && haystack.includes(normalizedQuery);
  });
}

export function renderAssetsView({ assets, query, category, isPrivate }) {
  const filtered = filterRecords(assets, { query, category });
  return `${pageHeader("Assets", "จัดการทรัพย์สินทั้งหมด", "asset")}
    ${toolbar({ query, category, categories: ASSET_CATEGORIES, entity: "Assets" })}
    ${
      filtered.length === 0
        ? emptyRecords("asset", assets.length > 0)
        : `<section class="record-grid" aria-label="รายการ Assets">${filtered
            .map((asset) => assetCard(asset, isPrivate))
            .join("")}</section>`
    }`;
}

export function renderLiabilitiesView({ liabilities, query, category, isPrivate }) {
  const filtered = filterRecords(liabilities, { query, category });
  return `${pageHeader("Liabilities", "ติดตามยอดหนี้และความคืบหน้า", "liability")}
    ${toolbar({ query, category, categories: LIABILITY_CATEGORIES, entity: "Liabilities" })}
    ${
      filtered.length === 0
        ? emptyRecords("liability", liabilities.length > 0)
        : `<section class="record-grid" aria-label="รายการ Liabilities">${filtered
            .map((liability) => liabilityCard(liability, isPrivate))
            .join("")}</section>`
    }`;
}

function pageHeader(title, description, entity) {
  return `<header class="page__header">
    <div><p class="page__eyebrow">Personal Wealth</p><h2 class="page__title">${title}</h2>
      <p class="page__description">${description}</p></div>
    <button class="button" type="button" data-open-editor="${entity}">
      ${icon("plus")}<span>เพิ่มรายการ</span>
    </button>
  </header>`;
}

function assetCard(asset, isPrivate) {
  const category = categoryLabel(ASSET_CATEGORIES, asset.category);
  return `<article class="card record-card">
    <header class="record-card__header"><div class="record-card__identity">
      <h3 class="record-card__title">${escapeHtml(asset.name)}</h3>
      <p class="record-card__category">${escapeHtml(category)}</p></div>
      <span class="metric-card__icon">${icon("wallet-cards")}</span>
    </header>
    <div class="record-card__value-row"><p class="record-card__value">${amount(asset.currentValue, isPrivate)}</p></div>
    <p class="record-card__meta">${escapeHtml(asset.institution ?? "ไม่ระบุสถาบัน")} · อัปเดต ${formatDate(asset.updatedAt.slice(0, 10))}</p>
    <footer class="record-card__actions">
      ${actionButton("quick-update", "asset", asset.id, "refresh-cw", "อัปเดตมูลค่า")}
      ${actionButton("history", "asset", asset.id, "history", "ดูรายละเอียดและประวัติ")}
      ${actionButton("edit", "asset", asset.id, "pencil", "แก้ไข Asset")}
      ${actionButton("deactivate", "asset", asset.id, "archive", "ปิดใช้งาน Asset")}
    </footer>
  </article>`;
}

function liabilityCard(liability, isPrivate) {
  const category = categoryLabel(LIABILITY_CATEGORIES, liability.category);
  const paid = calculateDebtPaidPercentage(liability.originalAmount, liability.currentBalance);
  return `<article class="card record-card">
    <header class="record-card__header"><div class="record-card__identity">
      <h3 class="record-card__title">${escapeHtml(liability.name)}</h3>
      <p class="record-card__category">${escapeHtml(category)}</p></div>
      <span class="metric-card__icon">${icon("landmark")}</span>
    </header>
    <div class="record-card__value-row"><p class="record-card__value">${amount(liability.currentBalance, isPrivate)}</p>
      <span class="record-card__meta">${paid.toFixed(0)}% paid</span></div>
    <div class="progress" role="progressbar" aria-label="ชำระแล้ว" aria-valuenow="${paid.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress__bar" style="width: ${paid}%"></div></div>
    <p class="record-card__meta">${escapeHtml(liability.institution ?? "ไม่ระบุสถาบัน")} · อัปเดต ${formatDate(liability.updatedAt.slice(0, 10))}</p>
    <footer class="record-card__actions">
      ${actionButton("quick-update", "liability", liability.id, "refresh-cw", "อัปเดตยอดคงเหลือ")}
      ${actionButton("history", "liability", liability.id, "history", "ดูรายละเอียดและประวัติ")}
      ${actionButton("edit", "liability", liability.id, "pencil", "แก้ไข Liability")}
      ${actionButton("deactivate", "liability", liability.id, "archive", "ปิดใช้งาน Liability")}
    </footer>
  </article>`;
}
