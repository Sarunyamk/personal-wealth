import { AppError, ERROR_CODES } from "../errors/app-error.js";

export function createAdminService(client) {
  if (!client?.functions?.invoke) throw new TypeError("A Supabase Functions client is required.");

  async function invoke(action, userId) {
    const { data, error } = await client.functions.invoke("admin-users", {
      body: { action, ...(userId ? { userId } : {}) },
    });
    if (error || data?.error) {
      throw new AppError(ERROR_CODES.AUTH, "Admin operation failed.", {
        cause: error,
        details: [data?.error, error?.message].filter(Boolean),
      });
    }
    return data;
  }

  return Object.freeze({
    async listUsers() {
      return (await invoke("list")).users ?? [];
    },
    disableUser: (userId) => invoke("disable", userId),
    enableUser: (userId) => invoke("enable", userId),
    deleteUser: (userId) => invoke("delete", userId),
  });
}
