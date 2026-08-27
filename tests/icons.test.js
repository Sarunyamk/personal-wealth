import assert from "node:assert/strict";
import test from "node:test";
import { iconSpriteUrl } from "../js/components/icons.js";

test("icon sprite stays in the same source or release tree as its module", () => {
  assert.equal(
    iconSpriteUrl("https://example.test/js/components/icons.js"),
    "https://example.test/assets/icons/lucide-sprite.svg",
  );
  assert.equal(
    iconSpriteUrl("https://example.test/release/abc123/js/components/icons.js"),
    "https://example.test/release/abc123/assets/icons/lucide-sprite.svg",
  );
});
