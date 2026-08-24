import { validationError } from "../errors/app-error.js";
import { summarizeMonthlyTransactions } from "./monthly-finance.js";

function assertYear(year) {
  const normalized = Number(year);
  if (!Number.isInteger(normalized) || normalized < 1900 || normalized > 9999) {
    throw validationError(["year must be a four-digit integer"]);
  }
  return normalized;
}

export function buildAnnualReport({ year, transactions = [], snapshots = [] }) {
  const normalizedYear = assertYear(year);
  const yearPrefix = String(normalizedYear);
  const activeTransactions = transactions.filter(
    (transaction) =>
      transaction.isActive !== false && transaction.transactionDate.startsWith(yearPrefix),
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${yearPrefix}-${String(index + 1).padStart(2, "0")}`;
    const monthTransactions = activeTransactions.filter((transaction) =>
      transaction.transactionDate.startsWith(month),
    );
    return Object.freeze({ month, ...summarizeMonthlyTransactions(monthTransactions) });
  });
  const totals = months.reduce(
    (result, month) => ({
      income: result.income + month.income,
      expense: result.expense + month.expense,
      transfers: result.transfers + month.transfers,
      savings: result.savings + month.savings,
    }),
    { income: 0, expense: 0, transfers: 0, savings: 0 },
  );
  const orderedSnapshots = [...snapshots].sort((left, right) =>
    left.snapshotDate.localeCompare(right.snapshotDate),
  );
  const beforeYear = orderedSnapshots.filter(
    (snapshot) => snapshot.snapshotDate < `${yearPrefix}-01-01`,
  );
  const withinYear = orderedSnapshots.filter((snapshot) =>
    snapshot.snapshotDate.startsWith(yearPrefix),
  );
  const openingSnapshot = beforeYear.at(-1) ?? withinYear[0] ?? null;
  const closingSnapshot = withinYear.at(-1) ?? null;
  const openingNetWorth = openingSnapshot?.netWorth ?? null;
  const closingNetWorth = closingSnapshot?.netWorth ?? null;
  const netWorthGrowth =
    openingNetWorth === null || closingNetWorth === null
      ? null
      : closingNetWorth - openingNetWorth;
  const activeMonths = months.filter((month) => month.transactionCount > 0).length;

  return Object.freeze({
    year: normalizedYear,
    months,
    totals: Object.freeze({
      ...totals,
      savingsRate: totals.income > 0 ? (totals.savings / totals.income) * 100 : null,
    }),
    averages: Object.freeze({
      income: activeMonths ? totals.income / activeMonths : 0,
      expense: activeMonths ? totals.expense / activeMonths : 0,
      savings: activeMonths ? totals.savings / activeMonths : 0,
    }),
    activeMonths,
    openingNetWorth,
    closingNetWorth,
    netWorthGrowth,
    snapshots: withinYear,
  });
}

export function buildAnnualExpenseCategories(transactions, year) {
  const yearPrefix = String(assertYear(year));
  const totals = new Map();
  for (const transaction of transactions) {
    if (
      transaction.isActive === false ||
      transaction.type !== "expense" ||
      !transaction.transactionDate.startsWith(yearPrefix)
    ) continue;
    const key = transaction.category.trim().toLocaleLowerCase();
    const current = totals.get(key) ?? { category: transaction.category.trim(), amount: 0 };
    current.amount += transaction.amount;
    totals.set(key, current);
  }
  return [...totals.values()].sort((left, right) => right.amount - left.amount);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildAnnualReportCsv(report) {
  const rows = [
    ["Year", report.year],
    [],
    ["Month", "Income", "Expense", "Savings", "Transfer"],
    ...report.months.map((month) => [
      month.month,
      month.income,
      month.expense,
      month.savings,
      month.transfers,
    ]),
    ["TOTAL", report.totals.income, report.totals.expense, report.totals.savings, report.totals.transfers],
    [],
    ["Savings Rate", report.totals.savingsRate ?? ""],
    ["Opening Net Worth", report.openingNetWorth ?? ""],
    ["Closing Net Worth", report.closingNetWorth ?? ""],
    ["Net Worth Growth", report.netWorthGrowth ?? ""],
    [],
    ["Expense Category", "Amount"],
    ...report.expenseCategories.map((item) => [item.category, item.amount]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
