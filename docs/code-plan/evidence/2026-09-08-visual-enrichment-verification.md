Visual enrichment verification, 2026-09-08

Scope: local implementation of the approved eight-room enrichment plan. No publication, credentials, provider behavior, or learning content changes. The final dated results below supersede intermediate RED runs and environment failures retained for traceability.

Authored additions and visual intent:

| Room | Supporting clusters | Intent |
| --- | --- | --- |
| archive | Perimeter mouldings; cornice dentils; folios and ink pot | Give shelves a layered architectural edge and the reading table a used surface |
| ww1-field-station | Parcel ties; retaining-wall pegs; dispatch envelopes | Distinguish supply storage and communications equipment without authentic markings |
| ww2-radio-room | Framed fabric panels; tuning ticks; armchair stitching | Add domestic scale around the radio and retain blackout-window contrast |
| kingdom-court | Column collars and masonry courses; banner edging; folio stack | Reinforce ceremonial rhythm and textile depth without a named-palace claim |
| market-port | Tapered hull; cargo landing and bound crates; coiled ropes and deck seams | Make vessel silhouette and the cargo inspection target readable |
| rural-village | Granary slats and steps; faceted tree clusters; sluice ripples | Layer timber, vegetation, and water at the existing inspection targets |
| resistance-outpost | Correctly oriented palisade rails; watch-post lashings and ladder; layered foliage | Improve the camp silhouette and construction detail |
| ancient-library | New scroll table and instrument; manuscript scroll storage; cornices, mouldings, and writing props | Complete the missing authored room while preserving an illustrative, non-reconstruction boundary |

Exporter now reads all three camera views from runtime `resolveVisit` through `scripts/history-asset-views.mjs`. Reports store those vectors; asset tests and the verifier detect camera drift. Blender Z-up conversion is `[x, -z, y]`. Runtime and poster vertical field of view is 32 degrees.

Checks already executed:

- Previous checkpoint runtime TDD: 19 pass / 16 fail before implementation; 58 pass / 0 fail afterward.
- Fresh pending-export asset run: 7 pass / 9 fail, identifying absent third-camera reports and ancient-library outputs. This is an intermediate RED result, not release evidence.
- Python AST parsing: all five generator modules parse, exit 0.
- Targeted web ESLint (runtime, changed tests, immersive/enrichment browser files and config): exit 0.
- RoomModel isolation tests: 2 pass / 0 fail.
- App and GameplayScreen regression tests: 16 pass / 0 fail.
- Fallback Chromium: 1 pass / 0 fail. Initial run exposed an unmocked `/api/auth/me` proxy request; the test now uses the shared fixture. Rerun exit 0 with no proxy error. No application-auth change.
- WebKit ancient-library launch attempt: exit 1 before assertions. Exact boundary: `browserType.launch: Host system is missing dependencies to run browsers.` Suggested missing packages: `libicu74`, `libxml2`, `libflite1`. Chromium is the available local target; WebKit is not counted as passed.

Environment observations:

- Blender 5.2.1 LTS, four available CPUs, approximately 6 GiB RAM. Archive used two threads; subsequent exports use four threads sequentially. Available RAM checked during rendering; no memory-pressure abort encountered so far.
- Blender startup reports a missing locale data path and unavailable PipeWire context. Saving sources also reports an unwritable host thumbnail-cache PNG; the `.blend` and poster output paths remain separate. Final artifact checks, not these host notices, determine export validity.
- Browser commands remove conflicting `NO_COLOR` when `FORCE_COLOR` is already set. Tests use system Node ahead of local runtime wrappers, mocked APIs, and one worker.

Archive export reached `HISTORY_EXPORT`, but Blender hung during audio shutdown (`pa_write() failed ... Operation not permitted`). Its source, three posters, and GLB passed the standalone verifier, exit 0: 1,923,144 bytes, 30,688 triangles, 16 primitives. Only the completed export process was terminated after checking its exact command line. A fresh headless exit probe with `ALSOFT_DRIVERS=null`, `SDL_AUDIODRIVER=dummy`, and `-noaudio` exited 0 (`Blender quit`); remaining rooms use that invocation and a writable temporary thumbnail cache. Archive geometry/render work was not repeated.

The original outstanding checks were asset budgets/hashes, browser journeys, screenshots, build/client scan and intended-file review. See the final dated results below for their outcomes. Physical-device performance and historical-source authentication are not claimed.

Findings during verification:

| Finding | Severity / confidence | Disposition |
| --- | --- | --- |
| New browser fixture used an exact quiz name, but accessible button name includes the choice letter | Test blocker / high | Failure snapshot showed `A Membandingkan sumber`; use the existing journey's substring locator, preserving quiz behavior |
| Ancient-library preview showed unsupported right-side moulding on an open wall edge | Visual / high | Restrict mouldings to its solid left wall; re-export the new room and inspect again |
| Resistance palisade crossbars previously extended along depth rather than along the fence | Visual / high | Reoriented along X in the authored builder |
| Market cargo inspection target was away from the foreground cargo group | Visual / medium | Added a cargo side landing and bound crate stack at the existing target, preserving runtime cameras |
| Fallback fixture contacted a nonexistent local auth proxy | Test isolation / high | Shared auth fixture added; clean rerun passed |
| WebKit host dependencies unavailable | Environment / high | Recorded launch failure; no application-pass claim |
| Continued-lesson panel fetched an external aged-paper texture | Asset boundary / high | Browser network assertion reproduced the request; replaced only that panel's decoration with a local CSS pattern |
| Archive request assertion included a separate StartScreen scene | Test isolation / high | StartScreen and GameplayScreen each own an environment; wait for the initial screen before measuring lesson-only model requests |
| Dialog assertion ran before software-renderer startup and typewriter completion | Test timing / high | Wait for renderer readiness before full dialogue assertion; retain full-text assertion and zero retries |
| Rural granary roof formed a valley; intersecting water/sluice surfaces produced black patches; distant crowns and stair treads lacked support | Visual / high | Corrected roof pitch, separated coplanar surfaces, and added trunks/stringers in source |
| Resistance figure obscured the signal-fire target | Visual / high | Shifted the anonymous figure sideways and replaced rectangular forest masses with layered trees |
| Kingdom ceremonial seat had no support below its cushion | Visual / high | Added four legs meeting the existing platform |
| Initial segmented port hull read as disconnected blocks | Visual / medium | Replaced it with a connected tapered hull and assigned local grain UVs |
| Archive instrument inspection aimed at the table rather than the ring pivot | Inspection / high | New manifest regression failed (2 pass / 1 fail), then passed with visit tests (12 pass / 0 fail) after correcting only the instrument inspection pose |
| Unchanged RoomModel/App regression runs emit Multiple instances of Three.js and React act warnings | Test harness / high | Tests pass; recorded as pre-existing harness warnings, not a clean-warning claim or a reason to alter runtime dependencies |
| Legacy explicitly-disabled backgrounds retain two other transparenttextures URLs | Existing legacy path / high | Outside this default immersive enrichment change; no new URL introduced. The continued-lesson path is fixed and checked by the strict network test |

Execution corrections: native sandbox browser startup did not succeed, so browser checks use context-mode's established test environment. The first archive grep was anchored to the bare title and selected no tests because Playwright includes suite/project text; the corrected selector is `archive primary`. Neither launch is counted as a test pass.

The first full enrichment matrix completed with 10 expected / 8 unexpected / 0 flaky results while exports were still consuming CPU and the test's original five-second dialogue wait was loaded. Seven failures were incomplete typewriter text, one was motion-test renderer startup. This run is diagnostic only. Final verification must run after exports finish, using the corrected readiness order and immutable final assets. The MCP call exceeded its 300-second response window; Playwright's JSON report persisted the complete result at `/tmp/time-capsule-enrichment-report.json`.

An intermediate native kingdom-court export session ended with code 143 (SIGTERM), without a Python error or finished report; the source of that session termination was not established. The subsequent export completed: the final source and outputs pass hashes and budgets (1,461,316 GLB bytes, 29,028 triangles, 13 primitives). Generated Python bytecode was moved out of the worktree to `/tmp/time-capsule-generator-pycache-0908-final` (recoverable), preserving the four authored helper modules.

Final verification continuation, 2026-09-09:

- Context-mode and memory graph tools are unavailable in this continuation. Used native commands with bounded, programmatically filtered output. Local Vite needs approved sandbox escalation because sandbox bind fails with EPERM; all browser APIs remain mocked. No production access or publication.
- Frozen-asset enrichment matrix: 17 passed, 1 failed, zero retries. All 16 room composition cases passed. Desktop steady-motion observation failed at the five-second `arrival` to `reading` assertion; mobile observation passed. The steady-motion test now uses the existing skip-arrival control before observation; arrival behavior remains independently covered by session journeys. The failing run is retained at `/tmp/time-capsule-enrichment-final.json`, not represented as an entirely green matrix.
- Screenshot review identified a 0.180-unit gap between rural granary posts and floor. Added a real Blender structure regression (`scripts/test-history-room-structure.py`): RED exit 1 with `support gap 0.180`; corrected only post height/center; GREEN exit 0 with all four posts meeting the floor. Re-exported rural source, GLB, all three posters and report together, exit 0. Final rural GLB: 619,196 bytes, 10,180 triangles, 15 primitives. Other room outputs unchanged.
- All eight rooms pass `bun scripts/verify-history-assets.mjs` again after that correction, exit 0.
- Earlier final focused unit pipeline: 134 immersive + 2 isolated RoomModel + 16 App/Gameplay tests, all 152 passed. Targeted lint passed. Dedicated website build exited 0 in 8.21 seconds; client scan checked 53 files, exit 0. The rural artifact correction is followed by targeted asset tests and a final rebuild.
- Screenshots show missing glyph boxes for existing emoji icons on this WSL host. Severity low, confidence high for the visual symptom; host-font attribution is likely, not proven on a physical device. Textual inspection labels/descriptions remain readable and keyboard names remain available. No unrelated icon/font redesign in this task.
- The preserved kingdom contextual camera is a tight gate-column crop with substantial negative space, especially on mobile. Severity low, confidence medium as a composition-polish finding; it is a valid rendered authored anchor, not a missing model. Preserved the existing inspection view rather than expanding this change into a camera redesign.
- A structure probe first inherited Python environment flags and failed loading `math`; the documented headless invocation with those flags unset produced the actual RED/GREEN evidence. A root-level lint invocation stopped at Bun EROFS before executing ESLint; reran from the web package using its installed tool. Neither environment error is counted as a product test failure or pass.

Final generated asset metrics (all source, model and poster hashes verified):

| Room | GLB bytes | Triangles | Primitives |
| --- | ---: | ---: | ---: |
| archive | 1,923,144 | 30,688 | 16 |
| ww1-field-station | 1,637,548 | 25,848 | 14 |
| ww2-radio-room | 893,312 | 14,184 | 18 |
| kingdom-court | 1,461,316 | 29,028 | 13 |
| market-port | 755,396 | 11,364 | 16 |
| rural-village | 619,196 | 10,180 | 15 |
| resistance-outpost | 1,096,540 | 17,636 | 15 |
| ancient-library | 1,399,428 | 23,000 | 16 |

All GLBs remain below 4 MiB, all 24 posters below 250 KiB, all scenes below 100,000 triangles and 60 primitives. No external GLB resources or skinned meshes.

Visual evidence: [48 desktop/mobile composition links](visual-enrichment-2026-09-09/index.md), plus 48 matching inspection images and two motion captures, 98 PNG files total. Main agent inspected all 48 base compositions and representative inspection closeups, including the corrected archive instrument and rural supports. Automated checks cover all inspection labels, descriptions, viewport bounds and focus recovery. No independent reviewer was available; this is a self-review, not independent approval.

The rural context closeup, like the kingdom gate-column crop, has limited environmental context on mobile. Severity low, confidence medium as a polish finding. Existing close inspection cameras and mobile overlays are preserved; no missing geometry or unreadable inspection text was detected by the corresponding assertions.

Targeted browser follow-up after the last changes: four passed, zero failed, zero retries (rural desktop/mobile and port steady motion desktop/mobile), `/tmp/time-capsule-enrichment-targeted.json`. Combine the 14 unaffected composition passes from the earlier matrix with these four final passes: all 18 unique enrichment scenarios are verified, not an invented single 18/18 rerun. Port observation recorded 10 ready-state samples per viewport over 8.461 seconds desktop and 7.420 seconds mobile, with no fallback observed. Software renderer timings do not establish FPS or device performance.

Existing Chromium immersive suite: 11 passed, zero failed, `/tmp/time-capsule-immersive-final.json`. Fallback: one passed, zero failed, `/tmp/time-capsule-fallback-final.json`. The first session-journey regression run passed three and failed one: its skip test waited for full typewriter dialogue before seeking the short-lived arrival button. Moved that test's observation before dialogue completion and made skip plus focus assertions unconditional. The focused rerun passed 1/1, and the final four-test Chromium journey suite passed 4/4. No production lifecycle code changed.

Final rural asset tests: 16 passed, zero failed, 241 assertions. Targeted lint of both browser test changes passed. Generated helper bytecode from the final export was moved recoverably to `/tmp/time-capsule-generator-pycache-0909-support`; no temporary bytecode remains in the worktree.

Final post-correction build and policy checks: dedicated website build exited 0 in 5.67 seconds; client asset verification exited 0 across 53 files; all eight asset verification exited 0; `git diff --check` exited 0. Final targeted ESLint for the enrichment and journey browser files exited 0. The final worktree review found only approved source, generated room assets, tests, documentation, and screenshot evidence; no secrets, external runtime assets, or temporary bytecode.
