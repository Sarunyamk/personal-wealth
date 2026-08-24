import {
  LOCAL_STORAGE_KEY,
  createDatabase,
  migrateDatabase,
} from "../data/schema.js";
import { AppError, ERROR_CODES } from "../errors/app-error.js";
import { createWealthRepository } from "./create-wealth-repository.js";

function readDatabase(storage, key, seed) {
  try {
    const serialized = storage.getItem(key);
    return serialized === null ? createDatabase(seed) : migrateDatabase(JSON.parse(serialized));
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(ERROR_CODES.STORAGE, "Local data could not be read.", { cause });
  }
}

export function createLocalStorageWealthRepository({
  storage = window.localStorage,
  key = LOCAL_STORAGE_KEY,
  seed,
  idGenerator,
  clock,
} = {}) {
  const initialData = readDatabase(storage, key, seed);

  return createWealthRepository({
    initialData,
    idGenerator,
    clock,
    persist(database) {
      try {
        storage.setItem(key, JSON.stringify(database));
      } catch (cause) {
        throw new AppError(ERROR_CODES.STORAGE, "Local data could not be saved.", { cause });
      }
    },
  });
}
