import { validationError } from "../errors/app-error.js";

export const PROFILE_THEMES = Object.freeze(["fresh", "high-contrast"]);
export const PROFILE_CURRENCIES = Object.freeze(["THB", "USD", "EUR", "JPY"]);

export function validateProfileSettings(input) {
  const displayName = String(input?.displayName ?? "").trim();
  const baseCurrency = String(input?.baseCurrency ?? "").trim().toUpperCase();
  const theme = String(input?.theme ?? "").trim();
  const details = [];
  if (displayName.length < 1 || displayName.length > 80) details.push("ชื่อที่แสดงต้องมี 1-80 ตัวอักษร");
  if (!PROFILE_CURRENCIES.includes(baseCurrency)) details.push("กรุณาเลือกสกุลเงินที่รองรับ");
  if (!PROFILE_THEMES.includes(theme)) details.push("กรุณาเลือกธีมที่รองรับ");
  if (details.length) throw validationError(details);
  return Object.freeze({
    display_name: displayName,
    base_currency: baseCurrency,
    theme,
    privacy_default: Boolean(input?.privacyDefault),
  });
}

export function createSettingsService(client) {
  if (!client?.from || !client?.auth) throw new TypeError("A Supabase client is required.");
  async function getProfile(userId) {
    const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  }

  return Object.freeze({
    getProfile,
    async updateProfile(userId, input) {
      const values = validateProfileSettings(input);
      const { error } = await client.from("profiles").update(values).eq("id", userId);
      if (error) throw error;
      return getProfile(userId);
    },
    async changePasswordAndSignOut(password) {
      const value = String(password ?? "");
      if (value.length < 8) throw validationError(["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"]);
      const { error: updateError } = await client.auth.updateUser({ password: value });
      if (updateError) throw updateError;
      const { error: signOutError } = await client.auth.signOut({ scope: "global" });
      if (signOutError) throw signOutError;
    },
  });
}
