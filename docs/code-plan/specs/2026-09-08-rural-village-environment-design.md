# Rural-Village Environment Design
Status: Approved v1, 2026-09-08. This design records the sixth authored room and accompanies `docs/code-plan/plans/2026-09-08-rural-village-environment.md`. Approval of the plan approves this spec.

## Problem and evidence
The immersive catalogue has five authored rooms: `archive`, `ww1-field-station`, `ww2-radio-room`, `kingdom-court`, and `market-port`. The only Indonesian-context rooms are `kingdom-court` (elite, political, inland) and `market-port` (commoner, maritime, outdoor). The scenario character contract requires commoner perspectives (pedagang/petani/prajurit); the pedagang view now has `market-port`, but the petani (farmer) view and Indonesia's agrarian inland life have no visual. National-curriculum themes around rice farming, irrigation cooperation, and pre-colonial agrarian kingdoms (Majapahit agrarian base, Mataram-style wet-rice agriculture) resolve to `archive` without an environment key (resolveRoom.test.js keeps `['Majapahit', 'Java', 'archive']`).

## Decision
Add `rural-village`, an open-air agrarian Nusantara village with paddy terraces, a timber granary on posts, and an irrigation channel. It covers contexts such as petani, sawah, padi, panen raya, irigasi, subak, and similar strong agrarian-life signals. It provides a visual for the petani commoner perspective, the first agrarian landscape, and an outdoor interior-free complement to `kingdom-court` and `market-port`.

Rejected alternatives: `war-front` overlaps the existing wartime rooms and duplicates the enclosed-warfare register; `urban-poor` has a niche curriculum share and no distinct Nusantara identity. Both remain separate future room-pack decisions.

## Room contract
- Room id `rural-village`, local media `/history/rural-village/{room.glb,poster.webp,poster-detail.webp}`.
- Camera `{ position: [10, 6.5, 11], target: [0, 1.4, -1], yawLimit: 0.5, pitchLimit: 0.22 }` (open-air, wider than interior rooms).
- Exactly 3 inspection objects, unique ids, Indonesian-first labels, descriptions > 40 chars that mark the scene as illustration:
  - `sawah` (label `Sawah`): flooded paddy field with young rice lines.
  - `lumbung` (label `Lumbung padi`): vernacular timber granary on posts.
  - `irigasi` (label `Saluran irigasi`): water channel with a wooden gate.
- Object inspection views are authored in the plan; measured adjustments during asset authoring update the manifest in the same commit.
- Visual scope label: `Ilustrasi kehidupan agraris Nusantara; bukan rekonstruksi desa tertentu`.

## Resolver contract
- Conservative keyword predicate with strong agrarian signals only:
  `\b(?:petani|sawah|padi|ladang|panen raya|bawon|subak|irigasi|pertanian|agraris|lumbung padi|bajak)\b`
- Rule: after the `market-port` (maritime) branch and before the incompatible fallback, when the predicate matches and no war signal is present, return `{ roomId: "rural-village", reason: "agrarian-life" }`.
- Bare `Majapahit`/`Java` without a farming action word stays `archive` (existing row unchanged). Maritime-only inputs keep market-port precedence. Unknown keys, unsafe input, conflicting eras, and incompatible contexts stay `archive`.
- `environmentKey: "rural-village"` selects the room directly when locally authored.

## Boundaries and compatibility
- Existing `archive`, WWI, WWII, `kingdom-court`, and `market-port` selection must remain unchanged when the key is absent.
- An invalid or unknown key must never construct a URL or override the safe fallback path.
- No dependency, API endpoint, authentication, database, analytics, remote asset, or deployment change is required.
- AI output never selects a file path, URL, shader, or executable setting.

## Asset and UX requirements
- Procedural authoring in Blender 5.2.1 LTS via `scripts/export-history-assets.py`; editable `.blend` in `assets/history/source/`; generated `.glb`, posters, `export-report.json`, and provenance move together.
- Budgets: GLB <= 4 MiB, poster <= 250 KiB, < 100,000 triangles, <= 60 draw primitives; motion pivots `ambient_figure`/`ambient_prop` preserved with children.
- Poster-first fallback, reduced motion, save-data, static preference, failed model load, and keyboard exploration retain current behavior.

## Approval gate
Spec content is approved with the plan it accompanies. Status records this approval.
