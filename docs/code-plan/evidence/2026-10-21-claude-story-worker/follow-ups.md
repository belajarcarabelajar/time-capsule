# Debt sweep and follow-up injection: claude-story-worker

- **Date:** 2026-10-21
- **PR:** #45
- **Plan:** `docs/code-plan/plans/2026-10-21-claude-story-worker.md`

## Harvest

- `defer:` comment markers in the repository: 0 (`git grep -nE '(#|//|/[*]) ?defer:'` printed nothing; the same command finds 2 markers in vivera `scripts/validate-agents.mjs`, so the method works). Prose `defer:` lines in the plan: 2 (Analytics Engine metric, orphaned engine tests).
- Sources: review 1 and 2 notes, the same-class sweep of the P1 fix, the verification run, the runner and readiness output.

| # | Candidate | Class | Rank basis |
|---|---|---|---|
| 1 | 403 and 503 points messages masked by the fixed text in `apps/web/src/hooks/useGameState.js` | NOW | same-class peer of the P1 |
| 2 | `functions/api/scenario.js` buffers the body before the 16 KB check | NOW | cheap hardening |
| 3 | `.github/workflows/quality.yml` lint step is a no-op (`bun --cwd apps/web run lint`) | NOW | CI never linted |
| 4 | No later-chapter 422 hook test | NOW | reviewer gap, cheapest |
| 5 | `packages/game-engine/tests/` never run by the package test script | NOW | silent test loss |
| 6 | 10 `AuthContext` web tests red on `main` | LATER | own PR per AGENTS.md A7 |
| 7 | Production Pages has no D1 binding | LATER | owner decision |
| 8 | Unused Pages secrets `VITE_CF_API_TOKEN`, `VITE_GEMINI_API_KEY` | separate destructive question | external, destructive |
| 9 | `time-capsule` not registered in vivera publish configs | LATER | other repository, public issue |
| 10 | vivera runner treats `<tool> \| grep -q` in `skip_if` as loose | LATER | other repository |
| 11 | No Analytics Engine metric for Worker 429 | LATER | plan deferral |
| 12 | `packageManager` pins bun 1.4.2, machine runs 1.4.3 | LATER | repository-wide pin |

## Question and answer

One call, three questions: `Kode` (multi-select: 403/503 messages, early 413, CI lint), `Tes` (multi-select: later-chapter 422 test, orphaned engine tests, nothing), `Close plan` (Keep it open recommended, readiness `NOT-READY`). Answer: all five follow-ups selected; `Keep it open`.

## Execution record

| Task | Owner | RED | GREEN (parent re-run) | Commit |
|---|---|---|---|---|
| T9 403/503 visible, later-chapter 422 test | subagent | hook test exit 1 (2 fail); 422 case proven by a restored mutation | `cd apps/web && bun test src/hooks/__tests__/useGameState.test.jsx` exit 0, 16 pass | (with the defect fix below) |
| T9 defect found in parent audit: a 503 without a JSON message showed the bare code `POINTS_UNAVAILABLE` | subagent | exit 1 (2 fail) | same command exit 0, 18 pass; `App.test.jsx` exit 0 | `ebd6fd4` |
| T10 early 413 by `Content-Length` | subagent | `bun test functions/api/scenario.test.js` exit 1 ("Expected: 413, Received: 500") | exit 0, 49 pass; `bun test functions/api` exit 0, 97 pass | `a4d719b` |
| T11 CI lint step and guard test | subagent | `bun run test:script` exit 1 (`.github/workflows/quality.yml:31`) | exit 0, 13 pass; `bun run --cwd apps/web lint` exit 0 with `$ eslint .`; old form on bun 1.4.2 printed usage, exit 0 | `92ef259` |
| T12 orphaned engine tests | parent (`git mv`) | n/a (move) | moved file exit 0, 4 pass; engine package 118 pass | `9a5ccf3` |

Full verification after the batch: `verification.md`, rerun at `ebd6fd4`.

## Re-pass

0 new candidates: T11 makes lint a real gate on a tree with 0 findings; T9's bare-code heuristic only filters uppercase codes; T10 and T12 add no surface.

Sweep closed: 5 closed, 7 deferred to the plan backlog, re-pass 0.
