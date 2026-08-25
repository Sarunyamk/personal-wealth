import { formatDate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/html.js";

function date(value) {
  return value ? formatDate(value.slice(0, 10)) : "ยังไม่เคยเข้าสู่ระบบ";
}

export function renderAdminLoading() {
  return `<header class="page__header"><div><p class="page__eyebrow">Administration</p>
    <h2 class="page__title">Users</h2></div></header>
    <section class="record-grid">${Array.from({ length: 3 }, () => `<div class="card skeleton" style="height:12rem"></div>`).join("")}</section>`;
}

export function renderAdminError(error) {
  const details = error?.details?.filter(Boolean) ?? [];
  const message = details.length
    ? details.join(" · ")
    : "ตรวจสอบ Edge Function, session และสิทธิ์ admin ใน profiles";
  return `<section class="card empty-state" role="alert"><h2>โหลดผู้ใช้ไม่สำเร็จ</h2>
    <p>${escapeHtml(message)}</p>
    <button class="button" type="button" data-admin-retry>ลองใหม่</button></section>`;
}

export function renderAdminUsers({ users, currentUserId }) {
  return `<header class="page__header"><div><p class="page__eyebrow">Administration</p>
    <h2 class="page__title">Users</h2><p class="page__description">${users.length} accounts</p></div></header>
    ${
      users.length
        ? `<section class="record-grid" aria-label="บัญชีผู้ใช้">${users
            .map((user) => {
              const active = user.status !== "disabled";
              const self = user.id === currentUserId;
              return `<article class="card record-card">
                <header class="record-card__header"><div class="record-card__identity">
                  <h3 class="record-card__title">${escapeHtml(user.display_name || user.email || "Unknown user")}</h3>
                  <p class="record-card__category">${escapeHtml(user.email || "ไม่มีอีเมล")}</p></div>
                  <span class="month-status month-status--${active ? "closed" : "draft"}">${active ? "Active" : "Disabled"}</span>
                </header>
                <p class="record-card__meta">${user.role === "admin" ? "Admin" : "User"} · Last sign-in ${date(user.lastSignInAt)}</p>
                <footer class="record-card__actions">
                  <button class="button button--secondary" type="button" data-admin-action="${active ? "disable" : "enable"}" data-user-id="${user.id}" ${self ? "disabled" : ""}>${active ? "Disable" : "Enable"}</button>
                  <button class="button button--danger" type="button" data-admin-action="delete" data-user-id="${user.id}" ${self ? "disabled" : ""}>Delete</button>
                </footer>
              </article>`;
            })
            .join("")}</section>`
        : `<section class="card empty-state"><h2>ยังไม่มีผู้ใช้</h2></section>`
    }`;
}
