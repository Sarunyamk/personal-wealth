const DEFAULT_LOCALE = "th-TH";
let defaultCurrency = "THB";

export function setDefaultCurrency(currency) {
  const value = String(currency ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new TypeError("Currency must be a 3-letter ISO code.");
  defaultCurrency = value;
}

export function formatCurrency(
  amount,
  { locale = DEFAULT_LOCALE, currency = defaultCurrency } = {},
) {
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(
  amount,
  { locale = DEFAULT_LOCALE, currency = defaultCurrency } = {},
) {
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value, { locale = DEFAULT_LOCALE, digits = 1 } = {}) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value / 100);
}

export function formatDate(
  isoDate,
  { locale = DEFAULT_LOCALE, dateStyle = "medium" } = {},
) {
  if (typeof isoDate !== "string") return "-";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle, timeZone: "UTC" }).format(date);
}
