import assert from "node:assert/strict";
import test from "node:test";
import { renderGoalsView } from "../js/views/goals-view.js";

const goals = [{
  id: "30000000-0000-4000-8000-000000000001",
  name: "<b>Emergency</b>", targetAmount: 100000, currentAmount: 25000,
  targetDate: "2027-01-31", isCompleted: false,
}];

test("goals view escapes names and renders contribution actions", () => {
  const html = renderGoalsView({ goals, isPrivate: false });
  assert.doesNotMatch(html, /<b>Emergency/);
  assert.match(html, /&lt;b&gt;Emergency/);
  assert.match(html, /data-goal-action="contribute"/);
});

test("goals view masks amounts and has an empty state", () => {
  const privateHtml = renderGoalsView({ goals, isPrivate: true });
  assert.doesNotMatch(privateHtml, />฿100,000</);
  assert.match(privateHtml, /data-sensitive/);
  assert.match(renderGoalsView({ goals: [], isPrivate: false }), /เริ่มเป้าหมายแรก/);
});
