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
export const EXPIRED_SESSION_MESSAGE = "Session หมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง";

export function accessNotice(status) {
  if (status === "disabled") return DISABLED_ACCOUNT_MESSAGE;
  if (status === "expired" || status === "signed_out") return EXPIRED_SESSION_MESSAGE;
  return "";
}

export function shouldEndSession({ data, error }) {
  return !error && ["disabled", "expired", "signed_out"].includes(data);
}

export function isInactiveAccessResult({ data, error }) {
  return !error && data === false;
}
