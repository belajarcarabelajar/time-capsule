# Continuation checkpoint — 2026-09-08

Status: implementation complete; focused checks passed; visual review of the poster and Chromium screenshot is the remaining human step before release acceptance. Base was `a864d50` (resistance-outpost spec + plan as `c8b0148`); six commits landed on `main`. Planning authority `~/.config/ai/Super Ultra Code Plan Implementation.md`; TDD and fresh-verification gates were recalled at every checkpoint. No push, deployment, production request, or production database mutation performed.

## Approved work delivered: `resistance-outpost` environment

The user approved the full `resistance-outpost` TDD plan as the seventh authored room and the scoped resolution of the open `war-front` room-pack bullet. Docs: `docs/code-plan/specs/2026-09-08-resistance-outpost-environment-design.md` and `docs/code-plan/plans/2026-09-08-resistance-outpost-environment.md`.

**Completed; do not repeat**

- `resistance-outpost` appended last to `HISTORY_ENVIRONMENT_KEYS` (game-engine) and to the system-prompt advertise list via the existing template.
- Room manifest entry added: `palisade` (Pagar bambu), `watch-post` (Menara jaga), `signal-fire` (Api isyarat), open-air camera, an illustration-marking scopeLabel, and a matching `visualVisits` detail view.
- Conservative resolver predicate: strong resistance/independence signals (diponegoro, perang jawa, perang padri, padri, puputan, perlawanan rakyat, proklamasi, pertempuran surabaya) select `resistance-outpost` only when no war signal and no Pacific/Japan signal is present, checked after the market-port and rural-village branches and before the incompatible fallback; unknown keys, unsafe input, conflicting eras, Japanese-occupation and Pacific/Japan contexts, generic colonial text, and bare `Majapahit`/`Java` still select `archive`; existing resolver rows are unchanged.
- Procedural Blender scene authored: ground clearing, a bamboo-timber palisade line with a central gate gap, a raised bamboo watch post, a lean-to shelter, a low signal fire, storage baskets, grass-tuft motion prop, forest fringe, and a sky backdrop. `--room resistance-outpost` added to the export script choices, dispatch, camera, and `enrich` prop/figure placement; the sentry carries a plain bamboo staff instead of the folio used elsewhere.
- Assets generated and provenance recorded: `resistance-outpost.blend`, `room.glb` (707,988 bytes; 12,180 triangles; 14 draw primitives), `poster.webp`, `poster-detail.webp`, `export-report.json`; provenance room entry plus `figureRoles["resistance-outpost"] = "Anonymous colonial resistance sentry, no rank or insignia"`.
- e2e desktop row added and passing; docs updated.

## Fresh verification

| Check | Result |
| --- | --- |
| Immersive + game-engine unit suites (`apps/web/src/immersive/__tests__/` + scenarioClient.test.js) | 94 pass, 0 fail |
| `resolveRoom.test.js` | pass, new resistance/guard rows included |
| `roomManifest.test.js` + `visualVisits.test.js` | pass, resistance-outpost included |
| `roomAssets.test.js` | pass, resistance-outpost included |
| `scenarioClient.test.js` | 4 pass, 0 fail (keys include `resistance-outpost`) |
| Chromium `test:immersive` | 10 pass in 57.9s, resistance-outpost row included (2 scenario calls, 0 fallback) |
| `rtk bun scripts/verify-history-assets.mjs` | exit 0 for all 7 rooms |
| ESLint `apps/web` | exit 0 |
| Em-dash scan on changed user-visible/docs files | 0 hits |

Commit trail: `c8b0148` docs, `97a4292` keys, `569d9ac` manifest, `3a31188` resolver, `ad88d70` assets, `215c675` e2e. Docs commit follows this checkpoint.

## Findings and limits

- The post-execution screenshot at `/tmp/time-capsule-resistance-outpost-desktop.png` and poster at `apps/web/public/history/resistance-outpost/poster.webp` were captured by Chromium/Blender on this host; automated budgets, checksums, rendering, and inspection all pass.
- Visual acceptance of the authored scene is pending human review: poster at `apps/web/public/history/resistance-outpost/poster.webp` and Chromium screenshot at `/tmp/time-capsule-resistance-outpost-desktop.png`. Object view and exporter detail-camera values were authored to measured conventions for this scene; the model runtime cannot inspect images, so pixel-level layout review is deferred to the user.

## Next unfinished tasks, in order

1. Human visual review of the resistance-outpost poster and Chromium screenshot; adjust object view framing or scene layout if needed (recorded as a new commit).
2. Continue the three-rooms checkpoint unfinished items: remaining browser journeys, WebKit on a compatible host, source citations, AO/lighting realism, Pages/D1 end-to-end quota proof, README guidance, final AC evidence mapping and release authorization.

Rollback remains feature-off rebuild and separately authorized deployment. No running development server is intentionally left behind.
