import { escapeHtml } from "../utils/html.js";

const COPY = Object.freeze({
  login: { title: "เข้าสู่ระบบ", submit: "เข้าสู่ระบบ" },
  signup: { title: "สร้างบัญชี", submit: "สร้างบัญชี" },
  forgot: { title: "รีเซ็ตรหัสผ่าน", submit: "ส่งลิงก์รีเซ็ต" },
  reset: { title: "ตั้งรหัสผ่านใหม่", submit: "บันทึกรหัสผ่าน" },
});

function emailField(email) {
  return `<label class="field"><span class="field__label">อีเมล</span>
    <input class="field__input" type="email" name="email" value="${escapeHtml(email)}" autocomplete="email" inputmode="email" required /></label>`;
}

function passwordField({ confirmation = false, newPassword = false } = {}) {
  return `<label class="field"><span class="field__label">${confirmation ? "ยืนยันรหัสผ่าน" : "รหัสผ่าน"}</span>
    <input class="field__input" type="password" name="${confirmation ? "passwordConfirmation" : "password"}" minlength="8" autocomplete="${confirmation || newPassword ? "new-password" : "current-password"}" required /></label>`;
}

function modeFields(mode, email) {
  if (mode === "forgot") return emailField(email);
  if (mode === "reset") {
    return `${passwordField({ newPassword: true })}${passwordField({ confirmation: true })}`;
  }
  return `${
    mode === "signup"
      ? `<label class="field"><span class="field__label">ชื่อที่แสดง</span><input class="field__input" name="displayName" autocomplete="name" required /></label>`
      : ""
  }${emailField(email)}${passwordField({ newPassword: mode === "signup" })}${
    mode === "signup" ? passwordField({ confirmation: true }) : ""
  }`;
}

function modeActions(mode) {
  if (mode === "login") {
    return `<button class="auth-link" type="button" data-auth-mode="forgot">ลืมรหัสผ่าน</button>
      <p>ยังไม่มีบัญชี <button class="auth-link" type="button" data-auth-mode="signup">สร้างบัญชี</button></p>`;
  }
  if (mode === "signup") {
    return `<p>มีบัญชีแล้ว <button class="auth-link" type="button" data-auth-mode="login">เข้าสู่ระบบ</button></p>`;
  }
  if (mode === "forgot") {
    return `<button class="auth-link" type="button" data-auth-mode="login">กลับไปเข้าสู่ระบบ</button>`;
  }
  return "";
}

export function renderAuthView({ mode = "login", email = "", pending = false, message = "", error = "" } = {}) {
  const copy = COPY[mode] ?? COPY.login;
  const activeMode = COPY[mode] ? mode : "login";
  return `<main class="auth-page" data-auth-page>
    <section class="auth-panel" aria-labelledby="auth-title">
      <header class="auth-brand"><span class="auth-brand__mark" data-icon="circle-dollar-sign"></span><span>Personal Wealth</span></header>
      <div class="auth-copy"><h1 id="auth-title">${copy.title}</h1></div>
      ${message ? `<p class="auth-message" role="status">${escapeHtml(message)}</p>` : ""}
      <form class="auth-form" data-auth-form data-mode="${activeMode}">
        ${modeFields(activeMode, email)}
        ${error ? `<p class="field__error" role="alert">${escapeHtml(error)}</p>` : ""}
        <button class="button auth-submit" type="submit" ${pending ? "disabled aria-busy=\"true\"" : ""}>${pending ? "กำลังดำเนินการ" : copy.submit}</button>
      </form>
      <footer class="auth-actions">${modeActions(activeMode)}</footer>
    </section>
  </main>`;
}
