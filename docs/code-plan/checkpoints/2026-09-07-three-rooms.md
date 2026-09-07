**Continuation checkpoint — 2026-09-07**

Status: implementation in progress; three rooms delivered, focused checks passed, release acceptance incomplete. User's Continue authorized proceeding with the archive visual direction. Planning authority remains `~/.config/ai/Super Ultra Code Plan Implementation.md`; its TDD and fresh-verification gates were recalled. No commit, push, deployment, production request, or production database mutation performed.

**Completed; do not repeat**

- Warm-up and approved design/plans are preserved. Base remains `main` at `49741be`; source and new assets are uncommitted together.
- Lazy Three.js/React Three Fiber layer, conservative room resolver, poster-first rendering, reduced motion, optional static mode, bounded camera controls, nine DOM object inspections, stale-load disposal, context/performance fallback, and isolated input events are implemented.
- Archive, WWI communications shelter, and WWII civilian radio room each include editable `.blend`, textured `.glb`, rendered WebP poster, export report, and provenance. Historical room authoring is now implemented in `scripts/export-history-assets.py`; no runtime AI assets or added generation calls.
- Authored rooms are illustrative dioramas, not photorealistic or exact historical reconstructions. Original material textures contain no authentic documents or markings. Runtime lighting lacks baked ambient occlusion; Blender posters include rendered lighting.
- Source Serif 4 and Source Sans 3 are locally bundled. Font license notices are in `apps/web/public/history/licenses/`.
- Existing start, quiz, dialogue, narrator, continuation, and auth contracts remain covered by their focused regressions. Feature gate is off by default; use `rtk bun run dev:immersive` inside `apps/web` for the preview.
- Points use guarded D1 batch accounting, real internal user IDs, atomic story/ledger/debit consistency, shared conditional UTC reset, fail-closed unavailable quota, and terminal 401/403/503 handling. See the separate accounting decision for policy and limits.
- Balance refresh handles response ordering and logout, shows unavailable state honestly, and refreshes after foreground/preload success or failure. The failure-refresh test was observed failing with zero refreshes before moving refresh into `finally`; it now passes. Cached chapters do not cause a duplicate generation.
- Historical asset tests were observed failing for missing WWI/WWII source artifacts before authoring. All three artifact cases now pass.
- Visual review found the historical scope label behind the dialogue gradient. Raising only its stacking order fixed it; final browser screenshots were regenerated.

**Fresh verification**

| Check | Result |
| --- | --- |
| `rtk bun scripts/verify-history-assets.mjs` | 3 rooms pass model/source/provenance/hash and size/triangle/draw budgets |
| Archive GLB | 1,682,088 bytes; 26,572 triangles; 11 draw primitives |
| WWI GLB | 1,498,972 bytes; 23,928 triangles; 8 draw primitives |
| WWII GLB | 797,144 bytes; 12,816 triangles; 14 draw primitives |
| Room assets/manifest/resolver/render policy tests | 23 pass |
| HistoricalEnvironment / RoomModel / ambient audio tests, separate processes | 8 / 2 / 2 pass |
| PointsRefresh / useGameState / UserBar tests, separate processes | 3 / 7 / 9 pass |
| `_ai_utils`, auth/me, Gemini, AI endpoint, accounting status tests | 33 pass, including actual local Miniflare D1 concurrency/reset/rollback |
| Existing AuthContext / StartScreen / GameplayScreen / App tests, separate processes | 8 / 3 / 6 / 7 pass |
| Build helper and existing Gemini client tests | 16 pass |
| Targeted ESLint, 18 changed/new application JS/JSX files | Exit 0 |
| New code file size | Every new code file below 500 lines |
| Chromium `test:immersive --project chromium` | Final run: 5 pass in 31.3s |
| Feature-on and feature-off build-only script | Both exit 0; lazy renderer chunk 869.51 kB / 236.91 kB gzip |

Total focused unit/integration assertions: 127 passing tests across the named invocations. No full-workspace suite was run. Expected error-injection logs appeared in failure-path tests.

Chromium evidence covers real GLB rendering for all three rooms with motion paused, desktop 1440×960, mobile 390×844 static exploration, failed model request, Escape focus restoration, and inspection producing zero extra Gemini/fallback calls. Gameplay requests remain two (foreground plus existing preload). These tests use fixture APIs and do not prove live server accounting. Screenshots are saved in `../evidence/`.

**Findings and limits**

| Finding | Severity / confidence | Disposition |
| --- | --- | --- |
| WebKit cannot launch: missing GTK4, ICU74, libxml2 and flite dependencies on this WSL host | Verification blocker / high | All five WebKit cases failed at browser launch, before application code; run on a supported host or provision compatible libraries |
| Lazy renderer exceeds Vite's 500 kB warning threshold | Low / high | Build succeeds; retain warning and measure actual loading rather than suppress it |
| Software Chromium animated rendering previously triggered protective fallback | Performance acceptance open / high | Paused real-3D checks pass; no physical GPU/mobile frame-budget claim |
| Historical source citations remain empty | Content acceptance open / high | Museum URLs attempted earlier returned 404; do not present those as references |
| Models are clean illustrative dioramas, with limited surface wear and no runtime baked AO | Visual acceptance open / high | Refine lighting/material richness before claiming the requested realism complete |
| Host screenshots show missing emoji glyphs in existing character UI | Low / high observation; host attribution medium | Verify on target platforms; no unrelated character rendering change made |
| No ambient sound assets delivered | Optional media incomplete / high | Audio ownership is tested, controls remain hidden without a room audio URL |
| Local D1 helper proof and UI fixture proof are separate | Integration acceptance open / high | Do not claim original production symptom fully verified end to end |
| Initial native Chromium attempt stopped in sandboxed esbuild | Environment issue / high | Authorized local subprocess execution succeeded; all five final checks pass |
| Planned `EnvironmentControls.test.jsx` file does not exist | Documentation/test naming mismatch / high | One targeted invocation found no tests; controls are currently tested in HistoricalEnvironment and browser cases; add missing coverage only for uncovered behavior |

**Next unfinished tasks, in order**

1. Complete remaining T6 browser cases: 320/768 widths, 200% zoom, full quiz/narrator/continue/home journeys per room, changing reduced-motion preference, context loss, no WebGL, missing poster, repeated room transitions, and long-running renderer performance. Use existing fixtures and test files; do not rebuild delivered assets unless changes warrant it.
2. Run WebKit on a compatible host and record physical mobile/GPU measurements. Keep these gates open until measured.
3. Verify primary historical sources, populate provenance references, and refine visual realism/lighting. Assess optional ambient audio with clear original/licensed provenance.
4. Finish local Pages/D1 end-to-end quota proof for primary, fallback, failed accounting and preload, including UI balance, persisted rows and provider counts. Production binding attribution remains separate from local code correctness.
5. Complete `docs/history-environments.md`, README usage guidance, dependency/security and CSP review, and final AC1–AC12 evidence mapping. Review the concrete preview before release authorization.

Rollback remains feature-off rebuild and separately authorized deployment. The last local build used `VITE_IMMERSIVE_ENABLED=false`; the preview script explicitly enables the feature. No running development server is intentionally left behind.
