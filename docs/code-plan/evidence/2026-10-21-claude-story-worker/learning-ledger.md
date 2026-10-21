# Session Learning Ledger: claude-story-worker

## 1. Identity

- **Session:** `claude-story-worker`
- **Plan file:** `docs/code-plan/plans/2026-10-21-claude-story-worker.md`
- **Written at:** 2026-10-21
- **Preconditions:** T1 to T5 done with evidence; review verdict `correct`; T6 blocked only by 10 web failures that are identical on `main`; T7 and T8 wait for their deploy gates after merge.

## 2. Mistake Log

| # | Category | Trigger (what I did) | Signal (how it surfaced) | Cost | Correct move |
|---|---|---|---|---|---|
| 1 | `premature-guess` | Wrote `bun --cwd apps/story-worker run check`, `run deploy`, and `run dev` into the plan, README, and root `package.json`, copying the CI lint step's form | The Worker subagent ran it: Bun printed its usage text and exited 0, wrangler never ran | 16 command lines rewritten; would have shipped a dev script that does nothing | `bun run --cwd <dir> <script>`, and confirm the script's own output (`$ wrangler ...`) appears |
| 2 | `tool-misfire` | Wrote invisible-character regex ranges as `​`-style escapes inside a Write payload | The review-fix subagent found literal zero-width and bidi characters in the file and rewrote them as escapes after a code point dump | 1 fix inside a follow-up chunk; the bug was invisible in every diff view | Write such escapes in a form that survives the tool payload, then dump code points (`python3 -c` over the line) before trusting the regex |
| 3 | `tool-misfire` | Used `it.each([null, ..., [valid]])` in bun:test | One case received the object instead of the array | 1 red run, 1 edit | Wrap every case in its own array: `[[null], [[valid]]]` |
| 4 | `rule-miss` | Wrote `rm -f $S/...` with a shell variable | `rm-tmp-guard` blocked the call (AGENTS.md 3.2 requires literal paths) | 1 call | Literal absolute paths in every `rm` |
| 5 | `rule-miss` | Gave the reviewer a 45 tool-call budget | The reviewer stopped at its 30-turn limit with no report; needed a SendMessage to finish (A23) | 1 resume | Budget below the agent's turn cap (about 25 calls) with a partial-report turn |
| 6 | `premature-guess` | Wrote a plan `skip_if` as `<tool> \| grep -q NAME` | `ultra-plan-runner` rejected it as a loose file probe, although the runner contract says a grep that filters tool output is behavioural | 1 validation round | Use `jq -e` or the tool's own exit code in `skip_if` |

## 3. Distilled Rules

| # | Candidate rule | Minimum-Signal | 30-Day Horizon | Keep? | Kind |
|---|---|---|---|---|---|
| 1 | WHEN a command runs a package script in another directory with Bun → DO `bun run --cwd <dir> <script>` and check the script's own output line, NOT `bun --cwd <dir> run <script>` (prints usage, exit 0, runs nothing on bun 1.4.3) | Y: the broken form is already in this repo's CI | Y | KEEP | mechanical: a test that rejects the form in `package.json` scripts and workflows |
| 2 | WHEN a source file must contain zero-width, bidi, or other invisible code points in a regex or string → DO verify the written bytes with a code point dump, NOT trust the editor or the diff view | Y | Y | KEEP | judgement |
| 3 | WHEN bun `it.each` rows are themselves arrays or may be arrays → DO wrap each row in an array, NOT pass the bare value (bun spreads array rows into arguments) | Y | Y | KEEP | judgement |
| 4 | WHEN dispatching a review subagent → DO keep its tool budget under its turn cap and name a partial-report turn, NOT a budget above the cap | covered by AGENTS.md A23 | n/a | NO-OP | n/a |
| 5 | WHEN deleting with `rm` under the guard → DO write literal paths | covered by AGENTS.md 3.2 | n/a | NO-OP | n/a |
| 6 | WHEN a plan `skip_if` reads tool output → DO use `jq -e` or the tool's exit code, NOT `\| grep -q` | Y | Y, until the runner and its contract agree | KEEP as a vivera follow-up (contract text and classifier disagree), not a repository rule here | mechanical |

KEEP rules 1 to 3 are written to this repository's `MEMORY.md`. Rule 1 also recurs across repositories on this machine, so it is offered for promotion to `~/AGENTS.md` (per-item approval).

## Environment Improvements

| # | Kind | What happened | Proposed change | Keep? |
|---|---|---|---|---|
| 1 | `information-access` | The Groq key exists only as an unreadable Pages `secret_text`, so the fallback had to stay in the Pages Function | None: unreadable secrets are the intended property (AGENTS.md S1) | NO-OP |
| 2 | `information-access` | `plan-sync.mjs` refused the plan because `time-capsule` is not registered in vivera `plans.publish.json` or `plan.issues.json` | Register the project in both files (another repository, public issue) | KEEP as a LATER follow-up with its own approval |
