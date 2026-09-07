# Continuation checkpoint — 2026-09-07

Status: implementation complete; focused checks passed; release acceptance deferred as before. Base was `0fdd33f`; five commits landed on `main`. Planning authority `~/.config/ai/Super Ultra Code Plan Implementation.md`; TDD and fresh-verification gates were recalled at every checkpoint. No push, deployment, production request, or production database mutation performed.

## Approved work delivered: `market-port` environment

The user approved `market-port` (full TDD plan) over `rural-village` and `urban-poor`. Docs: `docs/code-plan/specs/2026-09-07-market-port-environment-design.md` and `docs/code-plan/plans/2026-09-07-market-port-environment.md`.

**Completed; do not repeat**

- `market-port` appended to `HISTORY_ENVIRONMENT_KEYS` (game-engine) and to the system-prompt advertise list via the existing template.
- Room manifest entry added: `dock` (Dermaga), `market-stall` (Lapak pasar), `cargo` (Muatan kapal), outdoor camera `[9,5,13]`.
- Conservative resolver predicate: strong maritime-trade signals (Sriwijaya, jalur rempah, Sunda Kelapa, Batavia, pelabuhan, maritim, VOC, etc.) select `market-port` only when no war signal is present; unknown keys, unsafe input, conflicting eras, and incompatible contexts still select `archive`.
- Procedural Blender scene authored: harbor water, shore bank, pier with posts and railings, three canvas market stalls, moored ship with mast and furled sail, stacked cargo, distant shore, sky backdrop. `--room market-port` added to the export script choices and dispatch.
- Assets generated and provenance recorded: `market-port.blend`, `room.glb` (318,924 bytes; 5,428 triangles; 8 draw primitives), `poster.webp` (40,036 bytes), `export-report.json`.
- e2e row added and passing; docs updated.

## Fresh verification

| Check | Result |
| --- | --- |
| `rtk bun test apps/web/src/immersive/__tests__/` | 52 pass, 0 fail |
| `rtk bun test packages/game-engine/tests/geminiClient.test.js` | 4 pass, 0 fail |
| `rtk bun test packages/game-engine` (full) | 42 pass, 0 fail; expected error-injection logs only |
| `HistoricalEnvironment + RoomModel + GameplayScreen` | 20 pass, 0 fail |
| `rtk bun scripts/verify-history-assets.mjs` (all 5 rooms) | exit 0; market-port 318,924 B / 5,428 tris / 8 prims |
| `roomAssets.test.js` | 5 pass (market-port included) |
| Chromium `test:immersive` | 8 pass in 43.0s, market-port row included |
| ESLint `apps/web` | exit 0 |
| Em-dash scan on changed user-visible/docs files | 0 hits |

Commit trail: `8e10577` keys, `ba27231` manifest, `09f5db1` resolver, `1a74ce8` assets, `165a6bf` e2e. Docs commit follows this checkpoint.

## Findings and limits

| Finding | Severity / confidence | Disposition |
| --- | --- | --- |
| Local Blender is 5.2.1 LTS, not the 4.5.4 recorded for earlier rooms | Low / high | Recorded in provenance; export report names the actual version |
| Poster and GLB not visually reviewed by a human this cycle | Open / high | Chromium screenshot saved at `/tmp/time-capsule-market-port-desktop.png`; review before release |
| WebKit still cannot launch on this WSL host | Verification blocker / high | Recorded previously; run on a supported host |
| Source citations remain empty for all rooms | Content acceptance open / high | Separate tracked item from the three-rooms checkpoint |
| Runtime lighting still lacks baked AO | Visual acceptance open / high | Tracked in the three-rooms checkpoint |
| No ambient audio assets | Optional media incomplete / high | Tracked; audio controls remain hidden without a room URL |

## Next unfinished tasks, in order

1. Human visual review of the market-port poster and Chromium screenshot.
2. Continue the three-rooms checkpoint unfinished items: remaining browser journeys, WebKit on a compatible host, source citations, AO/lighting realism, Pages/D1 end-to-end quota proof, README guidance, final AC evidence mapping and release authorization.

Rollback remains feature-off rebuild and separately authorized deployment. No running development server is intentionally left behind.
