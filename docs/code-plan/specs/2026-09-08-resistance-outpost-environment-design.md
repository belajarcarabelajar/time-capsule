# Resistance-Outpost Environment Design

Status: Approved v1, 2026-09-08. This design records the seventh authored room and accompanies `docs/code-plan/plans/2026-09-08-resistance-outpost-environment.md`. Approval of the plan approves this spec.

## Problem and evidence

The immersive catalogue has six authored rooms: `archive`, `ww1-field-station`, `ww2-radio-room`, `kingdom-court`, `market-port`, and `rural-village`. The Indonesian-context rooms are `kingdom-court` (elite, political, inland), `market-port` (commoner, maritime, outdoor), and `rural-village` (commoner, agrarian, outdoor). The scenario character contract requires commoner perspectives (pedagang/petani/prajurit); the pedagang view has `market-port`, the petani view has `rural-village`, but the prajurit (soldier/fighter) view has no home. National-curriculum resistance and independence-war themes around Diponegoro and the Java War, the Padri War, Balinese puputan, the 1945 proclamation, and the Battle of Surabaya resolve to `archive` without an environment key, and the open `war-front` room-pack bullet from the approved ai-routed design remains unresolved.

## Decision

Add `resistance-outpost`, an open-air colonial-era Nusantara resistance outpost with a bamboo-timber palisade, a raised bamboo watch post, and a low signal fire. It covers strong resistance and independence signals such as Diponegoro, the Java War, the Padri War, puputan, the 1945 proclamation, and the Battle of Surabaya. It provides a visual for the prajurit commoner perspective and resolves the open `war-front` bullet as a conservative, scoped room: a Nusantara colonial-resistance clearing rather than a generic enclosed-warfare front. A Japanese-occupation negative guard keeps PETA, Singaparna, and other Pacific/Japan-theater or Japanese-occupation resistance contexts on the existing fallback path.

Rejected alternatives: a generic `war-front` duplicates the enclosed-warfare register and the existing wartime rooms; covering Japanese-occupation-era Indonesian resistance (PETA, Singaparna) would import a second war theater into this room. Both stay out of scope.

## Room contract

- Room id `resistance-outpost`, local media `/history/resistance-outpost/{room.glb,poster.webp,poster-detail.webp}`.
- Camera `{ position: [10, 6.5, 11], target: [0, 1.4, -1], yawLimit: 0.5, pitchLimit: 0.22 }` (open-air, wider than interior rooms). Measured adjustments during asset authoring update the manifest in the same commit.
- Exactly 3 inspection objects, unique ids, Indonesian-first labels, descriptions > 40 chars that mark the scene as illustration:
  - `palisade` (label `Pagar bambu`): bamboo-timber palisade line guarding the clearing.
  - `watch-post` (label `Menara jaga`): raised bamboo lookout platform.
  - `signal-fire` (label `Api isyarat`): low fire used as a distance signal.
- Object inspection views are authored in the plan; measured adjustments during asset authoring update the manifest in the same commit.
- Visual scope label: `Ilustrasi perkemahan perlawanan rakyat Nusantara; bukan rekonstruksi medan atau benteng bersejarah tertentu`.

## Resolver contract

- Conservative keyword predicate with strong resistance/independence signals only, plus a Pacific/Japan negative guard:
  ```
  resistanceOutpost = \b(?:diponegoro|perang jawa|perang padri|puputan|perlawanan rakyat|proklamasi|pertempuran surabaya)\b
  pacificWar = \b(?:japan|jepang|japanese|pacific|pasifik|tokyo|japanese occupation|pendudukan jepang)\b
  ```
- Rule: after the `market-port` (maritime) branch and the `rural-village` (agrarian) branch, and before the incompatible-context fallback, when the predicate matches and no war signal and no Pacific/Japan signal is present, return `{ roomId: "resistance-outpost", reason: "colonial-resistance" }`.
- Bare `Majapahit`/`Java`, generic colonial text, war signals, Japan/Pacific signals, conflicting eras, and incompatible contexts stay `archive` per the existing rules. Maritime and agrarian contexts keep their precedence.
- `environmentKey: "resistance-outpost"` selects the room directly when locally authored.

## Boundaries and compatibility

- Existing `archive`, WWI, WWII, `kingdom-court`, `market-port`, and `rural-village` selection must remain unchanged when the key is absent.
- An invalid or unknown key must never construct a URL or override the safe fallback path.
- No dependency, API endpoint, authentication, database, analytics, remote asset, or deployment change is required.
- AI output never selects a file path, URL, shader, or executable setting.

## Asset and UX requirements

- Procedural authoring in Blender 5.2.1 LTS via `scripts/export-history-assets.py`; editable `.blend` in `assets/history/source/`; generated `.glb`, posters, `export-report.json`, and provenance move together.
- Budgets: GLB <= 4 MiB, poster <= 250 KiB, < 100,000 triangles, <= 60 draw primitives; motion pivots `ambient_figure`/`ambient_prop` preserved with children. The sentry is an anonymous colonial resistance figure with no rank or insignia, carrying a plain bamboo staff.
- Poster-first fallback, reduced motion, save-data, static preference, failed model load, and keyboard exploration retain current behavior.

## Approval gate

Spec content is approved with the plan it accompanies. Status records this approval.
