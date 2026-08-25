import { AppError, ERROR_CODES } from "../errors/app-error.js";

export function createAdminService(client) {
  if (!client?.rpc || !client?.functions?.invoke) throw new TypeError("A Supabase admin client is required.");

  async function invoke(action, userId) {
    const { data, error } = await client.functions.invoke("admin-users", {
      body: { action, ...(userId ? { userId } : {}) },
    });
    if (error || data?.error) {
      let responseError = data?.error;
      if (!responseError && error?.context?.json) {
        try {
          const body = await error.context.json();
          responseError = body?.error || body?.message;
        } catch {
          responseError = null;
        }
      }
      throw new AppError(ERROR_CODES.AUTH, "Admin operation failed.", {
        cause: error,
        details: [responseError, error?.message].filter(Boolean),
      });
    }
    const expectedStatus = action === "disable" ? "disabled" : action === "enable" ? "active" : null;
    if (expectedStatus && data?.user?.status !== expectedStatus) {
      throw new AppError(ERROR_CODES.AUTH, "Admin operation was not persisted.", {
        details: ["สถานะบัญชีไม่ได้เปลี่ยน กรุณาลองใหม่"],
      });
    }
    return data;
  }

  return Object.freeze({
    async listUsers() {
      const { data, error } = await client.rpc("admin_list_users");
      if (error) {
        throw new AppError(ERROR_CODES.AUTH, "Unable to list users.", {
          cause: error,
          details: [error.message].filter(Boolean),
        });
      }
      return (data ?? []).map((user) => ({
        ...user,
        emailConfirmedAt: user.email_confirmed_at,
        lastSignInAt: user.last_sign_in_at,
      }));
    },
    disableUser: (userId) => invoke("disable", userId),
    enableUser: (userId) => invoke("enable", userId),
    deleteUser: (userId) => invoke("delete", userId),
  });
}
