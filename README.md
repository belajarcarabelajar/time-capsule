# ⏳ Time Capsule

> Interactive historical time-travel simulation — type a past event, meet historical figures, and explore chronologically generated chapters powered by Gemini.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-pipeline-EF4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Vite](https://img.shields.io/badge/Vite-React-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

## About

**Time Capsule** is an open-source educational adventure app. You enter a historical topic (for example a battle, kingdom, or figure), and the app generates a multi-chapter dialogue scenario: you are a time traveler talking with 3–4 NPCs, making diplomacy/quiz choices, and unlocking narrator “history insights” at the end of each section.

Scenarios are produced on the client via the **Google Gemini** API (`gemini-2.5-flash-preview-09-2025`), using a fixed system prompt and JSON response schema in `@time-capsule/game-engine`.

> **Note:** The Gemini `apiKey` constant ships empty (`""`) by design in source. You must set it locally before live generation works. Client-side key exposure is a known limitation (no backend proxy yet).

## Features

- 🏛️ **Topic-driven scenarios** — start from any historical event/theme
- 🗣️ **Dialogue + narrator + quiz modes** — typewriter UI, character boxes, full-screen quiz popups
- 📖 **Multi-chapter flow** — continue to “BAGIAN N+1” with smart preload of the next chapter
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
├── package.json             # private root, workspaces, turbo scripts
├── pnpm-workspace.yaml
└── turbo.json               # dev + build pipelines
```

| Package | Name | Role |
|---------|------|------|
| `apps/web` | `@time-capsule/web` | App shell, state, gameplay loop, Tailwind entry |
| `packages/game-engine` | `@time-capsule/game-engine` | `apiKey`, `GEMINI_SYSTEM_PROMPT`, `fetchScenarioData`, `SoundEngine` |
| `packages/ui` | `@time-capsule/ui` | Presentational components shared by the web app |

## Tech stack

- **Package manager:** pnpm workspaces  
- **Orchestration:** Turborepo (`dev`, `build`)  
- **App bundler:** Vite + `@vitejs/plugin-react`  
- **UI:** React 18, Tailwind CSS v3, `lucide-react`  
- **AI:** Google Generative Language API (Gemini)

Tailwind `content` scans both `apps/web/src` and `packages/ui/src` so utility classes used in the UI package are not purged.

## Getting started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io) 9+ (lockfile targets `pnpm@9.15.0`)

### Install

```bash
pnpm install
```

### Configure Gemini API key

Edit `packages/game-engine/src/systemPrompt.js` and set:

```js
const apiKey = "YOUR_GEMINI_API_KEY";
```

Do not commit real keys. Prefer a local-only change or future env wiring.

### Develop

```bash
# all packages via Turbo
pnpm dev

# or only the web app
pnpm --filter @time-capsule/web dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Build

```bash
pnpm build
# equivalent: turbo run build
```

Production output: `apps/web/dist`.

## Scripts (root)

| Script | Description |
|--------|-------------|
| `pnpm dev` | `turbo run dev` — start workspace dev tasks |
| `pnpm build` | `turbo run build` — build in dependency order |

## Contributing

Pull requests welcome. Please keep refactors as import/export rewiring when possible: do not change class names, prompt text, emoji datasets, or gameplay behavior unless the PR is explicitly about those.

## License

[MIT](LICENSE) © 2026 [Iwan Kurniawan](https://belajarcarabelajar.com)
