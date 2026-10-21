# ⏳ Time Capsule

> Interactive historical time-travel simulation: type a past event, meet historical figures, and explore chronologically generated chapters powered by AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-workspace-fbf0df?logo=bun&logoColor=black)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-pipeline-EF4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Vite](https://img.shields.io/badge/Vite-React-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20D1-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/)

## About

**Time Capsule** is an open-source educational adventure app. You enter a historical topic (for example a battle, kingdom, or figure), and the app generates a multi-chapter dialogue scenario: you are a time traveler talking with 3–4 NPCs, making diplomacy/quiz choices, and unlocking narrator "history insights" at the end of each section.

Scenarios are generated **server-side**: the client never holds an API key and never sends a prompt. The client (`fetchScenarioData` in `@time-capsule/game-engine`) POSTs only `{topic, chapter, history}` to `/api/scenario`. The Pages Function validates that request, checks points, and asks the private story Worker (`apps/story-worker`) for the chapter. The Worker applies rate limits and calls **Claude Haiku 5.5** (`claude-haiku-5-5`, effort `medium`) with structured JSON output. When Claude is unavailable, the Pages Function sends the same server-built prompt to the fallback provider (Groq, model `openai/gpt-oss-120b` by default; override with `PROVIDER_URL` / `PROVIDER_MODEL`).

Signed-in users get a **points economy** backed by Cloudflare D1: each generation costs points, balances reset daily, and generated stories are persisted. Sign-in is **Google OAuth** with a JWT session cookie.

## Features

- 🏛️ **Topic-driven scenarios**: start from any historical event/theme
- 🗣️ **Dialogue + narrator + quiz modes**: typewriter UI, character boxes, full-screen quiz popups
- 📖 **Multi-chapter flow**: continue to "BAGIAN N+1" with smart preload of the next chapter
- 🔊 **Web Audio sound engine**: clicks, typing, warp, correct/wrong feedback
- 🎨 **Mood-reactive backgrounds**: gradients and emoji particles from scene/mood data
- ⌨️ **Keyboard continue**: press Enter to advance when not on the start screen
- 🔐 **Google OAuth sign-in**: JWT session cookie, user profile bar
- 🪙 **Points economy (D1)**: per-generation cost, daily reset, persisted story history

## Monorepo layout

```
time-capsule/
├── apps/
│   ├── web/                 # @time-capsule/web: Vite + React 18 + Tailwind CSS v3
│   └── story-worker/        # @time-capsule/story-worker: private Worker, rate limits + Claude
├── packages/
│   ├── game-engine/         # @time-capsule/game-engine: scenario client, server prompt module, SoundEngine
│   └── ui/                  # @time-capsule/ui: Typewriter, LoadingPanel, DynamicBackground,
│                            #                      QuizPopup, NarratorBox, DialogueBox, formatText
├── functions/               # Cloudflare Pages Functions (backend)
│   └── api/
│       ├── scenario.js      # request validation, story Worker call, fallback provider, points, persistence
│       └── auth/            # Google OAuth: login, callback, logout, me (+ _utils)
├── schema.sql               # Cloudflare D1 schema (users, points, audit logs, stories)
├── scripts/
│   └── deploy-website.sh    # Build + deploy to Cloudflare Pages
├── .env.example             # Example environment variables template
├── package.json             # private root, workspaces, turbo scripts
├── bunfig.toml              # Bun workspace configuration
├── bun.lock                 # Bun lockfile (committed)
└── turbo.json               # dev + build pipelines
```

| Package                | Name                        | Role                                                          |
| ---------------------- | --------------------------- | ------------------------------------------------------------- |
| `apps/web`             | `@time-capsule/web`         | App shell, state, gameplay loop, auth context, Tailwind entry |
| `apps/story-worker`    | `@time-capsule/story-worker` | Private Worker: rate limits and the Claude call for each chapter |
| `packages/game-engine` | `@time-capsule/game-engine` | `SCENARIO_SYSTEM_PROMPT`, server prompt module (`scenarioPrompt.js`), `fetchScenarioData`, `SoundEngine` |
| `packages/ui`          | `@time-capsule/ui`          | Presentational components shared by the web app               |

## Tech stack

- **Package manager:** Bun workspaces
- **Orchestration:** Turborepo (`dev`, `build`, `lint`, `test`)
- **App bundler:** Vite + `@vitejs/plugin-react`
- **UI:** React 18, Tailwind CSS v3, `lucide-react`
- **Backend:** Cloudflare Pages Functions (`functions/api`)
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** Google OAuth 2.0 + JWT session cookie
- **AI:** Claude Haiku 5.5 through the official `@anthropic-ai/sdk` in a Cloudflare Worker (primary); Groq OpenAI-compatible API (`openai/gpt-oss-120b` by default, env-driven) as the fallback
- **Sanitization:** `isomorphic-dompurify`

Tailwind `content` scans both `apps/web/src` and `packages/ui/src` so utility classes used in the UI package are not purged.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- A Claude API key (`https://platform.claude.com`) for the story Worker
- A Groq API key (free at `https://console.groq.com/keys`) for the fallback provider
- (Optional) A Cloudflare account with an API token + account ID for D1/auth/production deploy

### Install

```bash
bun install
```

### Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

| Variable                         | Used by                          | Purpose                            |
| -------------------------------- | -------------------------------- | ---------------------------------- |
| `ANTHROPIC_API_KEY`          | story Worker (secret)            | Claude API key for the primary provider |
| `PROVIDER_URL`               | Pages Functions                  | Fallback provider chat-completions URL (default Groq) |
| `PROVIDER_API_KEY`           | Pages Functions                  | Fallback provider API key (Groq key) |
| `PROVIDER_MODEL`             | Pages Functions                  | Fallback provider model id (default `openai/gpt-oss-120b`) |
| `GOOGLE_CLIENT_ID`               | auth                             | Google OAuth client ID             |
| `GOOGLE_CLIENT_SECRET`           | `functions/api/auth/callback.js` | Google OAuth client secret         |
| `GOOGLE_REDIRECT_URI`            | auth                             | OAuth callback URL                 |
| `JWT_SECRET`                     | auth                             | Signs the `auth_token` session JWT |
| `TIME_CAPSULE_FUNCTIONS_ORIGIN`  | Vite dev proxy                   | Local Pages Functions origin       |

> [!NOTE]
> In **local dev**, Vite proxies `/api/*` to the local Pages Functions host at `http://127.0.0.1:8788` by default. Start it with `bun run dev:pages` in a second terminal, then run `bun --filter web run dev`. Set `TIME_CAPSULE_FUNCTIONS_ORIGIN` only when the local Functions host uses another origin. In **production**, the `functions/api/*` Pages Functions read server-only values from the Cloudflare environment. There is no client-side `apiKey` constant.

> [!WARNING]
> Do not commit real keys to version control. `.env` is gitignored.

### Configure production on Cloudflare Pages

The `functions/api/*` Pages Functions read server-only values from the Cloudflare Pages project environment. Set these in the Cloudflare dashboard under **Settings, Environment variables** (and redeploy):

| Variable | Required | If missing |
| --- | --- | --- |
| `STORY_WORKER` (service binding to `time-capsule-story`) | yes | `POST /api/scenario` returns `500` `STORY_UNAVAILABLE`; no provider is called (fail closed, so the rate limit cannot be skipped) |
| `PROVIDER_API_KEY` | for the fallback | When Claude is unavailable, the request ends with `502` `STORY_UNAVAILABLE` instead of reaching Groq |
| `JWT_SECRET` | yes | Authentication fails on every request |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | yes | OAuth login fails |

The story Worker keeps its own secret: set `ANTHROPIC_API_KEY` with `wrangler secret put ANTHROPIC_API_KEY --name time-capsule-story` (value from stdin). The Worker has no public URL (`workers_dev` and preview URLs are off, no route); only the Pages service binding reaches it.

Request flow and statuses:

| Step | Result |
| --- | --- |
| Not signed in | `401` |
| Body over 16 KB | `413` |
| Body other than exactly `{topic, chapter, history}` (topic up to 200 characters, history up to 3000, chapter integer 1 to 100) | `400` `INVALID_REQUEST` |
| Not enough points | `403`; points unavailable `503` |
| Worker rate limit (6 per minute per account, 20 per minute site-wide, per Cloudflare location) | `429` `RATE_LIMITED`, no fallback |
| Claude declines the topic (`stop_reason: refusal`) | `422` `REFUSED`, no fallback |
| Claude unavailable (network, overload, upstream `429`, expired key, cut-off or invalid output) | the same server-built prompt goes to the fallback provider |
| Worker missing, crashed, or unknown reply | `5xx` `STORY_UNAVAILABLE`, no fallback |

Points are charged only after a provider success. Provider error bodies and exception messages never reach the browser; logs carry the reason, status, token counts, and duration only. The current Claude key expires 2026-11-20; after that the Worker reports `PRIMARY_UNAVAILABLE` with reason `auth` and the fallback provider serves until a new key is set.

To verify after configuring and redeploying: run `./node_modules/.bin/wrangler tail time-capsule-story`, start an adventure, and confirm a `story` log line with `outcome` `ok`, `/api/scenario` returns `200`, a story renders, and 10 points are deducted. Local dev needs the same variables in `.env` / `.dev.vars` (root for Pages Functions, `apps/story-worker/.dev.vars` for the Worker); all of them are gitignored.

### Develop

```bash
# all packages via Turbo
bun run dev

# or only the web app
bun --filter web run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Historical visuals

The web app uses the authored historical environment by default. A supported topic selects a local room from the topic and validated location metadata. On mobile, reduced-motion, save-data, static preference, or renderer failure, the same room remains available as a poster so the lesson stays usable.

To use the legacy gradient background explicitly:

```bash
VITE_IMMERSIVE_ENABLED=false bun --filter web run dev
```

The browser checks use mocked scenario and session responses and do not call AI providers or Google. `test:tour` covers the auto-tour camera per dialogue line and `test:profile` the profile picture after login:

```bash
bun --filter web run test:immersive
bun --filter web run test:immersive:fallback
bun --filter web run test:tour
bun --filter web run test:profile
```

The browser checks need Playwright's Chromium (`bunx playwright install chromium`) or a system Chromium through `PLAYWRIGHT_CHROMIUM=/path/to/chromium`. They render WebGL with SwiftShader by default; `PLAYWRIGHT_GPU=1` uses the GPU instead. The WebKit projects run only on Linux distributions that Playwright supports (Ubuntu, Debian); on other systems, such as Arch, use `--project chromium`.

See [`docs/history-environments.md`](docs/history-environments.md) for room scope, fallback rules, asset authoring, and verification prerequisites.

### Build

```bash
bun run build
# equivalent: turbo build
```

Production output: `apps/web/dist`.

## Authentication

Google OAuth 2.0, implemented as Cloudflare Pages Functions under `functions/api/auth/`:

| Endpoint             | Method   | Purpose                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------- |
| `/api/auth/login`    | GET      | Redirect to Google's consent screen                                             |
| `/api/auth/callback` | GET      | Exchange the OAuth code, upsert the user in D1, set the `auth_token` JWT cookie |
| `/api/auth/me`       | GET      | Return the current user from the JWT (cookie or `Bearer` header)                |
| `/api/auth/logout`   | GET/POST | Clear the session cookie                                                        |

The frontend wires this through `apps/web/src/context/AuthContext.jsx` and renders `UserBar.jsx`.

## Database (Cloudflare D1)

Schema lives in [`schema.sql`](schema.sql). Apply it with Wrangler:

```bash
wrangler d1 execute <your-d1-db> --file=schema.sql
```

Tables:

- **`users`**: profile from Google plus the points economy (`points`, `max_points`, `last_point_reset`; defaults to 50 points).
- **`point_transactions`**: ledger of every point change (`amount`, `balance_after`, `type`, `description`).
- **`auth_audit_logs`**: login audit trail (IP, country, user agent).
- **`stories`**: persisted generated scenarios (`prompt`, `content`, `points_spent`).

**Points flow:** each `/api/scenario` generation costs **10 points**; balances reset to `max_points` once per day (`last_point_reset`). If the user lacks points, generation is refused. Unauthenticated requests get `401`; without a D1 binding only the verified admin account can generate, every other account gets `503` `POINTS_UNAVAILABLE`.

## Testing

Tests run with Bun's test runner (happy-dom + Testing Library), orchestrated by Turbo:

```bash
bun run test      # turbo test: all workspaces
bun run lint      # turbo lint
bun run format    # prettier --write "**/*.{ts,tsx,md}"
```

Coverage spans the game-engine client and prompt module, UI components, `AuthContext`, `UserBar`, app integration, the backend `functions/api/scenario.test.js`, and the story Worker (`apps/story-worker/src/index.test.js`). No test calls a real provider.

## Deploy

Deployment targets **Cloudflare Pages** (static assets in `apps/web/dist` + the `functions/` directory as Pages Functions). The helper script builds, loads Cloudflare credentials, and deploys:

```bash
bash scripts/deploy-website.sh
```

The script never reads a neighboring project's credentials. Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, or provide a current-project file through `TIME_CAPSULE_CLOUDFLARE_ENV_FILE`. That file may contain only those two credential names. The script runs the build-only helper first, then executes `wrangler pages deploy apps/web/dist --project-name time-capsule`.

> Configure the fallback provider key (`PROVIDER_API_KEY`), OAuth secrets, `JWT_SECRET`, the D1 binding (`DB`), and the `STORY_WORKER` service binding in your Cloudflare Pages project settings so the Functions can read them at runtime.

Deploy the story Worker before the Pages project that binds to it:

```bash
bun run --cwd apps/story-worker check    # wrangler deploy --dry-run
bun run --cwd apps/story-worker deploy   # wrangler deploy (name time-capsule-story)
```

Then set its `ANTHROPIC_API_KEY` secret, add the `STORY_WORKER` service binding to the Pages production environment, and run `bash scripts/deploy-website.sh`.

## Scripts (root)

| Script                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `bun run dev`          | `turbo dev`: start workspace dev tasks             |
| `bun run build`        | `turbo build`: build in dependency order           |
| `bun run lint`         | `turbo lint`                                       |
| `bun run test`         | `turbo test`                                       |
| `bun run test:quality` | Web, engine, UI, backend, script, and asset checks |
| `bun run dev:pages`    | Build and serve local Pages Functions on port 8788, bound to the local story Worker |
| `bun run dev:story`    | Run the story Worker locally (`wrangler dev`); start it before `dev:pages` |
| `bun run format`       | `prettier --write "**/*.{ts,tsx,md}"`              |

> Deployment is **not** a package script. Run `bash scripts/deploy-website.sh` directly.

## Contributing

Pull requests welcome. Please keep refactors as import/export rewiring when possible: do not change class names, prompt text, emoji datasets, or gameplay behavior unless the PR is explicitly about those.

## License

[MIT](LICENSE) © 2026 [Iwan Kurniawan](https://belajarcarabelajar.com)
