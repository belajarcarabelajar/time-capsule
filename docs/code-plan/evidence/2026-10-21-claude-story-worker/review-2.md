# Independent review 2: fixes for review 1

- **Date:** 2026-10-21
- **Reviewer:** the same independent read-only subagent as review 1
- **Diff:** `3bd0552..77b304f` (fix commits `646c08b` and `77b304f`)
- **Verdict:** `correct` (confidence 0.85). It returns to `not correct` if a full-suite failure appears in a file this branch touches, if a deploy-time check fails (the `ratelimits` binding rejected on the Free plan, the `workers.dev` host serving the Worker, or every smoke-test call logging `reason: unknown`), or if a mutation of `visibleErrorMessage` goes uncaught.

## Reviewer commands

| Command | Exit | Result |
|---|---|---|
| `cd apps/web && bun test src/hooks/__tests__/useGameState.test.jsx` | 0 | 12 pass |
| `bun test packages/game-engine/src/__tests__/scenarioPrompt.test.js` | 0 | 70 pass |
| `bun test apps/story-worker/src/index.test.js` | 0 | 44 pass |
| `bun test packages/game-engine/src/__tests__/scenarioClient.test.js` | 0 | 20 pass |
| `bun run test:script` | 0 | 12 pass |
| `check-copy-rules.mjs --diff origin/main` | 0 | clean, 2736 added lines, 23 files, 10 commit messages |
| `check-duplicate-defs.mjs --diff origin/main` | 0 | no duplicate definitions |
| `git log -p 3bd0552..HEAD` searched for `sk-ant` | 1 | no match |

## Findings from review 1

| ID | Status | Where | Test that goes red on revert |
|---|---|---|---|
| R1 (P1) | Fixed | `apps/web/src/hooks/useGameState.js:6-11,104,163`; `packages/game-engine/src/scenarioClient.js:154-166` | `useGameState.test.jsx` chapter-1 422 and 429, later-chapter 429; 500 cases guard the fixed text; `scenarioClient.test.js` status assertions for 422, 429, 500, 403 |
| R2 (P3) | Fixed | `packages/game-engine/src/scenarioPrompt.js:16-32,39-45` | `scenarioPrompt.test.js` invisible-character and lookalike-bracket cases, fullwidth closing-tag case |
| R3 (P3) | Fixed | `scripts/build-website.test.js:64-107` | browser-source scan for the key name; Worker reads the key only as `env.ANTHROPIC_API_KEY` |
| R4 (P3) | Fixed | `apps/story-worker/src/claude.js:27-34`; `apps/story-worker/src/index.js:89-98` | `index.test.js` 400 and 404 cases log `upstream_status`; `auth` and thrown-fetch cases log none |

## New findings

None qualified. Non-qualifying notes: stripping U+FE0F drops the emoji presentation selector from a typed topic (cosmetic); a 422 or 429 without the Pages JSON body would show the client fallback text; `error.status` is also set for 401, 403, and 503, and the auth check reads only the message.

## Not verified by the reviewer

Full web suite, build, Worker dry-run (run by the parent, see `verification.md`), mutation runs for R1 to R4, and the gated post-deploy checks.
