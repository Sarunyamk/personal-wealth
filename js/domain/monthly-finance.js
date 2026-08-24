import { isDate } from "./contracts.js";
import { normalizeAmount } from "./normalizers.js";
import { validationError } from "../errors/app-error.js";

export const TRANSACTION_TYPES = Object.freeze(["income", "expense", "transfer"]);

export function normalizeBudget(input, { id, now, createdAt = now }) {
  const errors = [];
  const month = String(input?.month ?? "");
  const type = String(input?.type ?? "").trim();
  const category = String(input?.category ?? "").trim();
  let plannedAmount;
  try {
    plannedAmount = normalizeAmount(input?.plannedAmount, "plannedAmount");
  } catch (error) {
    errors.push(...(error.details ?? ["plannedAmount is invalid"]));
  }
  if (!/^\d{4}-\d{2}$/.test(month)) errors.push("month must use YYYY-MM");
  if (!TRANSACTION_TYPES.includes(type)) errors.push("type is invalid");
  if (!category) errors.push("category is required");
  if (errors.length) throw validationError(errors);
  return Object.freeze({ id, month, type, category, plannedAmount, createdAt, updatedAt: now });
}

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

export function buildBudgetComparison(budgets, transactions) {
  const actualByKey = new Map();
  for (const transaction of transactions.filter((item) => item.isActive !== false)) {
    const key = `${transaction.type}:${transaction.category.toLocaleLowerCase()}`;
    actualByKey.set(key, (actualByKey.get(key) ?? 0) + transaction.amount);
  }
  return budgets
    .map((budget) => {
      const key = `${budget.type}:${budget.category.toLocaleLowerCase()}`;
      const actualAmount = actualByKey.get(key) ?? 0;
      actualByKey.delete(key);
      return Object.freeze({
        ...budget,
        actualAmount,
        variance:
          budget.type === "income"
            ? actualAmount - budget.plannedAmount
            : budget.plannedAmount - actualAmount,
      });
    })
    .concat(
      [...actualByKey.entries()].map(([key, actualAmount]) => {
        const separator = key.indexOf(":");
        return Object.freeze({
          id: null,
          type: key.slice(0, separator),
          category: key.slice(separator + 1),
          plannedAmount: 0,
          actualAmount,
          variance: -actualAmount,
        });
      }),
    );
}
