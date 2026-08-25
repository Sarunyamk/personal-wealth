import assert from "node:assert/strict";
import test from "node:test";
import { bindProfileIdentity, profileDisplayName, profileInitials } from "../js/utils/profile-identity.js";

test("profile identity uses the trimmed Supabase display name", () => {
  assert.equal(profileDisplayName({ display_name: "  Mnk  " }, { email: "fallback@example.com" }), "Mnk");
  assert.equal(profileInitials("Mnk"), "MN");
  assert.equal(profileInitials("Mink Sarunya"), "MS");
});

test("profile identity falls back to the email name", () => {
  assert.equal(profileDisplayName({}, { email: "sarunya46mk@gmail.com" }), "sarunya46mk");
  assert.equal(profileDisplayName({}, {}), "ผู้ใช้");
});

test("profile identity binds base currency labels", () => {
  const element = { textContent: "" };
  const meta = { textContent: "" };
  const root = {
    querySelectorAll(selector) {
      if (selector === "[data-profile-currency]") return [element];
      if (selector === ".sidebar__profile-meta") return [meta];
      return [];
    },
  };
  bindProfileIdentity(root, { base_currency: "USD" }, {});
  assert.equal(element.textContent, "USD");
  assert.equal(meta.textContent, "USD · Personal");
});
