# ⏳ Time Capsule

> Interactive historical time-travel simulation — type a past event, meet historical figures, and explore chronologically generated chapters powered by Gemini.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-workspace-fbf0df?logo=bun&logoColor=black)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-pipeline-EF4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Vite](https://img.shields.io/badge/Vite-React-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

## About

**Time Capsule** is an open-source educational adventure app. You enter a historical topic (for example a battle, kingdom, or figure), and the app generates a multi-chapter dialogue scenario: you are a time traveler talking with 3–4 NPCs, making diplomacy/quiz choices, and unlocking narrator "history insights" at the end of each section.

Scenarios are produced on the client via the **Google Gemini** API (`gemini-2.5-flash-preview-09-2025`), using a fixed system prompt and JSON response schema in `@time-capsule/game-engine`.

> **Note:** The Gemini `apiKey` constant ships empty (`""`) by design in source. You must set it locally before live generation works. Client-side key exposure is a known limitation (no backend proxy yet).

## Features

- 🏛️ **Topic-driven scenarios** — start from any historical event/theme
- 🗣️ **Dialogue + narrator + quiz modes** — typewriter UI, character boxes, full-screen quiz popups
- 📖 **Multi-chapter flow** — continue to "BAGIAN N+1" with smart preload of the next chapter
- 🔊 **Web Audio sound engine** — clicks, typing, warp, correct/wrong feedback
- 🎨 **Mood-reactive backgrounds** — gradients and emoji particles from scene/mood data
- ⌨️ **Keyboard continue** — press Enter to advance when not on the start screen

## Monorepo layout

```
time-capsule/
├── apps/
│   └── web/                 # @time-capsule/web — Vite + React 18 + Tailwind CSS v3
├── packages/
│   ├── game-engine/         # @time-capsule/game-engine — Gemini client, system prompt, SoundEngine
│   └── ui/                  # @time-capsule/ui — Typewriter, LoadingPanel, DynamicBackground,
│                            #                      QuizPopup, NarratorBox, DialogueBox, formatText
├── .env.example             # Example environment variables template
├── package.json             # private root, workspaces, turbo scripts
├── bunfig.toml              # Bun workspace configuration
├── bun.lock                 # Bun lockfile (committed)
└── turbo.json               # dev + build pipelines
```

| Package | Name | Role |
|---------|------|------|
| `apps/web` | `@time-capsule/web` | App shell, state, gameplay loop, Tailwind entry |
| `packages/game-engine` | `@time-capsule/game-engine` | `apiKey`, `GEMINI_SYSTEM_PROMPT`, `fetchScenarioData`, `SoundEngine` |
| `packages/ui` | `@time-capsule/ui` | Presentational components shared by the web app |

## Tech stack

- **Package manager:** Bun workspaces  
- **Orchestration:** Turborepo (`dev`, `build`)  
- **App bundler:** Vite + `@vitejs/plugin-react`  
- **UI:** React 18, Tailwind CSS v3, `lucide-react`  
- **AI:** Google Generative Language API (Gemini)

Tailwind `content` scans both `apps/web/src` and `packages/ui/src` so utility classes used in the UI package are not purged.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.0+

### Install

```bash
bun install
```

### Configure Gemini API key

You can set your Google Gemini API key in one of two ways:

1. **Environment Variable (Recommended):**
   Create a `.env` or `.env.local` file in the root directory (or in `apps/web/`) and add:
   ```env
   VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
   Or set it in your current terminal session:
   ```bash
   VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY bun run dev
   ```

2. **Hardcoding (Fallback):**
   Edit `packages/game-engine/src/systemPrompt.js` and set:
   ```js
   const apiKey = "YOUR_GEMINI_API_KEY";
   ```
   > [!WARNING]
   > Do not commit real keys to version control. Using the environment variable method keeps your API keys secure.

### Develop

```bash
# all packages via Turbo
bun run dev

# or only the web app
bun --filter @time-capsule/web run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Build

```bash
bun run build
# equivalent: turbo run build
```

Production output: `apps/web/dist`.

### Deploy

You can deploy the built assets to Cloudflare Pages using the `deploy` script. Ensure you have your Cloudflare API token and account ID set in your environment:

```bash
export CLOUDFLARE_API_TOKEN="YOUR_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="YOUR_ACCOUNT_ID"
bun run deploy
```

## Scripts (root)

| Script | Description |
|--------|-------------|
| `bun run dev` | `turbo run dev` — start workspace dev tasks |
| `bun run build` | `turbo run build` — build in dependency order |
| `bun run deploy` | `turbo run build && wrangler deploy apps/web/dist` — build and deploy to Cloudflare Pages |

## Contributing

Pull requests welcome. Please keep refactors as import/export rewiring when possible: do not change class names, prompt text, emoji datasets, or gameplay behavior unless the PR is explicitly about those.

## License

[MIT](LICENSE) © 2026 [Iwan Kurniawan](https://belajarcarabelajar.com)
