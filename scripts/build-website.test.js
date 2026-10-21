import { afterEach, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "..");
const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true });
});

test("build entry runs only the declared web build from any working directory", () => {
  const directory = mkdtempSync(join(tmpdir(), "time-capsule-build-test-"));
  temporaryDirectories.push(directory);
  const bun = join(directory, "bun");
  writeFileSync(
    bun,
    '#!/bin/bash\nset -euo pipefail\npwd\nprintf "%s\\n" "$@"\n',
  );
  chmodSync(bun, 0o755);
  const result = spawnSync("bash", [join(root, "scripts/build-website.sh")], {
    cwd: directory,
    env: { PATH: `${directory}:/usr/bin:/bin` },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stdout.trim().split("\n")).toEqual([
    join(root, "apps/web"),
    "run",
    "build",
  ]);
});

test("build entry stops on failure and never loads credentials or deploys", () => {
  const source = readFileSync(join(root, "scripts/build-website.sh"), "utf8");
  expect(source).toContain("set -euo pipefail");
  expect(source).not.toMatch(/pages deploy|cloudflare\/\.env|source.*\.env/);
});

test("deploy entry uses only explicit current-project credentials and the build-only helper", () => {
  const source = readFileSync(join(root, "scripts/deploy-website.sh"), "utf8");
  expect(source).toContain("set -euo pipefail");
  expect(source).toContain("TIME_CAPSULE_CLOUDFLARE_ENV_FILE");
  expect(source).toContain("scripts/build-website.sh");
  expect(source).toContain("CLOUDFLARE_API_TOKEN");
  expect(source).toContain("CLOUDFLARE_ACCOUNT_ID");
  expect(source).not.toContain("/home/belajarcarabelajar/cloudflare/.env");
  expect(source).not.toContain("/root/.env");
  expect(source).not.toMatch(/bun run build|npm run build/);
  expect(source).toContain("node_modules/.bin/wrangler");
  expect(source).not.toContain("npx -y wrangler");
});

test("server credential paths do not use Vite-exposed variable names", () => {
  const files = [
    "apps/web/vite.config.js",
    "functions/api/scenario.js",
    "functions/api/auth/callback.js",
    "functions/api/auth/login.js",
    "apps/story-worker/src/index.js",
    "apps/story-worker/src/claude.js",
  ];
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    expect(source).not.toMatch(/VITE_(CF|GEMINI|GOOGLE|ANTHROPIC)_/);
  }
});

function sourceFiles(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      if (entry.name === "__tests__" || entry.name === "node_modules") return [];
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    },
  );
}

test("browser-bundled sources never name the Claude key", () => {
  const files = ["apps/web/src", "packages/game-engine/src", "packages/ui/src"]
    .flatMap(sourceFiles);
  expect(files).toContain("packages/game-engine/src/scenarioPrompt.js");
  const offenders = files.filter((file) => {
    const source = readFileSync(join(root, file), "utf8");
    return source.includes("ANTHROPIC_API_KEY") || /VITE_ANTHROPIC/.test(source);
  });
  expect(offenders).toEqual([]);
});

test("story Worker reads the Claude key only from its env binding", () => {
  const worker = readFileSync(join(root, "apps/story-worker/src/index.js"), "utf8");
  const reads = worker.match(/[\w.$]*ANTHROPIC_API_KEY/g) ?? [];
  expect(reads.length).toBeGreaterThan(0);
  expect(new Set(reads)).toEqual(new Set(["env.ANTHROPIC_API_KEY"]));
  const client = readFileSync(join(root, "apps/story-worker/src/claude.js"), "utf8");
  expect(client).not.toMatch(/ANTHROPIC_API_KEY|process\.env|import\.meta\.env/);
});

test("Vite development API traffic uses an explicit local Pages Functions origin", () => {
  const source = readFileSync(join(root, "apps/web/vite.config.js"), "utf8");
  expect(source).toContain("TIME_CAPSULE_FUNCTIONS_ORIGIN");
  expect(source).toContain('"/api"');
  expect(source).not.toContain("api.cloudflare.com");
  expect(source).not.toContain("generativelanguage.googleapis.com");
  expect(source).not.toContain("'Authorization'");
});

test("Vite build splits the 3D vendor payload from the room entry chunk", () => {
  const source = readFileSync(join(root, "apps/web/vite.config.js"), "utf8");
  expect(source).toContain("manualChunks");
  expect(source).toContain("three-vendor");
  expect(source).toContain("react-vendor");
  expect(source).toContain("chunkSizeWarningLimit: 750");
});

test("workspace quality commands cover package tests without shell-specific discovery", () => {
  const rootPackage = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const webPackage = JSON.parse(
    readFileSync(join(root, "apps/web/package.json"), "utf8"),
  );
  const uiPackage = JSON.parse(
    readFileSync(join(root, "packages/ui/package.json"), "utf8"),
  );
  const enginePackage = JSON.parse(
    readFileSync(join(root, "packages/game-engine/package.json"), "utf8"),
  );
  expect(rootPackage.packageManager).toBe("bun@1.4.2");
  expect(rootPackage.devDependencies.prettier).toBe("3.5.3");
  expect(rootPackage.scripts.format).toContain(
    "**/*.{js,jsx,json,md,ts,tsx,yaml,yml,css}",
  );
  expect(rootPackage.scripts["test:backend"]).toBe("bun test functions/api");
  expect(rootPackage.scripts["test:script"]).toBe(
    "bun test scripts/build-website.test.js",
  );
  expect(rootPackage.scripts["test:assets"]).toBe(
    "bun scripts/verify-history-assets.mjs",
  );
  expect(rootPackage.scripts["dev:pages"]).toContain(
    "./node_modules/.bin/wrangler",
  );
  expect(rootPackage.scripts["dev:pages"]).not.toContain("npx");
  expect(webPackage.scripts.test).toContain(
    "bun test src --path-ignore-patterns",
  );
  expect(webPackage.scripts.test).toContain(
    "&& bun test src/immersive/__tests__/RoomModel.test.jsx",
  );
  expect(uiPackage.scripts.test).toBe("bun test src");
  expect(enginePackage.scripts.test).toBe("bun test src");
  expect(enginePackage.scripts.build).toBeUndefined();
  expect(uiPackage.scripts.test).not.toMatch(/find|xargs/);
});

test("bun commands put --cwd after run so the script really runs", () => {
  // Bun 1.4.2 and 1.4.3 treat `bun --cwd <dir> run <script>` as a bare
  // `bun run`: they print usage and exit 0, so a CI step passes without
  // running anything.
  const brokenCwd = /\bbun\s+--cwd(?:=|\s+)\S+\s+run\b/;
  expect(brokenCwd.test("bun --cwd apps/web run lint")).toBe(true);
  expect(brokenCwd.test("bun run --cwd apps/web lint")).toBe(false);

  const packageFiles = [
    "package.json",
    ...["apps", "packages"].flatMap((directory) =>
      readdirSync(join(root, directory), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${directory}/${entry.name}/package.json`)
        .filter((file) => existsSync(join(root, file))),
    ),
  ];
  const workflowFiles = readdirSync(join(root, ".github/workflows")).map(
    (name) => `.github/workflows/${name}`,
  );
  expect(packageFiles).toContain("apps/web/package.json");
  expect(workflowFiles).toContain(".github/workflows/quality.yml");

  const offenders = [
    ...packageFiles.flatMap((file) =>
      Object.entries(JSON.parse(readFileSync(join(root, file), "utf8")).scripts ?? {})
        .filter(([, command]) => brokenCwd.test(command))
        .map(([name]) => `${file} scripts.${name}`),
    ),
    ...workflowFiles.flatMap((file) =>
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .flatMap((line, index) => (brokenCwd.test(line) ? [`${file}:${index + 1}`] : [])),
    ),
  ];
  expect(offenders).toEqual([]);
});

test("Pages headers enforce the same-origin CSP used by the current app", () => {
  const source = readFileSync(join(root, "apps/web/public/_headers"), "utf8");
  expect(source).toContain("Content-Security-Policy:");
  expect(source).toContain("connect-src 'self'");
  expect(source).not.toContain("Content-Security-Policy-Report-Only:");
  expect(source).not.toContain("img-src self https:");
});

test("Pages CSP allows GLTFLoader blob textures and the zone's Web Analytics beacon", () => {
  const source = readFileSync(join(root, "apps/web/public/_headers"), "utf8");
  const policy = source.match(/Content-Security-Policy: (.+)/)[1];
  const directive = (name) =>
    policy
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .find(([key]) => key === name)
      .slice(1);
  // GLTFLoader turns embedded GLB textures into blob: URLs and ImageBitmapLoader fetch()es them.
  expect(directive("connect-src")).toEqual(
    expect.arrayContaining(["'self'", "blob:", "https://cloudflareinsights.com"]),
  );
  // The belajarcarabelajar.com zone injects this beacon on the custom domain.
  expect(directive("script-src")).toEqual(
    expect.arrayContaining(["'self'", "https://static.cloudflareinsights.com"]),
  );
});

test("client asset verification is part of the post-build quality workflow", () => {
  const rootPackage = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const workflow = readFileSync(
    join(root, ".github/workflows/quality.yml"),
    "utf8",
  );
  expect(rootPackage.scripts["test:client-assets"]).toBe(
    "bun scripts/verify-client-assets.mjs",
  );
  expect(workflow).toContain("bun run test:client-assets");
});
