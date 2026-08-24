import { hydrateIcons } from "../components/icons.js";
import { renderAuthView } from "../views/auth-view.js";

export function authModeFromHash(hash) {
  return hash === "#reset-password" ? "reset" : "login";
}

export function passwordResetUrl(location) {
  return `${location.origin}${location.pathname}#reset-password`;
}

export function mountAuthController({ root, auth, location = window.location, initialMode } = {}) {
  if (!root || !auth) throw new TypeError("Auth root and service are required.");
  const state = {
    mode: initialMode ?? authModeFromHash(location.hash),
    email: "",
    pending: false,
    message: "",
    error: "",
  };

  function render() {
    root.innerHTML = renderAuthView(state);
    hydrateIcons(root);
    root.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.authMode;
        state.error = "";
        state.message = "";
        render();
      });
    });
    root.querySelector("[data-auth-form]")?.addEventListener("submit", submit);
    root.querySelector("input")?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    if (state.pending) return;
    const data = new FormData(event.currentTarget);
    state.email = String(data.get("email") ?? state.email);
    if (["signup", "reset"].includes(state.mode) && data.get("password") !== data.get("passwordConfirmation")) {
      state.error = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
      render();
      return;
    }
    state.pending = true;
    state.error = "";
    render();
    try {
      if (state.mode === "login") {
        await auth.signIn({ email: data.get("email"), password: data.get("password") });
        location.reload();
      } else if (state.mode === "signup") {
        const result = await auth.signUp({
          email: data.get("email"),
          password: data.get("password"),
          displayName: data.get("displayName"),
        });
        if (result.requiresEmailConfirmation) {
          state.mode = "login";
          state.message = "ตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ";
        } else {
          location.reload();
        }
      } else if (state.mode === "forgot") {
        await auth.requestPasswordReset(data.get("email"), passwordResetUrl(location));
        state.mode = "login";
        state.message = "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว";
      } else {
        await auth.updatePassword(data.get("password"));
        location.hash = "#dashboard";
        location.reload();
      }
    } catch (error) {
      state.error = error.details?.[0] ?? "ไม่สามารถดำเนินการได้ กรุณาลองใหม่";
    } finally {
      state.pending = false;
      render();
    }
  }

  render();
  return Object.freeze({ render });
}
