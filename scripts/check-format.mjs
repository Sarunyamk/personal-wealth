import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const roots = ["css", "js", "scripts", "tests"];
const rootFiles = ["index.html", "package.json", "README.md", "PLAN.md", "AGENTS.md"];
const checkedExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs"]);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return checkedExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

const failures = [];
const files = [...rootFiles, ...roots.flatMap(collectFiles)];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!content.endsWith("\n")) failures.push(`${file}: missing final newline`);
  content.split(/\r?\n/).forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${file}:${index + 1}: trailing whitespace`);
    if (line.includes("\t")) failures.push(`${file}:${index + 1}: tab indentation`);
  });
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Formatting check passed for ${files.length} files.`);
}
