import { authErrorFromHash, mountAuthController, authModeFromHash } from "./auth/auth-controller.js";
import { authStartupMessage, shouldReturnToLogin } from "./auth/session-guard.js";
import { createSupabaseBrowserClient } from "./data/supabase-client.js";
import { createAuthService } from "./services/auth-service.js";
import { escapeHtml } from "./utils/html.js";

const client = createSupabaseBrowserClient();

if (!client) {
  globalThis.__ALLOW_LOCAL_DEMO__ = true;
  await import("./app.js");
} else {
  const auth = createAuthService(client);
  let session;
  let startupFailed = false;
  try {
    session = await auth.getSession();
  } catch (error) {
    startupFailed = true;
    document.querySelector(".app-shell").hidden = true;
    const root = document.createElement("main");
    root.className = "auth-shell";
    root.innerHTML = `<section class="auth-panel" role="alert">
      <p class="auth-panel__eyebrow">Personal Wealth</p>
      <h1>เปิดระบบบัญชีไม่สำเร็จ</h1>
      <p>${escapeHtml(authStartupMessage(error))}</p>
      <button class="button button--primary" type="button" data-auth-retry>ลองใหม่</button>
    </section>`;
    document.body.prepend(root);
    root.querySelector("[data-auth-retry]").addEventListener("click", () => window.location.reload());
  }
  if (!startupFailed) {
    const resetMode = authModeFromHash(window.location.hash) === "reset";
    if (!session || resetMode) {
      document.querySelector(".app-shell").hidden = true;
      const root = document.createElement("div");
      document.body.prepend(root);
      mountAuthController({
        root,
        auth,
        initialMode: resetMode ? "reset" : "login",
        initialError: authErrorFromHash(window.location.hash),
      });
    } else {
      globalThis.__ALLOW_LOCAL_DEMO__ = false;
      globalThis.__SUPABASE_CLIENT__ = client;
      auth.onAuthStateChange(({ event }) => {
        if (shouldReturnToLogin(event)) window.location.reload();
      });
      const logout = document.querySelector("[data-auth-logout]");
      logout.hidden = false;
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        try {
          await auth.signOut();
          window.location.reload();
        } catch {
          logout.disabled = false;
        }
      });
      await import("./app.js");
    }
  }
}
