# Independent review 1: Claude story Worker

- **Date:** 2026-10-21
- **Reviewer:** independent subagent that did not write the change (read-only)
- **Diff:** `origin/main...3bd0552` (code identical to `776fc13`)
- **Contract:** spec `docs/code-plan/specs/2026-10-21-claude-story-worker-design.md`, plan AC1 to AC11
- **Verdict:** `not correct` (one P1). Condition to flip: the visitor sees the server message for 422 and 429, with a test that fails on the generic text, or the spec is amended.

## Reviewer commands

| Command | Exit | Result |
|---|---|---|
| `bun test packages/game-engine/src/__tests__/scenarioPrompt.test.js` | 0 | 36 pass |
| `bun test functions/api/scenario.test.js` | 0 | 40 pass |
| `cd apps/story-worker && bun test src` | 0 | 41 pass |
| `bun ~/vivera/scripts/check-copy-rules.mjs --diff origin/main` | 0 | clean |
| `bun ~/vivera/scripts/check-design-tells.mjs --diff origin/main` | 0 | clean |
| `bun ~/vivera/scripts/check-duplicate-defs.mjs --diff origin/main` | 0 | no duplicate definitions |
| `git log -p origin/main..HEAD` searched for `sk-ant` | 0 | only the test placeholder `sk-ant-test-key-0000` and documentation of the grep command; no real key |

## Findings

| ID | Severity | Confidence | Location | Finding | Parent decision |
|---|---|---|---|---|---|
| R1 | P1 | 0.8 | `functions/api/scenario.js:27-34` (messages); masked at `apps/web/src/hooks/useGameState.js:97,156` | The REFUSED (422) and RATE_LIMITED (429) messages never reach the visitor: the hook always shows a fixed string, so a refused topic reads as a connection failure. Spec user stories 3 and 5 are only partly built. | Verified by the parent; fixed in this PR (chunk C-R1). |
| R2 | P3 | 0.35 | `packages/game-engine/src/scenarioPrompt.js:18-19,29` | The sanitizer keeps variation selectors (U+FE0F, U+E0100 to U+E01EF), several invisible fillers, and lookalike brackets such as fullwidth `＜ ＞`. No bypass shown; hardening of the stated defense. | Fixed in this PR (chunk C-R2). |
| R3 | P3 | 0.5 | plan AC11 | AC11 (key never in browser code) is proven only by a manual grep; no test fails if `VITE_ANTHROPIC_*` is added later. `scripts/build-website.test.js:62` already guards other Vite names. | Fixed in this PR (chunk C-R2). |
| R4 | P3 | 0.4 | `apps/story-worker/src/claude.js:52-65` | Claude failures outside the five named reasons (for example a 400 schema rejection) log as `unknown` with no upstream status, so a permanent Claude misconfiguration looks like Groq quietly serving. | Fixed in this PR (chunk C-R2): numeric `upstream_status` in the log only. |

## Coverage

- **Security:** no path reaches Claude or Groq without the Worker limiter; missing or throwing limiters are terminal; replies carry fixed messages; logs carry reason codes, status, tokens, and duration only; exact key set rejects `__proto__` and legacy bodies.
- **Correctness:** the fallback table and the charge-after-success rule match the spec (cases enumerated against `scenario.test.js`).
- **Claude request shape:** `claude-haiku-5-5`, `max_tokens` 16000, adaptive thinking, `output_config` with effort `medium` and `json_schema`; no sampling parameters, no `fallbacks`; every schema object closed; no unsupported keywords.
- **Compatibility:** browser success shape unchanged; `fetchScenarioData` signature unchanged; old tabs that send `messages` get 400.
- **Data:** no schema change; stored story content becomes `{provider, response}`; no reader of `stories.content` in the repository.
- **Test reversal:** AC1 to AC10 each have a test that goes red on revert; AC11 had none (R3). AC10's post-deploy `workers.dev` check runs in T7.
- **Not verified by the reviewer:** Free-plan behaviour of the Rate Limiting binding, Worker CPU under the Free limit, real Claude behaviour on injected text (all deferred to the gated deploy and smoke test).

## Pre-existing, not counted against the diff

- 10 `AuthContext` web tests fail on `main` at `14cc4db` (see `verification.md`).
- `.github/workflows/quality.yml` runs lint as `bun --cwd apps/web run lint`, which prints Bun usage and exits 0 on bun 1.4.3.
- Points are checked before the provider call and deducted after it; concurrent requests can race, now bounded by the per-user limiter.
