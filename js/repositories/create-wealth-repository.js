import { createDatabase, migrateDatabase } from "../data/schema.js";
import { normalizeAmount, normalizeAsset, normalizeLiability } from "../domain/normalizers.js";
import { AppError, ERROR_CODES } from "../errors/app-error.js";

function clone(value) {
  return structuredClone(value);
}

function defaultIdGenerator() {
  return crypto.randomUUID();
}

function defaultClock() {
  return new Date().toISOString();
}

function findRecord(records, id, entityName) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `${entityName} was not found.`, {
      details: [`id: ${String(id)}`],
    });
  }
  return record;
}

export function createWealthRepository({
  initialData = createDatabase(),
  persist = () => {},
  idGenerator = defaultIdGenerator,
  clock = defaultClock,
} = {}) {
  let database = migrateDatabase(initialData);

  async function commit(mutate) {
    const nextDatabase = clone(database);
    const result = mutate(nextDatabase);
    await persist(clone(nextDatabase));
    database = nextDatabase;
    return clone(result);
  }

  function createHistoryRecord(entityId, value, recordedAt, valueField) {
    return {
      id: idGenerator(),
      entityId,
      [valueField]: value,
      recordedAt,
    };
  }

  function createActivity(entityType, entityId, action, value, createdAt) {
    return {
      id: idGenerator(),
      entityType,
      entityId,
      action,
      value,
      createdAt,
    };
  }

  return Object.freeze({
    async listAssets({ includeInactive = false } = {}) {
      const records = includeInactive
        ? database.assets
        : database.assets.filter((asset) => asset.isActive);
      return clone(records);
    },

    async createAsset(input) {
      const timestamp = clock();
      const asset = normalizeAsset(input, { id: idGenerator(), now: timestamp });
      return commit((draft) => {
        draft.assets.push(asset);
        draft.assetValueHistory.push(
          createHistoryRecord(asset.id, asset.currentValue, timestamp, "value"),
        );
        draft.activities.push(
          createActivity("asset", asset.id, "asset_created", asset.currentValue, timestamp),
        );
        return asset;
      });
    },

    async updateAssetValue(id, nextValue) {
      const value = normalizeAmount(nextValue, "currentValue");
      const timestamp = clock();
      return commit((draft) => {
        const asset = findRecord(draft.assets, id, "Asset");
        asset.currentValue = value;
        asset.updatedAt = timestamp;
        draft.assetValueHistory.push(createHistoryRecord(id, value, timestamp, "value"));
        draft.activities.push(
          createActivity("asset", id, "asset_value_updated", value, timestamp),
        );
        return asset;
      });
    },

    async listAssetValueHistory(assetId) {
      return clone(
        database.assetValueHistory.filter((record) => record.entityId === assetId),
      );
    },

    async listLiabilities({ includeInactive = false } = {}) {
      const records = includeInactive
        ? database.liabilities
        : database.liabilities.filter((liability) => liability.isActive);
      return clone(records);
    },

    async createLiability(input) {
      const timestamp = clock();
      const liability = normalizeLiability(input, { id: idGenerator(), now: timestamp });
      return commit((draft) => {
        draft.liabilities.push(liability);
        draft.liabilityValueHistory.push(
          createHistoryRecord(liability.id, liability.currentBalance, timestamp, "balance"),
        );
        draft.activities.push(
          createActivity(
            "liability",
            liability.id,
            "liability_created",
            liability.currentBalance,
            timestamp,
          ),
        );
        return liability;
      });
    },

    async updateLiabilityBalance(id, nextBalance) {
      const balance = normalizeAmount(nextBalance, "currentBalance");
      const timestamp = clock();
      return commit((draft) => {
        const liability = findRecord(draft.liabilities, id, "Liability");
        if (balance > liability.originalAmount) {
          throw new AppError(
            ERROR_CODES.VALIDATION,
            "The submitted data is invalid.",
            { details: ["currentBalance cannot exceed originalAmount"] },
          );
        }
        liability.currentBalance = balance;
        liability.updatedAt = timestamp;
        draft.liabilityValueHistory.push(
          createHistoryRecord(id, balance, timestamp, "balance"),
        );
        draft.activities.push(
          createActivity(
            "liability",
            id,
            "liability_balance_updated",
            balance,
            timestamp,
          ),
        );
        return liability;
      });
    },

    async listLiabilityValueHistory(liabilityId) {
      return clone(
        database.liabilityValueHistory.filter((record) => record.entityId === liabilityId),
      );
    },

    async listActivities({ limit = 20 } = {}) {
      return clone(database.activities.slice(-Math.max(0, limit)).reverse());
    },

    async exportData() {
      return clone(database);
    },
  });
}
