import { isDate } from "./contracts.js";
import { normalizeAmount } from "./normalizers.js";
import { validationError } from "../errors/app-error.js";

export function normalizeGoal(input, { id, now, createdAt = now }) {
  const errors = [];
  const name = String(input?.name ?? "").trim();
  const targetDate = String(input?.targetDate ?? "");
  let targetAmount;
  let currentAmount;
  try { targetAmount = normalizeAmount(input?.targetAmount, "targetAmount"); }
  catch (error) { errors.push(...(error.details ?? ["targetAmount is invalid"])); }
  try { currentAmount = normalizeAmount(input?.currentAmount ?? 0, "currentAmount"); }
  catch (error) { errors.push(...(error.details ?? ["currentAmount is invalid"])); }
  if (!name) errors.push("name is required");
  if (!isDate(targetDate)) errors.push("targetDate must be a valid date");
  if (targetAmount === 0) errors.push("targetAmount must be greater than zero");
  if (currentAmount > targetAmount) errors.push("currentAmount cannot exceed targetAmount");
  if (errors.length) throw validationError(errors);
  const isCompleted = input?.isCompleted === true || currentAmount === targetAmount;
  return Object.freeze({
    id, name, targetAmount, currentAmount, targetDate,
    note: String(input?.note ?? "").trim() || null,
    isCompleted,
    completedAt: isCompleted ? (input?.completedAt ?? now) : null,
    createdAt, updatedAt: now,
  });
}
