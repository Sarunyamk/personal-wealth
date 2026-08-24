import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");
const directories = ["assets", "css", "js"];
const files = ["index.html"];

function optionalEnvironment(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  ...directories.map((directory) =>
    cp(path.join(root, directory), path.join(output, directory), { recursive: true }),
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
const buildId = process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36);
const builtIndex = (await readFile(indexPath, "utf8")).replace(
  'src="js/app-loader.js"',
  `src="js/app-loader.js?v=${buildId}"`,
);
if (!builtIndex.includes('src="config.js"')) throw new Error("index.html does not load config.js");
if (!builtIndex.includes(`app-loader.js?v=${buildId}`)) {
  throw new Error("index.html does not contain the versioned application loader");
}
await writeFile(indexPath, builtIndex, "utf8");

console.log(`Static site built in ${path.relative(root, output)}.`);
