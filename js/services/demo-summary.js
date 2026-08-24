import { DEMO_SEED } from "../data/seed.js";
import {
  calculateLiquidAssets,
  calculateNetWorth,
  sumAssets,
  sumLiabilities,
} from "../domain/calculators.js";
import { assertValidSeedData } from "../domain/contracts.js";

export function getDemoSummary() {
  assertValidSeedData(DEMO_SEED);
  return Object.freeze({
    totalAssets: sumAssets(DEMO_SEED.assets),
    totalLiabilities: sumLiabilities(DEMO_SEED.liabilities),
    netWorth: calculateNetWorth(DEMO_SEED.assets, DEMO_SEED.liabilities),
    liquidAssets: calculateLiquidAssets(DEMO_SEED.assets),
  });
}
