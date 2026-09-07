# ⏳ Time Capsule

> Interactive historical time-travel simulation: type a past event, meet historical figures, and explore chronologically generated chapters powered by AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-workspace-fbf0df?logo=bun&logoColor=black)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-pipeline-EF4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Vite](https://img.shields.io/badge/Vite-React-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20D1-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/)

## About

**Time Capsule** is an open-source educational adventure app. You enter a historical topic (for example a battle, kingdom, or figure), and the app generates a multi-chapter dialogue scenario: you are a time traveler talking with 3–4 NPCs, making diplomacy/quiz choices, and unlocking narrator "history insights" at the end of each section.

Scenarios are generated **server-side** through a Cloudflare Pages Function proxy: the client never holds the API key. The client (`fetchScenarioData` in `@time-capsule/game-engine`) POSTs to `/api/scenario`, which calls an OpenAI-compatible provider (AgentRouter, model `gpt-5.5`) using a fixed system prompt (`SCENARIO_SYSTEM_PROMPT`) and a JSON response object.

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
│   └── web/                 # @time-capsule/web: Vite + React 18 + Tailwind CSS v3
├── packages/
│   ├── game-engine/         # @time-capsule/game-engine: scenario client, system prompt, SoundEngine
│   └── ui/                  # @time-capsule/ui: Typewriter, LoadingPanel, DynamicBackground,
│                            #                      QuizPopup, NarratorBox, DialogueBox, formatText
├── functions/               # Cloudflare Pages Functions (backend)
│   └── api/
│       ├── scenario.js      # AgentRouter proxy + D1 point deduction + story persistence
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
| `packages/game-engine` | `@time-capsule/game-engine` | `SCENARIO_SYSTEM_PROMPT`, `fetchScenarioData`, `SoundEngine`   |
| `packages/ui`          | `@time-capsule/ui`          | Presentational components shared by the web app               |

## Tech stack

- **Package manager:** Bun workspaces
- **Orchestration:** Turborepo (`dev`, `build`, `lint`, `test`)
- **App bundler:** Vite + `@vitejs/plugin-react`
- **UI:** React 18, Tailwind CSS v3, `lucide-react`
- **Backend:** Cloudflare Pages Functions (`functions/api`)
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** Google OAuth 2.0 + JWT session cookie
- **AI:** AgentRouter OpenAI-compatible API (`gpt-5.5`)
- **Sanitization:** `isomorphic-dompurify`

Tailwind `content` scans both `apps/web/src` and `packages/ui/src` so utility classes used in the UI package are not purged.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- An AgentRouter API key (get one at `https://agentrouter.org/console/token`)
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
| `AGENTROUTER_API_KEY`            | Pages Functions                  | AgentRouter OpenAI-compatible scenario API |
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
| `AGENTROUTER_API_KEY` | yes | `POST /api/scenario` returns `500` with `AgentRouter API key (AGENTROUTER_API_KEY) is not configured...` and the user sees "Gagal membuka portal. Coba lagi." |
| `JWT_SECRET` | yes | Authentication fails on every request |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | yes | OAuth login fails |

The AI request flow is a single call: the client POSTs to `/api/scenario`, which calls AgentRouter (`https://agentrouter.org/v1/chat/completions`, model `gpt-5.5`). Missing secrets are surfaced as exact status codes, never as guessed messages.

To verify after configuring and redeploying: start an adventure and confirm `/api/scenario` returns `200`, a story renders, and 10 points are deducted. Local dev needs the same variables in `.env` / `.dev.vars`; both files are gitignored.

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

The main room checks use mocked scenario responses and do not call AI providers:

```bash
bun --filter web run test:immersive
bun --filter web run test:immersive:fallback
```

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

**Points flow:** each `/api/scenario` generation costs **10 points**; balances reset to `max_points` once per day (`last_point_reset`). If the user lacks points, generation is refused. Unauthenticated / no-D1 requests skip the points logic and just proxy the model.

## Testing

Tests run with Bun's test runner (happy-dom + Testing Library), orchestrated by Turbo:

```bash
bun run test      # turbo test: all workspaces
bun run lint      # turbo lint
bun run format    # prettier --write "**/*.{ts,tsx,md}"
```

Coverage spans the game-engine client, UI components, `AuthContext`, `UserBar`, app integration, and the backend `functions/api/scenario.test.js`.

## Deploy

Deployment targets **Cloudflare Pages** (static assets in `apps/web/dist` + the `functions/` directory as Pages Functions). The helper script builds, loads Cloudflare credentials, and deploys:

```bash
bash scripts/deploy-website.sh
```

The script never reads a neighboring project's credentials. Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, or provide a current-project file through `TIME_CAPSULE_CLOUDFLARE_ENV_FILE`. That file may contain only those two credential names. The script runs the build-only helper first, then executes `wrangler pages deploy apps/web/dist --project-name time-capsule`.

> Configure the AgentRouter key, OAuth secrets, `JWT_SECRET`, and the D1 binding (`DB`) in your Cloudflare Pages project settings so the Functions can read them at runtime.

## Scripts (root)

| Script                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `bun run dev`          | `turbo dev`: start workspace dev tasks             |
| `bun run build`        | `turbo build`: build in dependency order           |
| `bun run lint`         | `turbo lint`                                       |
| `bun run test`         | `turbo test`                                       |
| `bun run test:quality` | Web, engine, UI, backend, script, and asset checks |
| `bun run dev:pages`    | Build and serve local Pages Functions on port 8788 |
| `bun run format`       | `prettier --write "**/*.{ts,tsx,md}"`              |

> Deployment is **not** a package script. Run `bash scripts/deploy-website.sh` directly.

## Contributing

Pull requests welcome. Please keep refactors as import/export rewiring when possible: do not change class names, prompt text, emoji datasets, or gameplay behavior unless the PR is explicitly about those.

## License

[MIT](LICENSE) © 2026 [Iwan Kurniawan](https://belajarcarabelajar.com)
