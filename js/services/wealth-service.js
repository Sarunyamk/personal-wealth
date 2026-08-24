import {
  calculateAssetAllocation,
  calculateLiquidAssets,
  calculateNetWorth,
  sumAssets,
  sumLiabilities,
} from "../domain/calculators.js";
import {
  calculateFinancialHealth,
  calculateSnapshotChange,
  toMonthStart,
} from "../domain/dashboard.js";

const INVESTMENT_CATEGORIES = new Set(["investment", "stock", "fund", "crypto", "gold"]);

function buildSummary(assets, liabilities) {
  return Object.freeze({
    totalAssets: sumAssets(assets),
    totalLiabilities: sumLiabilities(liabilities),
    netWorth: calculateNetWorth(assets, liabilities),
    liquidAssets: calculateLiquidAssets(assets),
    investmentAssets: assets
      .filter((asset) => INVESTMENT_CATEGORIES.has(asset.category))
      .reduce((total, asset) => total + asset.currentValue, 0),
    assetAllocation: calculateAssetAllocation(assets),
    assetCount: assets.length,
    liabilityCount: liabilities.length,
  });
}

export function createWealthService(repository) {
  if (!repository) throw new TypeError("A wealth repository is required.");

  async function loadFinancialRecords() {
    const [assets, liabilities] = await Promise.all([
      repository.listAssets(),
      repository.listLiabilities(),
    ]);
    return { assets, liabilities, summary: buildSummary(assets, liabilities) };
  }

  async function syncMonthlySnapshot(date = new Date()) {
    const records = await loadFinancialRecords();
    const result = await repository.upsertSnapshot({
      snapshotDate: toMonthStart(date),
      totalAssets: records.summary.totalAssets,
      totalLiabilities: records.summary.totalLiabilities,
      netWorth: records.summary.netWorth,
      liquidAssets: records.summary.liquidAssets,
      investmentAssets: records.summary.investmentAssets,
    });
    return { ...records, snapshotResult: result };
  }

  return Object.freeze({
    async getSummary() {
      return (await loadFinancialRecords()).summary;
    },

    async getDashboardData({ date = new Date() } = {}) {
      const { assets, liabilities, summary, snapshotResult } = await syncMonthlySnapshot(date);
      const [snapshots, goals, activities] = await Promise.all([
        repository.listSnapshots(),
        repository.listGoals(),
        repository.listActivities({ limit: 8 }),
      ]);
      const change = calculateSnapshotChange(snapshots);
      const entityNames = new Map([
        ...assets.map((asset) => [asset.id, asset.name]),
        ...liabilities.map((liability) => [liability.id, liability.name]),
      ]);
      const health = calculateFinancialHealth({
        ...summary,
        netWorthGrowthPercentage: change.percentage,
      });
      return Object.freeze({
        summary,
        snapshots,
        goals,
        change,
        health,
        snapshotResult,
        activities: activities.map((activity) => ({
          ...activity,
          entityName:
            activity.entityType === "snapshot"
              ? "Monthly Snapshot"
              : entityNames.get(activity.entityId) ?? "Archived record",
        })),
      });
    },

    syncMonthlySnapshot,
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
    listSnapshots: () => repository.listSnapshots(),
    listGoals: () => repository.listGoals(),
  });
}
