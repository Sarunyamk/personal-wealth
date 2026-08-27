import assert from "node:assert/strict";
import test from "node:test";
import { renderSettingsError, renderSettingsLoading, renderSettingsView } from "../js/views/settings-view.js";

const profile = { display_name: "Mink", base_currency: "THB", theme: "fresh", privacy_default: true, role: "admin", status: "active" };

test("settings view exposes preferences and read-only account facts", () => {
  const html = renderSettingsView({ profile, email: "mink@example.com" });
  assert.match(html, /data-profile-settings-form/);
  assert.doesNotMatch(html, /name="baseCurrency"/);
  assert.match(html, /name="privacyDefault" checked/);
  assert.match(html, /mink@example\.com/);
  assert.match(html, />admin</);
  assert.match(html, /data-password-settings-form/);
});

test("settings view provides loading and escaped error states", () => {
  assert.match(renderSettingsLoading(), /กำลังโหลดการตั้งค่า/);
  assert.match(renderSettingsError({ message: "<failed>" }), /&lt;failed&gt;/);
});
