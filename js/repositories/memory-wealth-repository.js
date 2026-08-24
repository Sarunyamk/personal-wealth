import { createDatabase } from "../data/schema.js";
import { createWealthRepository } from "./create-wealth-repository.js";

export function createMemoryWealthRepository({ seed, idGenerator, clock } = {}) {
  return createWealthRepository({
    initialData: createDatabase(seed),
    idGenerator,
    clock,
  });
}
