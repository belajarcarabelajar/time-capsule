# MEMORY.md

Rules learned from past sessions in this repository, in `WHEN → DO, NOT` form. Source: the session learning ledgers under `docs/code-plan/evidence/`.

## Task Group: Claude story Worker (2026-10-21, `docs/code-plan/evidence/2026-10-21-claude-story-worker/learning-ledger.md`)

| # | Rule |
|---|---|
| M1 | WHEN a command runs a package script in another directory with Bun → DO `bun run --cwd <dir> <script>` and check that the script's own output line (`$ <command>`) appears, NOT `bun --cwd <dir> run <script>`, which prints Bun's usage text and exits 0 without running anything (measured on bun 1.4.3). Mechanical: keep only until a test rejects the form in `package.json` scripts and workflows. |
| M2 | WHEN a source file must contain zero-width, bidi, or other invisible code points in a regex or string → DO verify the written bytes with a code point dump after writing, NOT trust the editor or the diff view, where they render as nothing. |
| M3 | WHEN bun `it.each` rows are arrays or may be arrays → DO wrap each row in its own array (`[[value]]`), NOT pass the bare value, because bun spreads an array row into separate arguments. |

## Task Group: auto-tour and profile picture (2026-10-21, `docs/code-plan/evidence/2026-10-21-auto-tour/learning-ledger.md`)

| # | Rule |
|---|---|
| M4 | WHEN running this repository's Playwright configs on this laptop → DO set `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium` (no Playwright-bundled browser here; WebKit is absent, so add `--project chromium` where a config has a WebKit project), NOT run the package scripts bare and read the launch error as a test failure. |
| M5 | Replaced by the check `every Playwright config uses its own dev server port` in `scripts/build-website.test.js` (2026-10-21). |
| M6 | WHEN a RED run must observe the base code while implementers edit the same worktree → DO run it in a separate checkout or before they start, NOT in the shared worktree. |
| M7 | WHEN visual evidence needs motion-on WebGL frames in headless Chromium → DO launch with `--ignore-gpu-blocklist --use-gl=angle --use-angle=gl-egl` (renderer `Mesa Intel UHD Graphics 630`), NOT SwiftShader, whose slow frames trip the frame monitor's poster fallback within seconds. |
| M8 | WHEN several subagents share a scratch root → DO give each its own subfolder and limit its cleanup to that subfolder, NOT one shared folder that any agent may delete. |
