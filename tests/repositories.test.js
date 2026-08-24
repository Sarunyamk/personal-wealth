import test from "node:test";
import assert from "node:assert/strict";
import { LOCAL_STORAGE_KEY } from "../js/data/schema.js";
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
  assert.equal(JSON.parse(storage.getItem(LOCAL_STORAGE_KEY)).schemaVersion, 1);
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
