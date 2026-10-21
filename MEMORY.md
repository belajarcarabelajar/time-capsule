# MEMORY.md

Rules learned from past sessions in this repository, in `WHEN → DO, NOT` form. Source: the session learning ledgers under `docs/code-plan/evidence/`.

## Task Group: Claude story Worker (2026-10-21, `docs/code-plan/evidence/2026-10-21-claude-story-worker/learning-ledger.md`)

| # | Rule |
|---|---|
| M1 | WHEN a command runs a package script in another directory with Bun → DO `bun run --cwd <dir> <script>` and check that the script's own output line (`$ <command>`) appears, NOT `bun --cwd <dir> run <script>`, which prints Bun's usage text and exits 0 without running anything (measured on bun 1.4.3). Mechanical: keep only until a test rejects the form in `package.json` scripts and workflows. |
| M2 | WHEN a source file must contain zero-width, bidi, or other invisible code points in a regex or string → DO verify the written bytes with a code point dump after writing, NOT trust the editor or the diff view, where they render as nothing. |
| M3 | WHEN bun `it.each` rows are arrays or may be arrays → DO wrap each row in its own array (`[[value]]`), NOT pass the bare value, because bun spreads an array row into separate arguments. |
