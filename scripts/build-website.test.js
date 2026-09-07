import { afterEach, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
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
  ];
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    expect(source).not.toMatch(/VITE_(CF|GEMINI|GOOGLE)_/);
  }
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

test("Pages headers enforce the same-origin CSP used by the current app", () => {
  const source = readFileSync(join(root, "apps/web/public/_headers"), "utf8");
  expect(source).toContain("Content-Security-Policy:");
  expect(source).toContain("connect-src 'self'");
  expect(source).not.toContain("Content-Security-Policy-Report-Only:");
  expect(source).not.toContain("img-src self https:");
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
