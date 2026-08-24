export const LIQUIDITY_LEVELS = Object.freeze(["high", "medium", "low"]);
export const CURRENCIES = Object.freeze(["THB"]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isTimestamp(value) {
  return typeof value === "string" && TIMESTAMP_PATTERN.test(value);
}

export function validateAsset(asset) {
  const errors = [];
  if (!isUuid(asset?.id)) errors.push("id must be a UUID");
  if (typeof asset?.name !== "string" || asset.name.trim() === "") {
    errors.push("name is required");
  }
  if (typeof asset?.category !== "string" || asset.category.trim() === "") {
    errors.push("category is required");
  }
  if (!Number.isFinite(asset?.currentValue) || asset.currentValue < 0) {
    errors.push("currentValue must be a non-negative finite number");
  }
  if (!CURRENCIES.includes(asset?.currency)) errors.push("currency is unsupported");
  if (!LIQUIDITY_LEVELS.includes(asset?.liquidityLevel)) {
    errors.push("liquidityLevel is invalid");
  }
  if (typeof asset?.isActive !== "boolean") errors.push("isActive must be boolean");
  if (!isTimestamp(asset?.createdAt)) errors.push("createdAt must be an ISO UTC timestamp");
  if (!isTimestamp(asset?.updatedAt)) errors.push("updatedAt must be an ISO UTC timestamp");
  return errors;
}

export function validateLiability(liability) {
  const errors = [];
  if (!isUuid(liability?.id)) errors.push("id must be a UUID");
  if (typeof liability?.name !== "string" || liability.name.trim() === "") {
    errors.push("name is required");
  }
  if (!Number.isFinite(liability?.originalAmount) || liability.originalAmount < 0) {
    errors.push("originalAmount must be a non-negative finite number");
  }
  if (!Number.isFinite(liability?.currentBalance) || liability.currentBalance < 0) {
    errors.push("currentBalance must be a non-negative finite number");
  }
  if (liability?.currentBalance > liability?.originalAmount) {
    errors.push("currentBalance cannot exceed originalAmount");
  }
  if (typeof liability?.isActive !== "boolean") errors.push("isActive must be boolean");
  if (!isTimestamp(liability?.createdAt)) errors.push("createdAt must be an ISO UTC timestamp");
  if (!isTimestamp(liability?.updatedAt)) errors.push("updatedAt must be an ISO UTC timestamp");
  return errors;
}

export function assertValidSeedData({ assets, liabilities, goals, snapshots }) {
  const errors = [];
  assets.forEach((asset, index) => {
    errors.push(...validateAsset(asset).map((error) => `assets[${index}]: ${error}`));
  });
  liabilities.forEach((liability, index) => {
    errors.push(...validateLiability(liability).map((error) => `liabilities[${index}]: ${error}`));
  });
  goals.forEach((goal, index) => {
    if (!isUuid(goal.id)) errors.push(`goals[${index}]: id must be a UUID`);
    if (!isDate(goal.targetDate)) errors.push(`goals[${index}]: targetDate is invalid`);
  });
  snapshots.forEach((snapshot, index) => {
    if (!isUuid(snapshot.id)) errors.push(`snapshots[${index}]: id must be a UUID`);
    if (!isDate(snapshot.snapshotDate)) {
      errors.push(`snapshots[${index}]: snapshotDate is invalid`);
    }
  });

  if (errors.length > 0) throw new TypeError(errors.join("\n"));
  return true;
}
