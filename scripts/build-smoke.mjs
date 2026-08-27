import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const buildId = "build-smoke";
const build = spawn(process.execPath, ["scripts/build-site.mjs"], {
  cwd: root,
  env: { ...process.env, GITHUB_SHA: buildId },
  stdio: "inherit",
});
assert.equal(await new Promise((resolve) => build.on("exit", resolve)), 0, "Production build failed");

const dist = path.join(root, "dist");
const server = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs")], {
  cwd: dist,
  env: { ...process.env, PORT: "4191" },
  stdio: "ignore",
});

try {
  const baseUrl = "http://127.0.0.1:4191/";
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      response = await fetch(baseUrl);
      if (response.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.equal(response?.ok, true, "Built site did not start");
  const html = await response.text();
  const paths = [...html.matchAll(/\b(?:href|src)="((?:release\/)[^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length > 10, "Built index does not contain release-scoped assets");
  paths.push(`release/${buildId.slice(0, 12)}/assets/icons/lucide-sprite.svg`);
  for (const assetPath of paths) {
    const asset = await fetch(new URL(assetPath, baseUrl));
    assert.equal(asset.status, 200, `${assetPath} returned ${asset.status}`);
  }
  const iconModule = await readFile(path.join(dist, "release", buildId.slice(0, 12), "js", "components", "icons.js"), "utf8");
  assert.match(iconModule, /\.\.\/\.\.\/assets\/icons\/lucide-sprite\.svg/);
  console.log(`Production build smoke passed for ${paths.length} release assets.`);
} finally {
  server.kill();
}
