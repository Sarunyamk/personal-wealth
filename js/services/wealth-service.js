import {
  calculateAssetAllocation,
  calculateLiquidAssets,
  calculateNetWorth,
  sumAssets,
  sumLiabilities,
} from "../domain/calculators.js";

export function createWealthService(repository) {
  if (!repository) throw new TypeError("A wealth repository is required.");

  return Object.freeze({
    async getSummary() {
      const [assets, liabilities] = await Promise.all([
        repository.listAssets(),
        repository.listLiabilities(),
      ]);
      return Object.freeze({
        totalAssets: sumAssets(assets),
        totalLiabilities: sumLiabilities(liabilities),
        netWorth: calculateNetWorth(assets, liabilities),
        liquidAssets: calculateLiquidAssets(assets),
        assetAllocation: calculateAssetAllocation(assets),
        assetCount: assets.length,
        liabilityCount: liabilities.length,
      });
    },
    listAssets: (options) => repository.listAssets(options),
    createAsset: (input) => repository.createAsset(input),
    updateAssetValue: (id, value) => repository.updateAssetValue(id, value),
    listAssetValueHistory: (id) => repository.listAssetValueHistory(id),
    listLiabilities: (options) => repository.listLiabilities(options),
    createLiability: (input) => repository.createLiability(input),
    updateLiabilityBalance: (id, value) => repository.updateLiabilityBalance(id, value),
    listLiabilityValueHistory: (id) => repository.listLiabilityValueHistory(id),
    listActivities: (options) => repository.listActivities(options),
  });
}
