export function shouldReturnToLogin(event) {
  return event === "SIGNED_OUT" || event === "USER_DELETED";
}

export function authStartupMessage(error) {
  if (globalThis.navigator?.onLine === false) {
    return "อุปกรณ์ออฟไลน์อยู่ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }
  return error?.message || "เชื่อมต่อระบบบัญชีไม่สำเร็จ กรุณาลองใหม่";
}

export const DISABLED_ACCOUNT_MESSAGE = "บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ";

export function isInactiveAccessResult({ data, error }) {
  return !error && data === false;
}
