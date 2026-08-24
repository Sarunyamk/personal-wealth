import { validateAsset, validateLiability } from "./contracts.js";
import { validationError } from "../errors/app-error.js";

export function normalizeAmount(value, fieldName = "amount") {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isFinite(amount) || amount < 0) {
    throw validationError([`${fieldName} must be a non-negative finite number`]);
  }
  return amount;
}

function cleanOptionalText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function normalizeAsset(input, { id, now, createdAt = now }) {
  const asset = {
    id,
    name: typeof input?.name === "string" ? input.name.trim() : "",
    category: typeof input?.category === "string" ? input.category.trim() : "",
    currentValue: normalizeAmount(input?.currentValue, "currentValue"),
    purchaseValue:
      input?.purchaseValue === null || input?.purchaseValue === undefined
        ? null
        : normalizeAmount(input.purchaseValue, "purchaseValue"),
    institution: cleanOptionalText(input?.institution),
    accountName: cleanOptionalText(input?.accountName),
    currency: input?.currency ?? "THB",
    liquidityLevel: input?.liquidityLevel ?? "low",
    note: cleanOptionalText(input?.note),
    isActive: input?.isActive ?? true,
    createdAt,
    updatedAt: now,
  };
  const errors = validateAsset(asset);
  if (errors.length > 0) throw validationError(errors);
  return asset;
}

export function normalizeLiability(input, { id, now, createdAt = now }) {
  const liability = {
    id,
    name: typeof input?.name === "string" ? input.name.trim() : "",
    category: typeof input?.category === "string" ? input.category.trim() : "",
    institution: cleanOptionalText(input?.institution),
    originalAmount: normalizeAmount(input?.originalAmount, "originalAmount"),
    currentBalance: normalizeAmount(input?.currentBalance, "currentBalance"),
    interestRate:
      input?.interestRate === null || input?.interestRate === undefined
        ? null
        : normalizeAmount(input.interestRate, "interestRate"),
    monthlyPayment:
      input?.monthlyPayment === null || input?.monthlyPayment === undefined
        ? null
        : normalizeAmount(input.monthlyPayment, "monthlyPayment"),
    startDate: input?.startDate ?? null,
    endDate: input?.endDate ?? null,
    dueDay: input?.dueDay ?? null,
    note: cleanOptionalText(input?.note),
    isActive: input?.isActive ?? true,
    createdAt,
    updatedAt: now,
  };
  const errors = validateLiability(liability);
  if (errors.length > 0) throw validationError(errors);
  return liability;
}
