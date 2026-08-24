import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_CODES } from "../js/errors/app-error.js";
import { createMemoryWealthRepository } from "../js/repositories/memory-wealth-repository.js";

function ids() {
  let value = 0;
  return () => `90000000-0000-4000-8000-${String(++value).padStart(12, "0")}`;
}
const clock = () => "2026-08-24T00:00:00.000Z";

test("goal contribution updates progress and history atomically", async () => {
  const repository = createMemoryWealthRepository({ idGenerator: ids(), clock });
  const goal = await repository.createGoal({
    name: "Emergency Fund", targetAmount: 100000, currentAmount: 20000,
    targetDate: "2027-01-31",
  });
  const result = await repository.contributeToGoal(goal.id, {
    amount: 5000, contributionDate: "2026-08-24",
  });
  assert.equal(result.goal.currentAmount, 25000);
  assert.equal((await repository.listGoalContributions(goal.id))[0].amount, 5000);
  assert.equal((await repository.getGoal(goal.id)).currentAmount, 25000);
});

test("invalid contribution leaves goal and history unchanged", async () => {
  const repository = createMemoryWealthRepository({ idGenerator: ids(), clock });
  const goal = await repository.createGoal({
    name: "Trip", targetAmount: 10000, currentAmount: 9000, targetDate: "2026-12-01",
  });
  await assert.rejects(
    repository.contributeToGoal(goal.id, { amount: 2000, contributionDate: "2026-08-24" }),
    (error) => error.code === ERROR_CODES.VALIDATION,
  );
  assert.equal((await repository.getGoal(goal.id)).currentAmount, 9000);
  assert.deepEqual(await repository.listGoalContributions(goal.id), []);
});

test("completing a goal records its completed state", async () => {
  const repository = createMemoryWealthRepository({ idGenerator: ids(), clock });
  const goal = await repository.createGoal({
    name: "Laptop", targetAmount: 50000, currentAmount: 10000, targetDate: "2027-03-01",
  });
  const completed = await repository.completeGoal(goal.id);
  assert.equal(completed.currentAmount, 50000);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.completedAt, clock());
});
