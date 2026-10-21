# Local verification, auto-tour session (2026-10-21)

CI is disabled by the owner; every row ran on the laptop in the session worktree `time-capsule-wt/auto-tour`.

## Quality gate

| Step | Command | Exit | Result |
|---|---|---|---|
| Turbo package tests | `bun run test:quality` (first step `bun run test`) | 1 | game-engine 118 pass, story-worker 44 pass, ui pass; web 277 pass, 10 fail |
| Same web step on `main` (`38ded6e`, main checkout) | `bun run --cwd apps/web test` | 1 | 196 pass, 10 fail, the same 10 test names |
| Backend | `bun run test:backend` | 0 | 97 pass, 0 fail |
| Root scripts and CSP | `bun run test:script` | 0 | 14 pass, 0 fail |
| Room assets | `bun run test:assets` | 0 | 8 rooms OK, sources and hashes verified |
| Web lint | `bun run --cwd apps/web lint` | 0 | clean |
| Build | `bun run build` | 0 | completed |
| Client assets | `bun run test:client-assets` | 0 | 53 files, no server credential or provider path markers |

The 10 web failures are pre-existing and identical on `main`: 7 `AuthContext & AuthProvider` tests plus `a pending refresh cannot resurrect a logged out user`, `latest refresh wins even when an older balance arrives later`, and `refresh failure preserves authenticated identity and marks balance unavailable`. They pass in isolation on `main` (`bun test src/context/__tests__` exit 0, 11 pass), so they are a cross-file isolation problem in the full run, not a behavior regression. This session adds 81 web tests, all passing. Recorded as follow-up F6.

`bun run test:quality` stops at its first failing `&&` step, so the later steps ran separately (rows above).

## Browser checks

This machine has no Playwright-bundled browser (`~/.cache/ms-playwright` is missing, F1), so each run uses a scratch wrapper config that imports the repo config and only adds `executablePath: '/usr/bin/chromium'` (Chromium 154). WebKit is not available (F3).

| Suite | Exit | Result |
|---|---|---|
| `playwright.tour.config.js` (base code, RED) | 1 | 3 failed on `data-tour-stop` (`null` or `""`), 1 skipped |
| `playwright.tour.config.js` (after T2 and T3) | 0 | 3 passed, 1 skipped |
| `playwright.tour.config.js -g 'visual sweep'` with `TOUR_SHOTS` | 0 | 1 passed (5.6 min); see `visual-sweep.md` |
| `playwright.profile.config.js` with the `origin/main` `_headers` (RED) | 1 | "loads after login" failed `Expected: true, Received: false`; fallback case passed |
| `playwright.profile.config.js` with the fix | 0 | 2 passed |
| `playwright.immersive.config.js --project chromium` | 0 | 11 passed |
| `playwright.enrichment.config.js` (Chromium desktop 1440 and mobile 390, layout and controls inside the viewport) | 0 | 18 passed |
| `playwright.journeys.config.js` (all projects) | 1 | Chromium 4 passed; WebKit 4 failed at launch (`Executable doesn't exist ... webkit-2359`), environment only (F3) |
| `playwright.journeys.config.js --project chromium` | 0 | 4 passed |
| `playwright.fallback.config.js` | 0 | 1 passed |
| `playwright.tour.config.js` (final run after the review fixes) | 0 | 3 passed, 1 skipped |
| `playwright.profile.config.js` (final T6 run, port 5177) | 0 | 2 passed |

Available memory before each browser run: 2.6 to 3.2 GB (A12). A headless Chromium from another Claude session (`social-media`, `c2-adobe-profile`) was running at one point; the suites waited until it exited and 2 GB were free.

After the review fixes: `bun test src/immersive` exit 0 (215 pass); `bun run test:script` exit 0 (14 pass); eslint on the changed specs exit 0; mutation probes turned the new blocked test and the exact CSP test red (exit 1) before restoring.
| `playwright.tour.config.js` with the laptop GPU (`--use-angle=gl-egl`) and `TOUR_SHOTS` | 0 | 4 passed (5.7 min), 64 of 64 mid-glide frames rendered in 3D |
