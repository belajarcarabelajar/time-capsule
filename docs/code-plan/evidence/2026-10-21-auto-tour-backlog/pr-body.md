## What This Changes

Closes the backlog left by #47 (plan `docs/code-plan/plans/2026-10-21-auto-tour-backlog.md`):

| Item | Change |
|---|---|
| F9 | Leaving explore after keyboard look now glides 0.45 s back to the tour stop; before, the offset reset cut through that glide (`shouldApplyLookOffset`) |
| F11 | New RoomCamera runtime tests (mocked `@react-three/fiber` hooks, own bun process): tour glide, cut with motion off, pause settles on the exact stop, look-around, exit glide |
| F10 | Dead `mock.module('../utils/history')` removed from `useGameState.test.jsx`; a test proves the hook sends the real history summary |
| F3 | WebKit cannot run on Arch (Playwright's Ubuntu build needs ICU 74, `libxml2.so.2`, flite); README now says so; no code change |
| scratch rule | moved to vivera as belajarcarabelajar/vivera#155 |

No new dependency. Two-way door: each commit reverts on its own.

## Local Verification

CI is disabled; all rows ran locally. Full table: `docs/code-plan/evidence/2026-10-21-auto-tour-backlog/verification.md`.

| Gate | Exit | Result |
|---|---|---|
| `bun run test:quality` | 0 | 0 fail across all packages (web 304 + 2 + 5) |
| lint, build, client assets | 0 each | clean |
| Chromium e2e: tour, immersive, journeys, enrichment | 0 each | 3 (+1 skipped), 11, 4, 18 passed |

- **Before (F9):** the exit glide test found the camera already on the stop at 0.2 s (the cut), exit 1.
- **After:** exit 0; the camera is between the look pose and the stop at 0.2 s and on the stop at 0.5 s.
- **F11 red proof:** removing the settle effect left the camera 0.658 off the stop, exit 1.

## Review

Documented self-review of the camera change (see the evidence file); the rest is tests and docs.
