import { afterEach, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dir, '..');
const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

test('build entry runs only the declared web build from any working directory', () => {
  const directory = mkdtempSync(join(tmpdir(), 'time-capsule-build-test-'));
  temporaryDirectories.push(directory);
  const bun = join(directory, 'bun');
  writeFileSync(bun, '#!/bin/bash\nset -euo pipefail\npwd\nprintf "%s\\n" "$@"\n');
  chmodSync(bun, 0o755);
  const result = spawnSync('bash', [join(root, 'scripts/build-website.sh')], {
    cwd: directory,
    env: { PATH: `${directory}:/usr/bin:/bin` },
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  expect(result.stdout.trim().split('\n')).toEqual([join(root, 'apps/web'), 'run', 'build']);
});

test('build entry stops on failure and never loads credentials or deploys', () => {
  const source = readFileSync(join(root, 'scripts/build-website.sh'), 'utf8');
  expect(source).toContain('set -euo pipefail');
  expect(source).not.toMatch(/pages deploy|cloudflare\/\.env|source.*\.env/);
});
