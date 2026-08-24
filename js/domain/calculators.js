function finiteAmount(value) {
  return Number.isFinite(value) ? value : 0;
}

export function sumAssets(assets = []) {
  return assets
    .filter((asset) => asset.isActive !== false)
    .reduce((total, asset) => total + finiteAmount(asset.currentValue), 0);
}

export function sumLiabilities(liabilities = []) {
  return liabilities
    .filter((liability) => liability.isActive !== false)
    .reduce((total, liability) => total + finiteAmount(liability.currentBalance), 0);
}

export function calculateNetWorth(assets = [], liabilities = []) {
  return sumAssets(assets) - sumLiabilities(liabilities);
}

export function calculateLiquidAssets(assets = []) {
  return assets
    .filter((asset) => asset.isActive !== false && asset.liquidityLevel === "high")
    .reduce((total, asset) => total + finiteAmount(asset.currentValue), 0);
}

export function calculateAssetAllocation(assets = []) {
  const activeAssets = assets.filter(
    (asset) => asset.isActive !== false && finiteAmount(asset.currentValue) > 0,
  );
  const total = sumAssets(activeAssets);
  const valuesByCategory = new Map();

  for (const asset of activeAssets) {
    const category = asset.category || "other";
    valuesByCategory.set(
      category,
      (valuesByCategory.get(category) ?? 0) + asset.currentValue,
    );
  }

  return [...valuesByCategory.entries()]
    .map(([category, value]) => ({
      category,
      value,
      percentage: total === 0 ? 0 : (value / total) * 100,
    }))
    .sort((left, right) => right.value - left.value);
}

export function calculateDebtPaidPercentage(originalAmount, currentBalance) {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return 0;
  const percentage = ((originalAmount - finiteAmount(currentBalance)) / originalAmount) * 100;
  return Math.min(100, Math.max(0, percentage));
}

export function calculateGoalPercentage(currentAmount, targetAmount) {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0;
  const percentage = (finiteAmount(currentAmount) / targetAmount) * 100;
  return Math.min(100, Math.max(0, percentage));
}
