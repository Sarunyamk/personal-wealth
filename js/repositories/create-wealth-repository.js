import { createDatabase, migrateDatabase } from "../data/schema.js";
import { isDate } from "../domain/contracts.js";
import { normalizeAmount, normalizeAsset, normalizeLiability } from "../domain/normalizers.js";
import { AppError, ERROR_CODES, validationError } from "../errors/app-error.js";
import { normalizeTransaction } from "../domain/monthly-finance.js";

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

    async getAsset(id) {
      return clone(findRecord(database.assets, id, "Asset"));
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

    async updateAsset(id, changes) {
      const currentAsset = findRecord(database.assets, id, "Asset");
      const timestamp = clock();
      const asset = normalizeAsset(
        { ...currentAsset, ...changes },
        { id, now: timestamp, createdAt: currentAsset.createdAt },
      );
      return commit((draft) => {
        const index = draft.assets.findIndex((record) => record.id === id);
        draft.assets[index] = asset;
        draft.activities.push(
          createActivity("asset", id, "asset_updated", asset.currentValue, timestamp),
        );
        return asset;
      });
    },

    async deactivateAsset(id) {
      const timestamp = clock();
      return commit((draft) => {
        const asset = findRecord(draft.assets, id, "Asset");
        asset.isActive = false;
        asset.updatedAt = timestamp;
        draft.activities.push(
          createActivity("asset", id, "asset_deactivated", asset.currentValue, timestamp),
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

    async getLiability(id) {
      return clone(findRecord(database.liabilities, id, "Liability"));
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

    async updateLiability(id, changes) {
      const currentLiability = findRecord(database.liabilities, id, "Liability");
      const timestamp = clock();
      const liability = normalizeLiability(
        { ...currentLiability, ...changes },
        { id, now: timestamp, createdAt: currentLiability.createdAt },
      );
      return commit((draft) => {
        const index = draft.liabilities.findIndex((record) => record.id === id);
        draft.liabilities[index] = liability;
        draft.activities.push(
          createActivity(
            "liability",
            id,
            "liability_updated",
            liability.currentBalance,
            timestamp,
          ),
        );
        return liability;
      });
    },

    async deactivateLiability(id) {
      const timestamp = clock();
      return commit((draft) => {
        const liability = findRecord(draft.liabilities, id, "Liability");
        liability.isActive = false;
        liability.updatedAt = timestamp;
        draft.activities.push(
          createActivity(
            "liability",
            id,
            "liability_deactivated",
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
      const records = database.activities
        .map((activity, index) => ({ activity, index }))
        .sort(
          (left, right) =>
            right.activity.createdAt.localeCompare(left.activity.createdAt) ||
            right.index - left.index,
        )
        .slice(0, Math.max(0, limit))
        .map(({ activity }) => activity);
      return clone(records);
    },

    async listTransactions({ includeInactive = false } = {}) {
      const records = includeInactive
        ? database.transactions
        : database.transactions.filter((transaction) => transaction.isActive);
      return clone(records);
    },

    async createTransaction(input) {
      const timestamp = clock();
      const transaction = normalizeTransaction(input, {
        id: idGenerator(),
        now: timestamp,
      });
      return commit((draft) => {
        draft.transactions.push(transaction);
        draft.activities.push(
          createActivity(
            "transaction",
            transaction.id,
            "transaction_created",
            transaction.amount,
            timestamp,
          ),
        );
        return transaction;
      });
    },

    async deactivateTransaction(id) {
      const timestamp = clock();
      return commit((draft) => {
        const transaction = findRecord(draft.transactions, id, "Transaction");
        transaction.isActive = false;
        transaction.updatedAt = timestamp;
        draft.activities.push(
          createActivity(
            "transaction",
            id,
            "transaction_deactivated",
            transaction.amount,
            timestamp,
          ),
        );
        return transaction;
      });
    },

    async listGoals() {
      return clone(database.goals);
    },

    async listSnapshots() {
      return clone(
        [...database.snapshots].sort((left, right) =>
          left.snapshotDate.localeCompare(right.snapshotDate),
        ),
      );
    },

    async upsertSnapshot(input) {
      if (!isDate(input?.snapshotDate)) {
        throw validationError(["snapshotDate must be a valid date"]);
      }
      const snapshotDate = `${input.snapshotDate.slice(0, 7)}-01`;
      const values = {
        totalAssets: normalizeAmount(input.totalAssets, "totalAssets"),
        totalLiabilities: normalizeAmount(input.totalLiabilities, "totalLiabilities"),
        netWorth: Number(input.netWorth),
        liquidAssets: normalizeAmount(input.liquidAssets, "liquidAssets"),
        investmentAssets: normalizeAmount(input.investmentAssets, "investmentAssets"),
      };
      if (!Number.isFinite(values.netWorth)) {
        throw validationError(["netWorth must be a finite number"]);
      }
      if (Math.abs(values.netWorth - (values.totalAssets - values.totalLiabilities)) > 0.005) {
        throw validationError(["netWorth must equal totalAssets minus totalLiabilities"]);
      }

      const existing = database.snapshots.find(
        (snapshot) => snapshot.snapshotDate.slice(0, 7) === snapshotDate.slice(0, 7),
      );
      const unchanged =
        existing &&
        Object.entries(values).every(([field, value]) => existing[field] === value);
      if (unchanged) {
        return clone({ snapshot: existing, created: false, changed: false });
      }

      const timestamp = clock();
      const snapshot = {
        id: existing?.id ?? idGenerator(),
        snapshotDate,
        ...values,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      return commit((draft) => {
        const index = draft.snapshots.findIndex(
          (record) => record.snapshotDate.slice(0, 7) === snapshotDate.slice(0, 7),
        );
        if (index === -1) draft.snapshots.push(snapshot);
        else draft.snapshots[index] = snapshot;
        draft.activities.push(
          createActivity(
            "snapshot",
            snapshot.id,
            index === -1 ? "snapshot_created" : "snapshot_updated",
            snapshot.netWorth,
            timestamp,
          ),
        );
        return { snapshot, created: index === -1, changed: true };
      });
    },

    async exportData() {
      return clone(database);
    },
  });
}
