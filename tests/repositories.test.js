import test from "node:test";
import assert from "node:assert/strict";
import { DATA_SCHEMA_VERSION, LOCAL_STORAGE_KEY } from "../js/data/schema.js";
import { ERROR_CODES } from "../js/errors/app-error.js";
import { createLocalStorageWealthRepository } from "../js/repositories/local-storage-wealth-repository.js";
import { createMemoryWealthRepository } from "../js/repositories/memory-wealth-repository.js";

function createIdGenerator() {
  let counter = 0;
  return () => {
    counter += 1;
    return `90000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  };
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const fixedClock = () => "2026-08-24T04:30:00.000Z";

test("asset mutations normalize input and atomically create history and activity", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const asset = await repository.createAsset({
    name: "  SCB Saving  ",
    category: "bank-account",
    currentValue: "125000",
    currency: "THB",
    liquidityLevel: "high",
  });

  assert.equal(asset.name, "SCB Saving");
  assert.equal(asset.currentValue, 125000);
  await repository.updateAssetValue(asset.id, "127500");

  const [assets, history, activities] = await Promise.all([
    repository.listAssets(),
    repository.listAssetValueHistory(asset.id),
    repository.listActivities(),
  ]);
  assert.equal(assets[0].currentValue, 127500);
  assert.deepEqual(
    history.map((record) => record.value),
    [125000, 127500],
  );
  assert.deepEqual(
    activities.map((record) => record.action),
    ["asset_value_updated", "asset_created"],
  );
});

test("liability mutations create balance history and reject balances above original debt", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const liability = await repository.createLiability({
    name: "Home Loan",
    category: "home-loan",
    originalAmount: 2500000,
    currentBalance: 1850000,
  });

  await assert.rejects(
    repository.updateLiabilityBalance(liability.id, 2600000),
    (error) => error.code === ERROR_CODES.VALIDATION,
  );
  assert.equal((await repository.listLiabilityValueHistory(liability.id)).length, 1);
  assert.equal((await repository.listLiabilities())[0].currentBalance, 1850000);
});

test("invalid asset input does not leave partial records", async () => {
  const repository = createMemoryWealthRepository({ idGenerator: createIdGenerator() });
  await assert.rejects(
    repository.createAsset({
      name: "Broken",
      category: "cash",
      currentValue: -1,
      liquidityLevel: "high",
    }),
    (error) => error.code === ERROR_CODES.VALIDATION,
  );
  assert.deepEqual(await repository.listAssets(), []);
  assert.deepEqual(await repository.listActivities(), []);
});

test("local storage adapter restores committed records after recreation", async () => {
  const storage = createMemoryStorage();
  const options = { storage, idGenerator: createIdGenerator(), clock: fixedClock };
  const firstRepository = createLocalStorageWealthRepository(options);
  await firstRepository.createAsset({
    name: "Cash",
    category: "cash",
    currentValue: 5000,
    liquidityLevel: "high",
  });

  const secondRepository = createLocalStorageWealthRepository(options);
  assert.equal((await secondRepository.listAssets())[0].currentValue, 5000);
  assert.equal(
    JSON.parse(storage.getItem(LOCAL_STORAGE_KEY)).schemaVersion,
    DATA_SCHEMA_VERSION,
  );
});

test("transaction mutations persist atomically and preserve archived records", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const transaction = await repository.createTransaction({
    type: "transfer",
    name: "Dime and ETF",
    category: "investment",
    amount: "5000",
    transactionDate: "2026-08-24",
  });

  await repository.deactivateTransaction(transaction.id);

  assert.deepEqual(await repository.listTransactions(), []);
  assert.equal(
    (await repository.listTransactions({ includeInactive: true }))[0].amount,
    5000,
  );
  assert.deepEqual(
    (await repository.listActivities()).map((activity) => activity.action),
    ["transaction_deactivated", "transaction_created"],
  );
});

test("budget upsert keeps one plan per month type and category", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const first = await repository.upsertBudget({
    month: "2026-08",
    type: "expense",
    category: "Food",
    plannedAmount: 3000,
  });
  const updated = await repository.upsertBudget({
    month: "2026-08",
    type: "expense",
    category: "food",
    plannedAmount: 3500,
  });

  const budgets = await repository.listBudgets({ month: "2026-08" });
  assert.equal(budgets.length, 1);
  assert.equal(updated.id, first.id);
  assert.equal(budgets[0].plannedAmount, 3500);
});

test("failed persistence leaves repository state unchanged", async () => {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota exceeded");
    },
  };
  const repository = createLocalStorageWealthRepository({
    storage,
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });

  await assert.rejects(
    repository.createAsset({
      name: "Cash",
      category: "cash",
      currentValue: 5000,
      liquidityLevel: "high",
    }),
    (error) => error.code === ERROR_CODES.STORAGE,
  );
  assert.deepEqual(await repository.listAssets(), []);
});

test("edit and deactivate preserve asset history while removing it from active lists", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const asset = await repository.createAsset({
    name: "Cash",
    category: "cash",
    currentValue: 5000,
    liquidityLevel: "high",
  });
  const edited = await repository.updateAsset(asset.id, {
    name: "Travel Cash",
    institution: "Home",
  });
  await repository.deactivateAsset(asset.id);

  assert.equal(edited.name, "Travel Cash");
  assert.deepEqual(await repository.listAssets(), []);
  assert.equal((await repository.listAssets({ includeInactive: true }))[0].isActive, false);
  assert.equal((await repository.listAssetValueHistory(asset.id)).length, 1);
  assert.equal((await repository.getAsset(asset.id)).institution, "Home");
});

test("edit and deactivate preserve liability balance history", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const liability = await repository.createLiability({
    name: "Car Loan",
    category: "car-loan",
    originalAmount: 500000,
    currentBalance: 300000,
  });
  await repository.updateLiability(liability.id, { monthlyPayment: "12000" });
  await repository.deactivateLiability(liability.id);

  assert.deepEqual(await repository.listLiabilities(), []);
  assert.equal((await repository.getLiability(liability.id)).monthlyPayment, 12000);
  assert.equal((await repository.listLiabilityValueHistory(liability.id)).length, 1);
});

test("monthly snapshot upsert is idempotent and updates one row when totals change", async () => {
  const repository = createMemoryWealthRepository({
    idGenerator: createIdGenerator(),
    clock: fixedClock,
  });
  const snapshot = {
    snapshotDate: "2026-08-24",
    totalAssets: 1000000,
    totalLiabilities: 100000,
    netWorth: 900000,
    liquidAssets: 200000,
    investmentAssets: 500000,
  };

  const created = await repository.upsertSnapshot(snapshot);
  const unchanged = await repository.upsertSnapshot(snapshot);
  const updated = await repository.upsertSnapshot({
    ...snapshot,
    totalAssets: 1010000,
    netWorth: 910000,
  });

  assert.equal(created.created, true);
  assert.equal(unchanged.changed, false);
  assert.equal(updated.created, false);
  assert.equal((await repository.listSnapshots()).length, 1);
  assert.equal((await repository.listSnapshots())[0].snapshotDate, "2026-08-01");
  assert.equal((await repository.listActivities()).length, 2);
});
