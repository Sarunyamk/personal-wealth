import { PROFILE_CURRENCIES, PROFILE_THEMES } from "../services/settings-service.js";
import { escapeHtml } from "../utils/html.js";

function options(values, current, labels = {}) {
  return values.map((value) => `<option value="${value}"${value === current ? " selected" : ""}>${labels[value] ?? value}</option>`).join("");
}

export function renderSettingsLoading() {
  return `<header class="page__header"><div><p class="page__eyebrow">Personal Wealth</p><h2 class="page__title">Settings</h2></div></header>
    <section class="settings-layout" aria-label="กำลังโหลดการตั้งค่า"><div class="card skeleton settings-skeleton"></div><div class="card skeleton settings-skeleton"></div></section>`;
}

export function renderSettingsView({ profile, email }) {
  return `<header class="page__header"><div><p class="page__eyebrow">Personal Wealth</p><h2 class="page__title">Settings</h2></div></header>
    <div class="settings-layout">
      <section class="card settings-section"><div><h3>โปรไฟล์และการแสดงผล</h3><p>ค่าที่ใช้กับบัญชีนี้ในทุกอุปกรณ์</p></div>
        <form class="settings-form" data-profile-settings-form>
          <label class="field"><span class="field__label">ชื่อที่แสดง</span><input class="field__input" name="displayName" maxlength="80" required value="${escapeHtml(profile.display_name ?? "")}"></label>
          <label class="field"><span class="field__label">สกุลเงินหลัก</span><select class="field__input" name="baseCurrency">${options(PROFILE_CURRENCIES, profile.base_currency)}</select></label>
          <label class="field"><span class="field__label">ธีม</span><select class="field__input" name="theme">${options(PROFILE_THEMES, profile.theme, { fresh: "Fresh", "high-contrast": "High contrast" })}</select></label>
          <label class="settings-toggle"><input type="checkbox" name="privacyDefault"${profile.privacy_default ? " checked" : ""}><span><strong>ซ่อนยอดเงินเป็นค่าเริ่มต้น</strong><small>เปิด Privacy Mode เมื่อเข้าสู่ระบบบนอุปกรณ์ใหม่</small></span></label>
          <p class="field__error" role="alert" hidden></p><div><button class="button" type="submit">บันทึกการตั้งค่า</button></div>
        </form>
      </section>
      <section class="card settings-section"><div><h3>บัญชี</h3><p>ข้อมูลสิทธิ์จาก Supabase Authentication</p></div>
        <dl class="settings-facts"><div><dt>อีเมล</dt><dd>${escapeHtml(email)}</dd></div><div><dt>สิทธิ์</dt><dd>${escapeHtml(profile.role)}</dd></div><div><dt>สถานะ</dt><dd>${profile.status === "active" ? "ใช้งานได้" : "ปิดใช้งาน"}</dd></div></dl>
      </section>
      <section class="card settings-section"><div><h3>เปลี่ยนรหัสผ่าน</h3><p>หลังบันทึก ระบบจะออกจากทุกอุปกรณ์เพื่อป้องกัน session เดิม</p></div>
        <form class="settings-form" data-password-settings-form><label class="field"><span class="field__label">รหัสผ่านใหม่</span><input class="field__input" type="password" name="password" minlength="8" autocomplete="new-password" required></label>
          <label class="field"><span class="field__label">ยืนยันรหัสผ่านใหม่</span><input class="field__input" type="password" name="confirmation" minlength="8" autocomplete="new-password" required></label>
          <p class="field__error" role="alert" hidden></p><div><button class="button" type="submit">เปลี่ยนรหัสผ่าน</button></div></form>
      </section>
    </div>`;
}

export function renderSettingsError(error) {
  return `<section class="card empty-state" role="alert"><span class="empty-state__icon" data-icon="triangle-alert"></span><h2>โหลดการตั้งค่าไม่สำเร็จ</h2><p>${escapeHtml(error?.message ?? "กรุณาลองใหม่")}</p><button class="button" type="button" data-page-retry>ลองใหม่</button></section>`;
}
