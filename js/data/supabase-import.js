import { migrateDatabase } from "./schema.js";
import { assertValidSeedData } from "../domain/contracts.js";
import { toSupabaseRow } from "../repositories/supabase-row-mapper.js";

const IMPORT_ORDER = Object.freeze([
  "assets",
  "liabilities",
  "recurringTransactions",
  "goals",
  "assetValueHistory",
  "liabilityValueHistory",
  "goalContributions",
  "transactions",
  "budgets",
  "monthlyRecords",
  "snapshots",
  "activities",
]);

const TABLES = Object.freeze({
  assets: "assets",
  liabilities: "liabilities",
  recurringTransactions: "recurring_transactions",
  goals: "goals",
  assetValueHistory: "asset_value_history",
  liabilityValueHistory: "liability_value_history",
  goalContributions: "goal_contributions",
  transactions: "transactions",
  budgets: "budgets",
  monthlyRecords: "monthly_records",
  snapshots: "snapshots",
  activities: "activities",
});

function monthDate(month) {
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month;
}

function importRow(collection, record) {
  let source = { ...record };
  if (collection === "assetValueHistory") {
    source = { ...source, assetId: source.entityId };
    delete source.entityId;
  }
  if (collection === "liabilityValueHistory") {
    source = { ...source, liabilityId: source.entityId };
    delete source.entityId;
  }
  if (collection === "monthlyRecords") {
    source.month = monthDate(source.month);
    if (source.reconciliation) {
      source = {
        ...source,
        reconciliationAssetId: source.reconciliation.assetId,
        closingCash: source.reconciliation.closingCash,
        assetValue: source.reconciliation.assetValue,
        difference: source.reconciliation.difference,
        reconciledAt: source.reconciliation.reconciledAt,
      };
      delete source.reconciliation;
    }
  }
  if (collection === "budgets") source.month = monthDate(source.month);
  if (collection === "recurringTransactions") {
    source.startMonth = monthDate(source.startMonth);
    source.endMonth = source.endMonth ? monthDate(source.endMonth) : null;
  }
  return { id: record.id, ...toSupabaseRow(source) };
}

export function buildSupabaseImportPlan(rawDatabase) {
  const database = migrateDatabase(rawDatabase);
  assertValidSeedData(database);
  return Object.freeze(
    IMPORT_ORDER.map((collection) =>
      Object.freeze({
        collection,
        table: TABLES[collection],
        rows: Object.freeze(database[collection].map((record) => Object.freeze(importRow(collection, record)))),
      }),
    ),
  );
}

export function summarizeSupabaseImport(plan) {
  return Object.freeze(
    Object.fromEntries(plan.map(({ collection, rows }) => [collection, rows.length])),
  );
}
