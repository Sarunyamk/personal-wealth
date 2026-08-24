export const TREND_RANGES = Object.freeze(["3M", "6M", "1Y", "ALL"]);

export function sortSnapshots(snapshots = []) {
  return [...snapshots].sort((left, right) =>
    left.snapshotDate.localeCompare(right.snapshotDate),
  );
}

export function filterSnapshotsByRange(snapshots = [], range = "6M") {
  const sorted = sortSnapshots(snapshots);
  const limits = { "3M": 3, "6M": 6, "1Y": 12, ALL: Number.POSITIVE_INFINITY };
  const limit = limits[range] ?? limits["6M"];
  return Number.isFinite(limit) ? sorted.slice(-limit) : sorted;
}

export function calculateSnapshotChange(snapshots = []) {
  const sorted = sortSnapshots(snapshots);
  if (sorted.length < 2) return Object.freeze({ amount: null, percentage: null });
  const current = sorted.at(-1).netWorth;
  const previous = sorted.at(-2).netWorth;
  const amount = current - previous;
  return Object.freeze({
    amount,
    percentage: previous === 0 ? null : (amount / Math.abs(previous)) * 100,
  });
}

export function calculateDebtRatio(totalAssets, totalLiabilities) {
  if (!Number.isFinite(totalAssets) || totalAssets <= 0) return null;
  return Math.max(0, totalLiabilities) / totalAssets;
}

export function calculateFinancialHealth({
  totalAssets,
  totalLiabilities,
  liquidAssets,
  netWorthGrowthPercentage,
}) {
  const debtRatio = calculateDebtRatio(totalAssets, totalLiabilities);
  const liquidityRatio = totalAssets > 0 ? Math.max(0, liquidAssets) / totalAssets : null;

  const debtScore =
    debtRatio === null ? null : debtRatio <= 0.2 ? 100 : debtRatio <= 0.4 ? 75 : debtRatio <= 0.6 ? 45 : 15;
  const liquidityScore =
    liquidityRatio === null
      ? null
      : liquidityRatio >= 0.1
        ? 100
        : liquidityRatio >= 0.05
          ? 65
          : 25;
  const growthScore =
    netWorthGrowthPercentage === null
      ? null
      : netWorthGrowthPercentage > 0
        ? 100
        : netWorthGrowthPercentage === 0
          ? 60
          : 20;
  const availableScores = [debtScore, liquidityScore, growthScore].filter(
    (score) => score !== null,
  );
  const score =
    availableScores.length === 0
      ? null
      : Math.round(availableScores.reduce((total, value) => total + value, 0) / availableScores.length);

  return Object.freeze({
    score,
    status: score === null ? "Not available" : score >= 80 ? "Looking good" : score >= 55 ? "Keep watching" : "Needs attention",
    debtRatio,
    liquidityRatio,
    netWorthGrowthPercentage,
    emergencyFundMonths: null,
    savingsRate: null,
  });
}

export function toMonthStart(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}
