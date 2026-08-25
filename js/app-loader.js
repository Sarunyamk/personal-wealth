import { authErrorFromHash, mountAuthController, authModeFromHash } from "./auth/auth-controller.js";
import { authStartupMessage, shouldReturnToLogin } from "./auth/session-guard.js";
import { createSupabaseBrowserClient } from "./data/supabase-client.js";
import { createAuthService } from "./services/auth-service.js";
import { escapeHtml } from "./utils/html.js";

const client = createSupabaseBrowserClient();

async function loadApplication() {
  try {
    await import("./app.js");
  } catch (error) {
    console.error(error);
    const page = document.querySelector("[data-page]");
    page.innerHTML = `<section class="card empty-state" role="alert">
      <h2>ไม่สามารถเริ่มแอปได้</h2>
      <p>${escapeHtml(error?.message || "เกิดข้อผิดพลาดระหว่างเชื่อมต่อข้อมูล")}</p>
      <button class="button button--primary" type="button" data-app-retry>ลองใหม่</button>
    </section>`;
    page.querySelector("[data-app-retry]").addEventListener("click", () => window.location.reload());
  }
}

if (!client) {
  globalThis.__ALLOW_LOCAL_DEMO__ = true;
  await loadApplication();
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
      try {
        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileError) throw profileError;
        globalThis.__ALLOW_LOCAL_DEMO__ = false;
        globalThis.__SUPABASE_CLIENT__ = client;
        globalThis.__CURRENT_PROFILE__ = profile;
        auth.subscribe(({ event }) => {
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
        await loadApplication();
      } catch (error) {
        console.error(error);
        const page = document.querySelector("[data-page]");
        page.innerHTML = `<section class="card empty-state" role="alert">
          <h2>ตรวจสอบสิทธิ์บัญชีไม่สำเร็จ</h2>
          <p>บัญชีอาจถูกปิดใช้งานหรือไม่สามารถเชื่อมต่อข้อมูลได้</p>
          <button class="button" type="button" data-access-signout>ออกจากระบบ</button>
        </section>`;
        page.querySelector("[data-access-signout]").addEventListener("click", async () => {
          await auth.signOut();
          window.location.reload();
        });
      }
    }
  }
}
