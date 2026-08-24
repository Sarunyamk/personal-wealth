import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const assets = [
  {
    source: "node_modules/chart.js/dist/chart.umd.js",
    destination: "assets/vendor/chart.umd.js",
  },
  {
    source: "node_modules/@supabase/supabase-js/dist/umd/supabase.js",
    destination: "assets/vendor/supabase.umd.js",
  },
];

for (const asset of assets) {
  const destination = resolve(asset.destination);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(asset.source), destination);
}

console.log(`Generated ${assets.length} vendor asset.`);
