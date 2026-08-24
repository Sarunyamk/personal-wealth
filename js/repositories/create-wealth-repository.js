import { createDatabase, migrateDatabase } from "../data/schema.js";
import { isDate } from "../domain/contracts.js";
import { normalizeAmount, normalizeAsset, normalizeLiability } from "../domain/normalizers.js";
import { AppError, ERROR_CODES, validationError } from "../errors/app-error.js";
import {
  normalizeBudget,
  normalizeRecurringTransaction,
  normalizeTransaction,
  recurringDateForMonth,
} from "../domain/monthly-finance.js";

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

  function assertMonthOpen(month) {
    if (database.monthlyRecords.some((record) => record.month === month && record.status === "closed")) {
      throw new AppError(ERROR_CODES.VALIDATION, "This month is closed.", {
        details: ["Reopen the month before changing its records"],
      });
    }
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
      assertMonthOpen(String(input?.transactionDate ?? "").slice(0, 7));
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
      const current = findRecord(database.transactions, id, "Transaction");
      assertMonthOpen(current.transactionDate.slice(0, 7));
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

    async listBudgets({ month } = {}) {
      const records = month
        ? database.budgets.filter((budget) => budget.month === month)
        : database.budgets;
      return clone(records);
    },

    async upsertBudget(input) {
      assertMonthOpen(input?.month);
      const existing = database.budgets.find(
        (budget) =>
          budget.month === input?.month &&
          budget.type === input?.type &&
          budget.category.toLocaleLowerCase() ===
            String(input?.category ?? "").trim().toLocaleLowerCase(),
      );
      const timestamp = clock();
      const budget = normalizeBudget(input, {
        id: existing?.id ?? idGenerator(),
        now: timestamp,
        createdAt: existing?.createdAt,
      });
      return commit((draft) => {
        const index = draft.budgets.findIndex((record) => record.id === budget.id);
        if (index === -1) draft.budgets.push(budget);
        else draft.budgets[index] = budget;
        return budget;
      });
    },

    async listRecurringTransactions({ includeInactive = false } = {}) {
      const records = includeInactive
        ? database.recurringTransactions
        : database.recurringTransactions.filter((record) => record.isActive);
      return clone(records);
    },

    async createRecurringTransaction(input) {
      const timestamp = clock();
      const recurring = normalizeRecurringTransaction(input, {
        id: idGenerator(),
        now: timestamp,
      });
      return commit((draft) => {
        draft.recurringTransactions.push(recurring);
        return recurring;
      });
    },

    async deactivateRecurringTransaction(id) {
      const timestamp = clock();
      return commit((draft) => {
        const recurring = findRecord(draft.recurringTransactions, id, "Recurring transaction");
        recurring.isActive = false;
        recurring.updatedAt = timestamp;
        return recurring;
      });
    },

    async materializeRecurringTransactions(month) {
      assertMonthOpen(month);
      const existingSources = new Set(
        database.transactions
          .filter((record) => record.transactionDate.slice(0, 7) === month)
          .map((record) => record.sourceRecurringId)
          .filter(Boolean),
      );
      const timestamp = clock();
      const pending = database.recurringTransactions
        .filter((record) => record.isActive && !existingSources.has(record.id))
        .map((record) => ({
          ...normalizeTransaction(
            {
              ...record,
              transactionDate: recurringDateForMonth(month, record.dayOfMonth),
            },
            { id: idGenerator(), now: timestamp },
          ),
          sourceRecurringId: record.id,
        }));
      if (!pending.length) return [];
      return commit((draft) => {
        draft.transactions.push(...pending);
        return pending;
      });
    },

    async getMonthlyRecord(month) {
      return clone(
        database.monthlyRecords.find((record) => record.month === month) ?? {
          month,
          status: "draft",
          closedAt: null,
        },
      );
    },

    async setMonthStatus(month, status) {
      if (!/^\d{4}-\d{2}$/.test(month) || !["draft", "closed"].includes(status)) {
        throw validationError(["month or status is invalid"]);
      }
      const timestamp = clock();
      return commit((draft) => {
        const index = draft.monthlyRecords.findIndex((record) => record.month === month);
        const existing = index === -1 ? null : draft.monthlyRecords[index];
        const record = {
          ...existing,
          id: existing?.id ?? idGenerator(),
          month,
          status,
          closedAt: status === "closed" ? (existing?.closedAt ?? timestamp) : null,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        if (index === -1) draft.monthlyRecords.push(record);
        else draft.monthlyRecords[index] = record;
        return record;
      });
    },

    async setMonthReconciliation(month, input) {
      assertMonthOpen(month);
      if (!/^\d{4}-\d{2}$/.test(month)) throw validationError(["month must use YYYY-MM"]);
      const asset = findRecord(database.assets, input?.assetId, "Asset");
      if (!asset.isActive) throw validationError(["asset must be active"]);
      const closingCash = normalizeAmount(input?.closingCash, "closingCash");
      const timestamp = clock();
      return commit((draft) => {
        const index = draft.monthlyRecords.findIndex((record) => record.month === month);
        const existing = index === -1 ? null : draft.monthlyRecords[index];
        const record = {
          ...existing,
          id: existing?.id ?? idGenerator(),
          month,
          status: existing?.status ?? "draft",
          closedAt: existing?.closedAt ?? null,
          reconciliation: {
            assetId: asset.id,
            closingCash,
            assetValue: asset.currentValue,
            difference: closingCash - asset.currentValue,
            reconciledAt: timestamp,
          },
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        if (index === -1) draft.monthlyRecords.push(record);
        else draft.monthlyRecords[index] = record;
        return record;
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
