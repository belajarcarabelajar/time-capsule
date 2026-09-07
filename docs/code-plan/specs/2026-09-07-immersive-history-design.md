**Time Capsule: immersive history design**

Status: Approved for implementation v2, 2026-09-07. User approved the planning package. Repository: `/home/belajarcarabelajar/time-capsule`, revision `49741be`, branch `main`.

**Intent**

Make entering a historical topic feel like arriving somewhere, while retaining the working AI conversation, narrator, quizzes, chapter continuation, authentication, points policy, and return-home flow. Author reusable spaces during implementation, then ship them as static assets. Runtime AI continues producing the existing text and scenario structure. No runtime world generation or additional AI calls for visuals.

The creative direction is an intimate historical observation room: believable scale, worn materials, daylight, subtle ambient movement, and carefully composed views around readable dialogue. Realism comes from asset quality and lighting, not a dense particle filter over the current screen. Scenes are illustrative reconstructions, not claims of exact historical reconstruction.

**Options considered**

| Approach | Benefit | Cost / limitation | Decision |
| --- | --- | --- | --- |
| Layered images with parallax | Small download, strong mobile fallback | Limited spatial exploration; insufficient as the main requested 3D experience | Use room renders as fallback only |
| Authored Blender rooms rendered with Three.js through React Three Fiber | Real geometry, reusable assets, bounded interactions, fits React | Asset authoring and GPU lifecycle require explicit work | Recommended |
| Runtime AI-generated worlds or a free-roaming game | Broad scene variety | New latency, cost, control scheme, uncertain history, and changed learning flow | Excluded |

**Launch collection**

| Room ID | Composition and visual character | Ambient motion | Optional inspection |
| --- | --- | --- | --- |
| `archive` | A circular archive with brass time instrument, timber shelves, a central map desk, and warm grazing daylight; clearly fictional time-travel framing | Slow instrument mechanism and sparse dust in the light | Inspect the instrument, map desk, and archive cabinet |
| `ww1-field-station` | A sheltered Western Front communications station: timber supports, earth walls, canvas doorway, field telephone, dispatch desk; wet surfaces outside and muted daylight | Canvas movement and gentle rain visible beyond the doorway; no flashing bombardment | Inspect telephone, dispatch desk, and supply shelf |
| `ww2-radio-room` | A British civilian radio room with blackout curtains, a period receiver, timber furniture, and practical lamps; atmosphere emphasizes civilian experience | Subtle radio dial illumination and light moving through a curtain gap | Inspect receiver, blackout curtain, and household shelf |

Each room ships with an editable `.blend`, optimized `.glb`, poster render, asset manifest, provenance, and three reviewed object descriptions. No placeholder models, grey-box-only delivery, invented historical labels, or AI-generated pseudo-writing on maps. Blank or non-legible decorative papers are preferable to false evidence. Existing AI character portraits/icons remain; realistic animated NPCs are outside this release.

Room scope must be geographically honest. WWI / Perang Dunia I aliases can select the Western Front example only when the input does not explicitly request another theatre. WWII / Perang Dunia II aliases can select the British civilian example only when the input does not explicitly request another region. Clearly label these as representative settings, independent of the story's actual location. Specific incompatible locations, mixed wars, unsupported eras, and uncertain classification use the fictional archive. Japan/Pacific/Eastern Front stories must not silently become London scenes. This is intentionally limited coverage with a polished fallback.

**Experience and preserved flow**

1. The existing topic form and account controls remain in place against the archive. The form works before any 3D download completes.
2. Submitting a topic uses the same authentication and generation paths. The existing loading UI stays readable over a short portal transition, without a new wait gate or minimum animation delay.
3. The selected room appears behind existing dialogue, narrator, quiz, and chapter controls. Camera framing leaves the bottom dialogue area and centered quiz area clear.
4. In normal reading mode, clicking the non-control background and pressing Enter preserve existing advancement. Pointer movement may create a very small, bounded view offset. No scroll capture, pointer lock, auto-walking, or compulsory device-orientation access.
5. An optional `Lihat sekitar` control enables local inspection. Drag/touch and arrow buttons look around within authored bounds; three accessible DOM buttons select inspectable objects. Object inspection reveals a short reviewed description without an AI request, quiz, score, unlock, or chapter mutation.
6. Exploration consumes its own pointer and keyboard events. Escape or `Kembali ke cerita` restores the reading camera and focus. Opening a quiz, narrator panel, loading panel, auth modal, or chapter prompt closes inspection. There is no global story-state pause flag added to the engine.
7. Chapter changes use current topic and validated location metadata to choose the next view. Mood may adjust a bounded light tint, not the historical setting. A character's mood must not trigger explosions or erase the place being studied.
8. Return home keeps its existing timing and resets. Render resources and audio stop when their owner unmounts.

**Presentation standards**

- Use self-hosted Source Serif 4 for headings and Source Sans 3 for controls/body text, with license files and system fallbacks. Preserve Indonesian copy and text expansion. Keep contrast independent of the room lighting.
- Use parchment, aged timber, oxidized brass, slate, and muted greens as material-derived colors. Avoid decorative dashboards or replacing every existing component.
- Audio is an optional, explicitly enabled ambient layer. It defaults off, uses local licensed recordings, stops when hidden, and does not replace existing `SoundEngine` effects. No surprise combat sounds.
- Reduced-motion preference disables travel movement, parallax, camera easing, animated lights, and ambient scene motion. A visible animation pause control supports users without an OS preference. Static mode retains object information as accessible DOM content.
- WebGL failure, an asset timeout, a failed chunk, or low device capacity produces the matching poster and fully usable original learning UI. A failed poster uses the existing safe gradient. Offline visuals do not imply offline AI generation.
- WCAG 2.2 AA is the target: keyboard equivalents, visible focus, no keyboard trap, text contrast at least 4.5:1, non-text/focus contrast at least 3:1, 44px touch targets, reflow at 320 CSS pixels, and understandable status/error announcements.

**Architecture and data boundary**

Keep the 3D implementation inside `apps/web/src/immersive/`. Do not turn the shared UI package into a renderer dependency or introduce a new workspace. The existing `DynamicBackground` remains available for fallback. `App` passes the already-held topic to `GameplayScreen`; a pure resolver reads topic and `gameData.meta.location`, producing an allowlisted room ID. AI strings never become paths, shaders, HTML, or executable configuration.

React stays at 18. Use Fiber 8 with a verified compatible pinned Three.js release, avoiding a React upgrade. The official [Fiber compatibility guide](https://r3f.docs.pmnd.rs/getting-started/introduction) explicitly pairs Fiber 8 with React 18. Blender is the offline authoring tool; Three.js is the runtime renderer. Material/export choices must be checked against the [Blender 4.5 glTF manual](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html).

**Acceptance and review gates**

- Approve the design and plan before production implementation. The user requested a complete draft now, so intermediate design approvals were consolidated into this reviewable package.
- Approve one finished archive room on desktop and mobile before multiplying the authoring work across the two historical rooms.
- Use the main plan's measurable performance, accessibility, behavioral, and asset checks before declaring completion. Generated room assets are deliverables of implementation, not artifacts claimed to exist today.
- Investigate and repair the points system under the separate plan. Do not bundle server accounting changes into visual commits or alter the cost/reset/preload policy as a design side effect.

**References and continuation**

- Main execution plan: `../plans/2026-09-07-immersive-history.md`.
- Separate accounting plan: `../plans/2026-09-07-points-integrity.md`.
- Session planning authority: `/home/belajarcarabelajar/.config/ai/Super Ultra Code Plan Implementation.md`. Re-read relevant gates at execution start, after the first-room review, before release, and after scope changes. This is a session reference, not a modification of the global guide or persistent memory.
