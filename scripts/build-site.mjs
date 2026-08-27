import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");
const directories = ["assets", "css", "js"];
const files = ["index.html"];
const buildId = process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36);
const releaseRoot = path.join(output, "release", buildId);

function optionalEnvironment(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(releaseRoot, { recursive: true });
await Promise.all([
  ...directories.map((directory) =>
    cp(path.join(root, directory), path.join(releaseRoot, directory), { recursive: true }),
  ),
  ...files.map((file) => cp(path.join(root, file), path.join(output, file))),
]);

const config = {
  supabaseUrl: optionalEnvironment("VITE_SUPABASE_URL"),
  supabasePublishableKey: optionalEnvironment("VITE_SUPABASE_PUBLISHABLE_KEY"),
};
await writeFile(
  path.join(output, "config.js"),
  `globalThis.__APP_CONFIG__ = Object.freeze(${JSON.stringify(config, null, 2)});\n`,
  "utf8",
);
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

const indexPath = path.join(output, "index.html");
const releasePath = `release/${buildId}`;
const builtIndex = (await readFile(indexPath, "utf8")).replace(
  /\b(href|src)="(assets|css|js)\//g,
  `$1="${releasePath}/$2/`,
);
if (!builtIndex.includes('src="config.js"')) throw new Error("index.html does not load config.js");
if (!builtIndex.includes(`${releasePath}/js/app-loader.js`)) {
  throw new Error("index.html does not contain the release-scoped application loader");
}
await writeFile(indexPath, builtIndex, "utf8");

console.log(`Static site built in ${path.relative(root, output)}.`);
