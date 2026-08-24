import { AppError, ERROR_CODES } from "../errors/app-error.js";

export const DATA_SCHEMA_VERSION = 2;
export const LOCAL_STORAGE_KEY = "personal-wealth:data";

const COLLECTIONS = Object.freeze([
  "assets",
  "liabilities",
  "assetValueHistory",
  "liabilityValueHistory",
  "goals",
  "snapshots",
  "activities",
  "transactions",
  "monthlyRecords",
  "budgets",
  "recurringTransactions",
]);

function clone(value) {
  return structuredClone(value);
}

export function createDatabase(seed = {}) {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    ...Object.fromEntries(
      COLLECTIONS.map((collection) => [
        collection,
        Array.isArray(seed[collection]) ? clone(seed[collection]) : [],
      ]),
    ),
  };
}

export function migrateDatabase(rawData) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return createDatabase();
  }

  const version = rawData.schemaVersion ?? 0;
  if (!Number.isInteger(version) || version < 0 || version > DATA_SCHEMA_VERSION) {
    throw new AppError(ERROR_CODES.UNSUPPORTED_SCHEMA, "Local data uses an unsupported schema.", {
      details: [`schemaVersion: ${String(version)}`],
    });
  }

  if (version === 0 || version === 1) return createDatabase(rawData);
  return createDatabase(rawData);
}
