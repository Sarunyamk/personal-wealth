import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as lucide from "lucide";

const iconNames = [
  "Bell",
  "Archive",
  "Building2",
  "ChartNoAxesCombined",
  "Check",
  "ChevronRight",
  "CircleDollarSign",
  "Eye",
  "EyeOff",
  "Flag",
  "Goal",
  "House",
  "History",
  "Landmark",
  "LayoutDashboard",
  "Menu",
  "Plus",
  "Pencil",
  "RefreshCw",
  "ReceiptText",
  "Settings",
  "Search",
  "SlidersHorizontal",
  "TrendingDown",
  "TrendingUp",
  "WalletCards",
  "X",
];

function toKebabCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function serializeNode([tag, attributes, children = []]) {
  const serializedAttributes = Object.entries(attributes)
    .filter(([name]) => name !== "key")
    .map(([name, value]) => `${name}="${String(value)}"`)
    .join(" ");
  const content = children.map(serializeNode).join("");
  return `<${tag}${serializedAttributes ? ` ${serializedAttributes}` : ""}>${content}</${tag}>`;
}

const symbols = iconNames.map((name) => {
  const icon = lucide[name];
  if (!icon) throw new Error(`Unknown Lucide icon: ${name}`);
  const nodes = icon.map(serializeNode).join("");
  return `<symbol id="icon-${toKebabCase(name)}" viewBox="0 0 24 24">${nodes}</symbol>`;
});

const outputPath = resolve("assets/icons/lucide-sprite.svg");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join("")}</defs></svg>\n`,
  "utf8",
);
console.log(`Generated ${iconNames.length} Lucide icons.`);
