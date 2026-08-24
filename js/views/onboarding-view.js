function field(label, name, attributes = "") {
  return `<label class="field"><span class="field__label">${label}</span><input class="field__input" name="${name}" ${attributes} required /></label>`;
}

export function renderOnboardingStep(step) {
  const stepNumber = { asset: 1, debt: 2, goal: 3 }[step];
  const progress = `<div class="onboarding-progress" aria-label="ขั้นที่ ${stepNumber} จาก 3">${[1, 2, 3].map((item) => `<span class="${item <= stepNumber ? "is-active" : ""}"></span>`).join("")}</div>`;
  if (step === "asset") return `${progress}<div class="onboarding-copy"><p>ขั้นที่ 1 จาก 3</p><h2>เพิ่ม Asset แรก</h2></div>
    ${field("ชื่อ Asset", "name", 'autocomplete="off"')}${field("มูลค่าปัจจุบัน", "currentValue", 'type="number" min="0" step="0.01" inputmode="decimal"')}
    <label class="field"><span class="field__label">ประเภท</span><select class="field__input" name="category"><option value="bank-account">Bank Account</option><option value="cash">Cash</option><option value="investment">Investment</option><option value="property">Property</option><option value="other">Other</option></select></label>`;
  if (step === "debt") return `${progress}<div class="onboarding-copy"><p>ขั้นที่ 2 จาก 3</p><h2>เพิ่มหนี้ที่ต้องติดตาม</h2></div>
    ${field("ชื่อหนี้", "name", 'autocomplete="off"')}${field("ยอดหนี้เริ่มต้น", "originalAmount", 'type="number" min="0" step="0.01"')}${field("ยอดคงเหลือ", "currentBalance", 'type="number" min="0" step="0.01"')}
    <label class="field"><span class="field__label">ประเภท</span><select class="field__input" name="category"><option value="credit-card">Credit Card</option><option value="home-loan">Home Loan</option><option value="car-loan">Car Loan</option><option value="personal-loan">Personal Loan</option><option value="other-debt">Other Debt</option></select></label>`;
  return `${progress}<div class="onboarding-copy"><p>ขั้นที่ 3 จาก 3</p><h2>ตั้ง Goal แรก</h2></div>
    ${field("ชื่อเป้าหมาย", "name", 'autocomplete="off"')}${field("ยอดเป้าหมาย", "targetAmount", 'type="number" min="0.01" step="0.01"')}${field("ยอดเริ่มต้น", "currentAmount", 'type="number" min="0" step="0.01" value="0"')}${field("วันที่เป้าหมาย", "targetDate", 'type="date"')}`;
}

export function onboardingSubmitLabel(step) {
  return step === "goal" ? "เริ่มใช้งาน" : "ถัดไป";
}
