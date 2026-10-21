## 1. Delivery Metadata

| Field | Value |
|---|---|
| Session slot | `story-loading-hint` |
| Plan | `docs/code-plan/plans/2026-10-21-story-loading-hint.md` |
| Base branch | `main` (`38ded6e`) |
| Head branch | `2026-10-21-story-loading-hint/story-loading-hint` |
| Type of change | feature (copy) and docs |
| Reviewer | documented self-review (static text change; see section 5) |

## 2. What This Changes

Writing a chapter with Claude Haiku 5.5 at effort `medium` takes about 30 seconds (28 to 33 s measured, including two live requests at 32.6 s and 33.1 s), and the loading screen gave no estimate, so the wait looked stuck. `LoadingPanel` now shows "AI sedang menulis babak ini. Biasanya butuh sekitar 30 detik." under its subtitle on both the start screen and the gameplay screen; callers can override it with a `hint` prop. The PR also records the production evidence of PR #45 (Worker deploy, secret, no public URL, Pages binding and deploy, live analytics, timing runs) in that session's open plan.

Debt-sweep follow-ups in the same PR: continuing while the next chapter is still preloading now waits for that preload instead of generating the chapter a second time (which cost a second Claude call and later replayed the chapter as the following one); each Claude attempt gets 90 s instead of 45 s (single attempts measured 28 to 33 s); the story Worker's `compatibility_date` is `2026-09-10`, so `wrangler dev` starts with the bundled workerd.

**Non-goals:** changing effort or model; streaming; an elapsed-time counter.

## 3. Acceptance Criteria

| ID | Criterion | Task | Check | Evidence |
|---|---|---|---|---|
| AC1 | The loading panel shows the estimate line by default on both screens | T1 | `cd packages/ui && bun test src/components/LoadingPanel.test.jsx`; `cd apps/web && bun test src/components/__tests__/StartScreen.test.jsx src/components/__tests__/GameplayScreen.test.jsx` | exit 0, 4 pass; exit 0, 12 pass |
| AC2 | The `hint` prop overrides the line; heading texts unchanged | T1 | same `LoadingPanel.test.jsx` | exit 0 |
| AC3 | The PR #45 plan records its production evidence and stays open | T2 | `bun $HOME/vivera/scripts/ultra-plan-runner.mjs docs/code-plan/plans/2026-10-21-claude-story-worker.md` | exit 0 |
| FU-1 | One Claude request per chapter when continuing during a preload; no replayed chapter | T4 | `cd apps/web && bun test src/hooks/__tests__/useGameState.test.jsx` | exit 0, 21 pass (RED before: requests `[1, 2, 2]`, chapter 2 shown as chapter 3) |
| FU-2 | 90 s per Claude attempt | T5 | `bun test apps/story-worker/src/index.test.js` | exit 0, 45 pass (`X-Stainless-Timeout: 90` on both attempts) |
| FU-3 | `wrangler dev` starts for the story Worker | T5 | `wrangler dev --ip 127.0.0.1 --port 8798` | `Ready on http://127.0.0.1:8798`; `POST /v1/story` without a key answered 502 `not_configured` |

## 4. Local Verification Evidence

GitHub Actions is disabled by the owner; every gate ran locally on the working tree.

| Gate | Command | Exit | Result |
|---|---|---|---|
| UI tests | `cd packages/ui && bun run test` | 0 | 59 pass, 0 fail |
| Hook and app tests | `cd apps/web && bun test src/hooks/__tests__/useGameState.test.jsx src/__tests__/App.test.jsx` | 0 | 28 pass, 0 fail |
| Worker tests | `bun test apps/story-worker/src/index.test.js` | 0 | 45 pass, 0 fail |
| Backend tests | `bun test functions/api` | 0 | 97 pass, 0 fail |
| Worker bundle | `bun run --cwd apps/story-worker check` | 0 | `Total Upload: 904.95 KiB / gzip: 157.69 KiB` |
| Screen tests | `cd apps/web && bun test src/components/__tests__/StartScreen.test.jsx src/components/__tests__/GameplayScreen.test.jsx` | 0 | 12 pass, 0 fail |
| Lint | `bun run --cwd apps/web lint` | 0 | `$ eslint .`, 0 warnings |
| Build | `bun run build` | 0 | 0 warnings; hint text in the web bundle; `grep -rqF sk-ant apps/web/dist` exit 1 (no match) |
| Client assets | `bun run test:client-assets` | 0 | passed |
| Script tests | `bun run test:script` | 0 | 13 pass, 0 fail |

- **Before:** the new `LoadingPanel` tests: exit 1, `No instances found with props: {"data-testid":"loading-hint"}`.
- **After:** exit 0, 4 pass.

## 5. Independent Review

- [x] Documented self-review: one static paragraph and one default prop; both consumers checked (`StartScreen.jsx:32`, `GameplayScreen.jsx:61`); heading tests unchanged and green.
- [x] Follow-ups were written test-first by subagents and audited in the parent: diff read, targeted tests and lint re-run, staged by explicit path. FU-1's `claimed` guard was proven by a restored mutation (test 2 fails without it).
- [x] Parent diff audit: `git diff origin/main` lists only the plan, the two `LoadingPanel` files, the PR #45 plan, and its new evidence file.

**Reviewer verdict:** `correct`. It would change if a consumer asserted the full panel text, which no test does.

## 6. Risk, Rollout, Rollback

| Concern | Answer |
|---|---|
| Blast radius | The loading overlay text; the continue/preload flow of the game; the Worker's Claude timeout. |
| Door | Two-way: revert the merge and redeploy Pages. |
| Rollout | Merge, then deploy the Worker (timeout, date) and Pages (hint, preload fix), each at its own approval. |
| Health signal | The estimate line is visible while a chapter loads. |
| Rollback | `git revert -m 1 <merge commit>` and `bash scripts/deploy-website.sh`. |
| Compatibility | `hint` is optional; existing callers unchanged. The worst case before the Groq fallback grows from about 90 s to about 180 s plus the retry delay (two 90 s attempts); no caller sets a shorter limit (`functions/api/scenario.js` and the browser `fetch` have none). |

## 7. Pre-Existing Issues and Deferred Debt

- 10 `AuthContext` web tests fail on `main` (unchanged by this PR). `defer: separate pull request (AGENTS.md A7), when the owner schedules it`.
- `apps/web/src/hooks/useGameState.js`: a preload still running when the visitor finishes and starts a new topic can land in the new topic's `nextGameData` (existed before this PR). `defer: next change to the hook, with a reset test`.
- The PR #45 plan stays open on T6 and on a tail-captured live `"outcome":"ok"` line (`docs/code-plan/evidence/2026-10-21-claude-story-worker/production.md`). `defer: the AuthContext fix PR, which re-runs its readiness`.
