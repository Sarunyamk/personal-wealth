import assert from "node:assert/strict";
import test from "node:test";
import { onboardingSubmitLabel, renderOnboardingStep } from "../js/views/onboarding-view.js";

test("onboarding renders three focused financial steps", () => {
  assert.match(renderOnboardingStep("asset"), /name="currentValue"/);
  assert.match(renderOnboardingStep("debt"), /name="currentBalance"/);
  assert.match(renderOnboardingStep("goal"), /name="targetDate"/);
});

test("onboarding progress and final action match the current step", () => {
  assert.match(renderOnboardingStep("debt"), /ขั้นที่ 2 จาก 3/);
  assert.equal(onboardingSubmitLabel("asset"), "ถัดไป");
  assert.equal(onboardingSubmitLabel("goal"), "เริ่มใช้งาน");
});
