# Session Learning Ledger: auto-tour

## 1. Identity

- **Session:** `auto-tour` (PR #47)
- **Plan file:** `docs/code-plan/plans/2026-10-21-auto-tour.md`
- **Written at:** 2026-10-21
- **Preconditions:** T1 to T7 done with evidence; review 1 verdict `correct` and its findings resolved; the only red gate is the 10 web tests that fail identically on `main` (F6).

## 2. Mistake Log

| # | Category | Trigger (what I did) | Signal (how it surfaced) | Cost | Correct move |
|---|---|---|---|---|---|
| 1 | `premature-guess` | Wrote every browser step in the plan and the subagent contracts as `bunx playwright test --config ...`, assuming Playwright's bundled browsers were installed | The T4 subagent's first run failed at launch for every test (`~/.cache/ms-playwright` missing); all browser evidence then needed scratch wrapper configs | several turns for the subagent, wrapper configs for six suites | Check `ls ~/.cache/ms-playwright` (or one launch) before writing browser commands into a plan |
| 2 | `premature-guess` | Gave the new profile config port 5175 without listing the ports of the other configs | Found only while writing the journeys wrapper: `playwright.journeys.config.js` already used 5175 | 1 extra commit (`016928e`) | `rg -n -o 'port [0-9]+' apps/web/playwright.*.config.js` before choosing a port |
| 3 | `rule-miss` | Dispatched the T4 spec writer to prove RED "on the base code" in the same worktree where T2 and T3 implementers were editing at the same time | The subagent reported that its later runs saw other agents' edits; only its first run was on base code | RED evidence nearly ambiguous; extra report reading | Run a RED that must see the base code in a separate checkout, or before the implementers start |
| 4 | `tool-misfire` | Waited for another session's Chromium with `pgrep -f 'c2-adobe-profile'` inside a `bash -c` loop | The pattern also matched the loop's own command line, so it could never exit; caught by reading, stopped with TaskStop | 1 background task | Use the bracket form `pgrep -f 'c2-adobe-[p]rofile'` or a PID (AGENTS.md A3 states the same self-match for kill) |
| 5 | `rule-miss` | Gave the reviewer a 25 tool-call budget and no partial-report turn | The reviewer stopped at its 30-turn limit with no report; needed a SendMessage (A23) | 1 resume | Name a partial-report turn and keep the budget well under the turn cap (A23, same as the previous session's ledger row 5) |
| 6 | `rule-miss` | Several subagents shared `~/.cache/tmp/time-capsule-scratch/` without per-agent subfolders | One agent's cleanup deleted the folder while another agent's wrapper configs lived there; the second agent recreated them | 1 recreate | Give each subagent its own scratch subfolder in the contract and tell it to delete only that subfolder |
| 7 | `premature-guess` | Accepted SwiftShader as the only way to render in headless Chromium | 53 of 64 mid-glide frames fell back to the poster; a probe then showed `--use-angle=gl-egl` reaches the Intel GPU headless | 1 extra sweep run (5.7 min), worth it | Probe `UNMASKED_RENDERER_WEBGL` with GPU flags before treating software-rendering limits as test limits |

## 3. Distilled Rules

| # | Candidate rule | Minimum-Signal | 30-Day Horizon | Keep? | Kind |
|---|---|---|---|---|---|
| 1 | WHEN a plan or contract names a Playwright command for this repository → DO check that a browser launches here first (no bundled browser on this laptop; system Chromium is `/usr/bin/chromium`), NOT copy the package script and assume it runs | Y | Y until the configs gain an executable override (follow-up) | KEEP | mechanical once the configs read an env override; judgement until then |
| 2 | WHEN adding a Playwright config → DO pick a dev server port no other `playwright.*.config.js` uses, NOT reuse one (`reuseExistingServer: false` makes two configs collide only when run together) | Y | Y | KEEP | mechanical: a test asserting unique ports |
| 3 | WHEN a RED run must observe the base code while implementers edit the same worktree → DO run it in a separate checkout or before they start, NOT in the shared worktree | Y | Y | KEEP | judgement |
| 4 | WHEN visual evidence needs motion-on WebGL frames in headless Chromium → DO use the GPU flags `--ignore-gpu-blocklist --use-gl=angle --use-angle=gl-egl` (renderer `Mesa Intel UHD Graphics 630`), NOT SwiftShader, whose slow frames trip the poster fallback | Y | Y | KEEP | judgement |
| 5 | WHEN waiting on a process by pattern in a shell loop → DO bracket the pattern or use a PID | covered by AGENTS.md A3 (same self-match) | n/a | NO-OP | n/a |
| 6 | WHEN dispatching a reviewer → DO name a partial-report turn under the turn cap | covered by AGENTS.md A23 | n/a | NO-OP | n/a |
| 7 | WHEN several subagents share a scratch root → DO give each its own subfolder and limit its cleanup to it | Y | Y | KEEP | judgement; candidate for the vivera subagent contract template (another repository) |

KEEP rules 1 to 4 and 7 are written to this repository's `MEMORY.md`. Rule 7 belongs in vivera's `templates/subagent-contract-template.md` as well; that is another repository and is left as a LATER follow-up.

## Environment Improvements

| # | Kind | What happened | Proposed change | Keep? |
|---|---|---|---|---|
| 1 | `information-access` | No repository document says how to run the browser suites on a machine without Playwright's bundled browsers | Env override for the executable and GPU flags in the Playwright configs, documented in README (follow-up) | KEEP as a follow-up |
| 2 | `tool-economy` | Each browser suite needed its own hand-written wrapper config in scratch | Same change as above removes the wrappers | KEEP (same follow-up) |
