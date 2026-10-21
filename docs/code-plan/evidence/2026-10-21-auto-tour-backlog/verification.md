# Local verification, auto-tour backlog session (2026-10-21)

| Step | Command | Exit | Result |
|---|---|---|---|
| Quality gate | `bun run test:quality` | 0 | web 304 pass + RoomModel 2 + RoomCamera 5, ui 60, game-engine 118, story-worker 45, backend 97, script 16, assets; 0 fail |
| Web lint | `bun run --cwd apps/web lint` | 0 | clean |
| Build | `bun run build` | 0 | completed |
| Client assets | `bun run test:client-assets` | 0 | clean |
| Tour | `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium bunx playwright test --config playwright.tour.config.js` | 0 | 3 passed, 1 skipped |
| Immersive | same variable, `--config playwright.immersive.config.js --project chromium` | 0 | 11 passed |
| Journeys | same variable, `--config playwright.journeys.config.js --project chromium` | 0 | 4 passed |
| Enrichment | same variable, `--config playwright.enrichment.config.js` | 0 | 18 passed |
| WebKit probe (T5) | `--config playwright.immersive.config.js --project webkit` after `bunx playwright install webkit` | 1 | 11 failed at launch: missing ICU 74, `libxml2.so.2`, flite on Arch; download removed |
| vivera (T6) | `bun run ci:targeted` | 0 | 745 tests and all suites PASS; PR belajarcarabelajar/vivera#155 |

Review: documented self-review of `bcf5b5c` (one condition in the `viewOffset` effect plus tests): look offsets still apply immediately while exploring (test), a blocked lesson while exploring still cuts through the view effect because motion is off, and only the reset that arrives with exploring off is ignored, which is what restores the 0.45 s glide.
