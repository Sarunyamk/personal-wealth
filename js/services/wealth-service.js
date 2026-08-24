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
    getAsset: (id) => repository.getAsset(id),
    createAsset: (input) => repository.createAsset(input),
    updateAsset: (id, changes) => repository.updateAsset(id, changes),
    deactivateAsset: (id) => repository.deactivateAsset(id),
    updateAssetValue: (id, value) => repository.updateAssetValue(id, value),
    listAssetValueHistory: (id) => repository.listAssetValueHistory(id),
    listLiabilities: (options) => repository.listLiabilities(options),
    getLiability: (id) => repository.getLiability(id),
    createLiability: (input) => repository.createLiability(input),
    updateLiability: (id, changes) => repository.updateLiability(id, changes),
    deactivateLiability: (id) => repository.deactivateLiability(id),
    updateLiabilityBalance: (id, value) => repository.updateLiabilityBalance(id, value),
    listLiabilityValueHistory: (id) => repository.listLiabilityValueHistory(id),
    listActivities: (options) => repository.listActivities(options),
  });
}
