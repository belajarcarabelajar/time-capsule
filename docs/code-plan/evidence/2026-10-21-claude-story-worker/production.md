# Production evidence: Claude story Worker (T7, T8)

- **Date:** 2026-10-21 (all times UTC)
- **Source revision:** `main` at `38ded6e` (merge of PR #45), working tree identical to the verified head `dd3d4fe` (`git diff` 0 lines)
- **Approvals:** `Merge`, `Deploy W`, and `Deploy P` gates, each answered by the owner in its own question.

## T7: story Worker and secret

| Check | Command or source | Result |
|---|---|---|
| Deploy | `bun run --cwd apps/story-worker deploy` | exit 0; `Total Upload: 904.91 KiB / gzip: 157.68 KiB`; startup 5 ms; bindings `STORY_USER_LIMIT (6 requests/60s)`, `STORY_GLOBAL_LIMIT (20 requests/60s)` accepted on Workers Free; `No targets deployed`; version `1c167ae7-e73c-4170-b727-eafa200eee93` |
| Secret | value piped from the untracked root `.env` into `wrangler secret put ANTHROPIC_API_KEY --name time-capsule-story` | exit 0; `wrangler secret list` shows `ANTHROPIC_API_KEY secret_text` |
| No public URL (AC10) | `GET /accounts/<id>/workers/scripts/time-capsule-story/subdomain` | `{"enabled":false,"previews_enabled":false}` |
| No public URL (AC10) | `POST https://time-capsule-story.<account-subdomain>.workers.dev/v1/story` | HTTP 404, `error code: 1042` |

## T8: Pages binding and deploy

| Check | Command or source | Result |
|---|---|---|
| Binding | `PATCH /pages/projects/time-capsule` with `deployment_configs.production.services.STORY_WORKER = {service: "time-capsule-story", environment: "production"}` | `success: true`; production and preview env var names and types unchanged (`diff` exit 0 before and after) |
| Deploy | `bash scripts/deploy-website.sh` from `main` | exit 0; deployment `73d38367`, production, stage `success`, `uses_functions: true` |
| Live frontend | live `index.html` and bundle compared with the local build | same bundle `index-DiknqPcY.js`; no prompt text in the client; request body carries `chapter` |
| Live function, unauthenticated | `POST /api/scenario` without a session | HTTP 401 `UNAUTHORIZED` |

## Live traffic

- `wrangler tail time-capsule-story` and `wrangler pages deployment tail` ran from 13:18 to 13:47 with a positive control (an unauthenticated probe appeared in the Pages tail each time). No browser request arrived in that window; Pages Functions analytics for `pages-worker--16165600-production` showed 3 invocations in 90 minutes, all of them the probes.
- At 13:48 to 13:49 the owner played a chapter while no tail was running. Analytics for that window:

| Minute | Script | Requests | Subrequests | Wall time | CPU |
|---|---|---|---|---|---|
| 13:48 | `time-capsule-story` | 1 | 1 | 32.6 s | 29.1 ms |
| 13:49 | `time-capsule-story` | 1 | 1 | 33.1 s | 4.3 ms |
| 13:48 | Pages production | 4 | 3 | | |
| 13:49 | Pages production | 3 | 1 | | |

- Reading: each scenario request made one Pages subrequest (the Worker) and the Worker one subrequest (Claude). A fallback-eligible failure would have added a second Pages subrequest (Groq), so both chapters came from Claude. This is an inference from counts, not a captured `"outcome":"ok"` log line.
- The 29.1 ms CPU of the first invocation is above the Workers Free 10 ms CPU figure and still completed with status `success`; repeated cold starts at that cost are a risk to watch, not a measured failure.

## Claude path measured outside the live site

Production code, key, and schema, run locally against the Claude API:

| Run | Effort | Time | Attempts | Output tokens | Slides | Last slide |
|---|---|---|---|---|---|---|
| `wrangler dev`, Perang Diponegoro | medium | 72.8 s | not measured | 5848 | 19 | quiz |
| Kerajaan Majapahit | medium | 28.3 s | 1 | 5738 | 19 | narrator |
| Perang Diponegoro | medium | 31.4 s | 1 | 6501 | 21 | narrator |
| Revolusi Prancis | medium | 31.8 s | 1 | 6898 | 27 | narrator |
| Sumpah Pemuda 1928 | medium | 29.6 s | 1 | 6492 | 21 | narrator |
| Perang Diponegoro | low | 12.6 s | 1 | 2350 (0 thinking) | 16 | narrator |
| Sumpah Pemuda 1928 | low | 13.4 s | 1 | 2483 (0 thinking) | 18 | narrator |
| Revolusi Prancis | low | 27.0 s | 1 | 5684 (2532 thinking) | 18 | narrator |

Every response passed the client Zod schema. Two of three effort-low samples held one quiz instead of the two the prompt requires; the owner kept effort `medium` and chose a loading estimate instead (plan `2026-10-21-story-loading-hint`).

## Found during these checks

- `wrangler dev` for the story Worker fails locally: `wrangler.jsonc` uses compatibility date 2026-10-01 and the workerd bundled with wrangler 4.129.0 supports up to 2026-09-10 (`--compatibility-date 2026-09-10` works).
- Old Pages variables `VITE_CF_API_TOKEN`, `VITE_GEMINI_API_KEY`, `VITE_CF_ACCOUNT_ID` were deleted from production and preview at the owner's request (`success: true`); they leave the runtime on the next Pages deploy.
- GitHub Actions `Quality` workflow disabled at the owner's request (`gh workflow disable quality.yml`, state `disabled_manually`); verification is local from now on.
