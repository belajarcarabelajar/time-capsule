import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const distDirectory = resolve(import.meta.dirname, "../apps/web/dist");
const forbiddenPatterns = [
  /VITE_(?:CF|GEMINI|GOOGLE)_(?:API_KEY|ACCOUNT_ID|API_TOKEN|CLIENT_ID|CLIENT_SECRET)/,
  /api\.cloudflare\.com/,
  /generativelanguage\.googleapis\.com/,
];

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

if (!statSync(distDirectory, { throwIfNoEntry: false })) {
  throw new Error(`Missing build output: ${distDirectory}`);
}

const files = collectFiles(distDirectory);
const violations = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) violations.push(`${file}: ${pattern}`);
  }
}

if (violations.length > 0) {
  throw new Error(`Client asset policy violations:\n${violations.join("\n")}`);
}

console.log(
  `client assets verified: ${files.length} files; no server credential or provider path markers`,
);
