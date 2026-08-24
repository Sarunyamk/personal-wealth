import { isDate } from "./contracts.js";
import { normalizeAmount } from "./normalizers.js";
import { validationError } from "../errors/app-error.js";

export const TRANSACTION_TYPES = Object.freeze(["income", "expense", "transfer"]);

export function normalizeTransaction(input, { id, now }) {
  const errors = [];
  const type = String(input?.type ?? "").trim();
  const category = String(input?.category ?? "").trim();
  const name = String(input?.name ?? "").trim();
  const transactionDate = String(input?.transactionDate ?? "");
  let amount;

  try {
    amount = normalizeAmount(input?.amount, "amount");
    if (amount === 0) errors.push("amount must be greater than zero");
  } catch (error) {
    errors.push(...(error.details ?? ["amount is invalid"]));
  }
  if (!TRANSACTION_TYPES.includes(type)) errors.push("type is invalid");
  if (!name) errors.push("name is required");
  if (!category) errors.push("category is required");
  if (!isDate(transactionDate)) errors.push("transactionDate must be a valid date");
  if (errors.length) throw validationError(errors);

  return Object.freeze({
    id,
    type,
    name,
    category,
    amount,
    transactionDate,
    note: String(input?.note ?? "").trim() || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export function summarizeMonthlyTransactions(transactions) {
  const active = transactions.filter((transaction) => transaction.isActive !== false);
  const total = (type) =>
    active
      .filter((transaction) => transaction.type === type)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  const income = total("income");
  const expense = total("expense");
  const transfers = total("transfer");
  const savings = income - expense;

  return Object.freeze({
    income,
    expense,
    transfers,
    savings,
    cashFlow: savings,
    savingsRate: income > 0 ? (savings / income) * 100 : null,
    transactionCount: active.length,
  });
}

export function filterTransactionsByMonth(transactions, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw validationError(["month must use YYYY-MM"]);
  return transactions
    .filter((transaction) => transaction.transactionDate.slice(0, 7) === month)
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate));
}
