import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const layout = readFileSync("css/layout.css", "utf8");
const components = readFileSync("css/components.css", "utf8");
const failures = [];

const requiredHtmlPatterns = [
  [/<aside[^>]+aria-label=/, "desktop navigation landmark"],
  [/<nav class="mobile-nav"[^>]+aria-label=/, "mobile navigation landmark"],
  [/<main[^>]+tabindex="-1"/, "focusable main content"],
  [/<dialog[^>]+aria-labelledby=/, "labelled dialog"],
  [/aria-live="polite"/, "toast live region"],
  [/data-privacy-toggle aria-pressed="false"/, "privacy toggle state"],
  [/data-confirm-dialog/, "confirmation dialog"],
];

for (const [pattern, label] of requiredHtmlPatterns) {
  if (!pattern.test(html)) failures.push(`Missing ${label}.`);
}

if (!layout.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")) {
  failures.push("Mobile dashboard grid must use shrinkable tracks.");
}
if (!layout.includes("@media (min-width: 64rem)")) {
  failures.push("Desktop shell breakpoint is missing.");
}
if (!layout.includes("padding-bottom: calc(var(--mobile-nav-height)")) {
  failures.push("Main content does not reserve space for mobile navigation.");
}
if (!components.includes("max-height: calc(100dvh")) {
  failures.push("Dialog has no viewport height constraint.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("UI structure and responsive guards passed.");
}
