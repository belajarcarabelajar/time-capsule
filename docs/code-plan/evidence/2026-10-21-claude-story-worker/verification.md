# Local verification: Claude story Worker (T6)

- **Date:** 2026-10-21
- **Worktree:** `time-capsule-wt/claude-story-worker`, branch `2026-10-21-claude-story-worker/claude-story-worker`, first run at `776fc13`, rerun at `77b304f` after the review fixes
- **Toolchain:** bun 1.4.3 (local; CI pins 1.4.2), wrangler 4.129.0, `@anthropic-ai/sdk` 0.137.0
- **Machine state before the suite:** 2595 MB available; one headless Chromium from another session was running and left untouched (A12, A30).

## Results

| Gate | Command | Exit | Result |
|---|---|---|---|
| Install | `bun install --frozen-lockfile` | 0 | lockfile matches |
| Workspace tests | `bun run test` (turbo, first step of `test:quality`) | 1 | game-engine 78 pass 0 fail; story-worker 41 pass 0 fail; ui 57 pass 0 fail; web 185 pass 10 fail (pre-existing, see below) |
| Backend tests | `bun run test:backend` | 0 | 88 pass, 0 fail, 7 files |
| Script tests | `bun run test:script` | 0 | 10 pass, 0 fail |
| Asset checks | `bun run test:assets` | 0 | every room OK |
| Web lint | `bun run --cwd apps/web lint` | 0 | `eslint .`, 0 errors, 0 warnings |
| Build | `bun run build` | 0 | 0 warning lines |
| Client assets | `bun run test:client-assets` | 0 | passed |
| No key in the browser bundle | `grep -rqF sk-ant apps/web/dist` | 1 | no match (expected exit 1) |
| Worker bundle | `bun run --cwd apps/story-worker check` | 0 | `Total Upload: 904.06 KiB / gzip: 157.39 KiB`; bindings `STORY_USER_LIMIT (6 requests/60s)`, `STORY_GLOBAL_LIMIT (20 requests/60s)` |
| Pages Functions bundle | `./node_modules/.bin/wrangler pages functions build functions --outdir .wrangler/tmp/pages-functions-check` | 0 | compiled; the relative import of `scenarioPrompt.js` resolves |

Because `test:quality` chains its steps with `&&`, the red turbo step stopped the chain; the three later steps were run separately above.

## Rerun at `77b304f` (after review fixes `646c08b` and `77b304f`)

| Gate | Command | Exit | Result |
|---|---|---|---|
| Install | `bun install --frozen-lockfile` | 0 | lockfile matches |
| Workspace tests | `bun run test` (first step of `test:quality`) | 1 | game-engine 114 pass 0 fail; story-worker 44 pass 0 fail; ui 57 pass 0 fail; web 190 pass 10 fail (the same 10 pre-existing failures, fail-set `diff` against `main` exit 0) |
| Backend tests | `bun run test:backend` | 0 | 88 pass, 0 fail |
| Script tests | `bun run test:script` | 0 | 12 pass, 0 fail |
| Asset checks | `bun run test:assets` | 0 | every room OK |
| Web lint | `bun run --cwd apps/web lint` | 0 | 0 warnings |
| Build | `bun run build` | 0 | 0 warning lines |
| Client assets | `bun run test:client-assets` | 0 | passed |
| No key in the browser bundle | `grep -rqF sk-ant apps/web/dist` | 1 | no match |
| Worker bundle | `bun run --cwd apps/story-worker check` | 0 | `Total Upload: 904.91 KiB / gzip: 157.68 KiB` |
| Pages Functions bundle | `./node_modules/.bin/wrangler pages functions build functions --outdir .wrangler/tmp/pages-functions-check` | 0 | compiled |

## Pre-existing web failures

The same 10 tests fail on `main` at `14cc4db` before this branch: `bun run --cwd apps/web test` in the main checkout exits 1 with 185 pass and 10 fail. Comparing the sorted failure names of both runs with `diff` exits 0 (identical sets). GitHub Actions run `39405049592` on `main` (`14cc4db`, 2026-10-20) fails at the "Run quality tests" step with the same tests, and runs on `4ad15a0` and `386c664` failed too.

Failing tests (all in `apps/web/src/context/__tests__/`):

- `AuthContext & AuthProvider` > fetches session on mount and sets user when authenticated
- `AuthContext & AuthProvider` > handles auth_error URL parameter and cleans history
- `AuthContext & AuthProvider` > handles session fetch network error gracefully
- `AuthContext & AuthProvider` > loginWithGoogle updates window location to /api/auth/login
- `AuthContext & AuthProvider` > logout calls POST /api/auth/logout and resets user to null
- `AuthContext & AuthProvider` > sets user to null when /api/auth/me returns authenticated: false
- `AuthContext & AuthProvider` > useAuth returns default context when used outside AuthProvider
- a pending refresh cannot resurrect a logged out user
- latest refresh wins even when an older balance arrives later
- refresh failure preserves authenticated identity and marks balance unavailable

None of them touch a file this branch changes. Per AGENTS.md rule A7 they are fixed in their own pull request, not in this one.

## Found while verifying

`bun --cwd <dir> run <script>` prints Bun's usage text and exits 0 without running the script (bun 1.4.3). `bun run --cwd <dir> <script>` runs it. `.github/workflows/quality.yml` uses the first form for its "Lint web application" step; whether bun 1.4.2 on the runner behaves the same is not verified.
