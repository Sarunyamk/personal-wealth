import { authErrorFromHash, mountAuthController, authModeFromHash } from "./auth/auth-controller.js";
import { createSupabaseBrowserClient } from "./data/supabase-client.js";
import { createAuthService } from "./services/auth-service.js";

const client = createSupabaseBrowserClient();

if (!client) {
  await import("./app.js");
} else {
  const auth = createAuthService(client);
  const session = await auth.getSession();
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
    globalThis.__SUPABASE_CLIENT__ = client;
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
