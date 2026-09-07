# Continuation checkpoint — 2026-09-08

Status: implementation complete; focused checks passed; visual review of the poster and Chromium screenshot is the remaining human step before release acceptance. Base was `a37ea8a` (rural-village spec + plan); five commits landed on `main`. Planning authority `~/.config/ai/Super Ultra Code Plan Implementation.md`; TDD and fresh-verification gates were recalled at every checkpoint. No push, deployment, production request, or production database mutation performed.

## Approved work delivered: `rural-village` environment

The user approved the full `rural-village` TDD plan over `war-front` and `urban-poor`. Docs: `docs/code-plan/specs/2026-09-08-rural-village-environment-design.md` and `docs/code-plan/plans/2026-09-08-rural-village-environment.md`.

**Completed; do not repeat**

- `rural-village` appended last to `HISTORY_ENVIRONMENT_KEYS` (game-engine) and to the system-prompt advertise list via the existing template.
- Room manifest entry added: `sawah` (Sawah), `lumbung` (Lumbung padi), `irigasi` (Saluran irigasi), outdoor camera `[10, 6.5, 11]`, and a matching `visualVisits` detail view.
- Conservative resolver predicate: strong agrarian-life signals (petani, sawah, padi, ladang, panen raya, bawon, subak, irigasi, pertanian, agraris, lumbung padi, bajak) select `rural-village` only when no war signal is present, checked after the market-port branch and before the incompatible fallback; unknown keys, unsafe input, conflicting eras, and incompatible contexts still select `archive`; the existing `['Majapahit', 'Java', 'archive']` row is unchanged.
- Procedural Blender scene authored: village ground and bund paths, three rows of stepped paddy basins with water and young rice, a swaying paddy-tuft motion prop, a timber granary on posts with a gabled roof, an irrigation channel with a sluice gate, trees, and a sky backdrop. `--room rural-village` added to the export script choices, dispatch, camera, and `enrich` prop/figure placement.
- Assets generated and provenance recorded: `rural-village.blend`, `room.glb` (553,380 bytes; 8,984 triangles; 13 draw primitives), `poster.webp`, `poster-detail.webp`, `export-report.json`.
- e2e desktop row added and passing; docs updated.

## Fresh verification

| Check | Result |
| --- | --- |
| `rtk bun test apps/web/src/immersive/__tests__/ packages/game-engine/tests/` | 81 pass, 0 fail |
| `roomAssets.test.js` | 12 pass, 0 fail (rural-village included) |
| `resolveRoom.test.js` | 30 pass, 0 fail (agrarian rows included) |
| `scenarioClient.test.js` | 4 pass, 0 fail (keys include `rural-village`) |
| Chromium `test:immersive` | 9 pass in 52.0s, rural-village row included (2 scenario calls, 0 fallback) |
| `rtk bun scripts/verify-history-assets.mjs` | exit 0 for all 6 rooms |
| ESLint `apps/web` | exit 0 |
| Em-dash scan on changed user-visible/docs files | 0 hits |

Commit trail: `40dccf3` keys, `46605bf` manifest, `fbf2de0` resolver, `33640d4` assets, `e152120` e2e. Docs commit follows this checkpoint.

## Findings and limits

- The game-engine key test file was already renamed from `geminiClient.test.js` to `scenarioClient.test.js` before this plan; plan commands and traceability reference the current name.
- `scripts/__pycache__/` created by the offline Blender run was removed; not part of the deliverable.
- Visual acceptance of the authored scene is pending human review: poster at `apps/web/public/history/rural-village/poster.webp` and Chromium screenshot at `/tmp/time-capsule-rural-village-desktop.png`. Automated budgets, checksums, rendering, and inspection all pass; the model runtime cannot inspect images, so pixel-level layout review is deferred to the user.

## Next unfinished tasks, in order

1. Human visual review of the rural-village poster and Chromium screenshot; adjust object view framing or scene layout if needed (recorded as a new commit).
2. Continue the three-rooms checkpoint unfinished items: remaining browser journeys, WebKit on a compatible host, source citations, AO/lighting realism, Pages/D1 end-to-end quota proof, README guidance, final AC evidence mapping and release authorization.

Rollback remains feature-off rebuild and separately authorized deployment. No running development server is intentionally left behind.
