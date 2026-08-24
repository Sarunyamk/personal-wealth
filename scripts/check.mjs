import { readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["js", "scripts", "tests"];

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(path);
    return [".js", ".mjs"].includes(extname(entry.name)) ? [path] : [];
  });
}

const files = roots.flatMap(collectJavaScriptFiles);
let hasFailure = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) hasFailure = true;
}

if (hasFailure) process.exitCode = 1;
else console.log(`Syntax check passed for ${files.length} files.`);
