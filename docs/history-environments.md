# Historical environments

Time Capsule presents a contextual authored environment behind the existing dialogue, quiz, narrator, and chapter controls. The environment is a visual learning aid. It is not an exact reconstruction of every place or event named by a user.

## Runtime behavior

The normal web command enables the contextual path:

```bash
bun --filter web run dev
```

The old gradient and particle background remains an explicit rollback path:

```bash
VITE_IMMERSIVE_ENABLED=false bun --filter web run dev
```

The build gate is evaluated at build time. Only the exact string `false` disables the contextual renderer. A missing value or `true` enables it.

The renderer chooses a room from topic, validated `gameData.meta.location`, and an optional `gameData.meta.environmentKey` supplied by the scenario. The finite allowed values are `archive`, `ww1-field-station`, `ww2-radio-room`, `kingdom-court`, `market-port`, `rural-village`, and `resistance-outpost`. The local `roomManifest` is the final authority: a valid key selects only its authored local room; missing or unknown keys continue to the existing topic and location rules. Unsafe topic or location text always selects `archive`, even if a valid key is present. AI output is never used as a URL, file path, shader, HTML, or executable configuration.

| Input context | Room | Visual scope |
|---|---|---|
| World War I with a supported Western Front label such as France, Flanders, Verdun, Somme, Ypres, or Front occidental | `ww1-field-station` | Illustrative field communications shelter with packed earth, duckboards, sandbags, field equipment, and a restrained ruined masonry cue |
| World War II with a supported British home-front label such as London, Britain, England, United Kingdom, or British home front | `ww2-radio-room` | Illustrative civilian radio room with blackout curtains, period receiver, furniture, and household shelves |
| A safe scenario with `environmentKey: "kingdom-court"` | `kingdom-court` | Illustrative, culturally non-specific royal court with a ceremonial seat, manuscript table, and courtyard gate; not a reconstruction of a named palace or kingdom |
| A maritime-trade context (such as Sriwijaya, jalur rempah, Sunda Kelapa, Batavia, or pelabuhan) with no war signal, or a safe scenario with `environmentKey: "market-port"` | `market-port` | Illustrative open-air Nusantara trading port with a wooden pier, canvas market stalls, a moored ship, and stacked cargo; not a reconstruction of a named port, ship, or cargo |
| An agrarian-life context (such as petani, sawah, padi, panen raya, irigasi, or subak) with no war signal, or a safe scenario with `environmentKey: "rural-village"` | `rural-village` | Illustrative open-air agrarian Nusantara village with paddy terraces, a timber granary on posts, and an irrigation channel; not a reconstruction of a named village, field system, or community |
| A colonial-era resistance context (such as Diponegoro, Perang Jawa, Perang Padri, puputan, or Proklamasi Kemerdekaan Indonesia) with no war signal and no Japan/Pacific signal, or a safe scenario with `environmentKey: "resistance-outpost"` | `resistance-outpost` | Illustrative open-air colonial-era Nusantara resistance outpost with a bamboo-timber palisade, a raised bamboo watch post, a lean-to shelter, and a low signal fire; not a reconstruction of a named field, fortress, or campaign |
| Missing, unsupported, conflicting, malformed, oversized, or unsafe setting | `archive` | Fictional time archive used as a safe non-specific context |

3D is the default background on every viewport. Save-data mode, an explicit static preference, slow lazy import, missing model, lost graphics context, and poor renderer pacing use the selected room's poster and keep the lesson controls available. The user can switch between 3D and the poster where the controls allow it.

## Authored assets

Each room has an editable Blender source, an optimized same-origin GLB, a poster render, an export report, and provenance references:

```text
assets/history/source/<room>.blend
apps/web/public/history/<room>/room.glb
apps/web/public/history/<room>/poster.webp
apps/web/public/history/<room>/export-report.json
```

In this WSL environment, export with Blender's system-Python environment so the user PATH's UV Python shim cannot affect Blender:

```bash
env -u PYTHONUNBUFFERED -u PYTHONUTF8 -u PYTHONDONTWRITEBYTECODE PATH=/usr/bin:/bin \
  blender --background --python scripts/export-history-assets.py -- --root . --room kingdom-court
```

Author and verify a new room the same way, replacing the `--room` value. The `market-port`, `rural-village`, and `resistance-outpost` rooms were authored and exported with the same invocation on this host; their export reports record the exact Blender version used.

Regenerate the source, GLB, poster, report, and checksum together. Do not edit generated binaries independently. Keep the GLB at or below 4 MiB, the poster at or below 250 KiB, the scene below 100,000 triangles and 60 draw primitives, and preserve the three reviewed inspection objects.

Verify all rooms from the repository root:

```bash
rtk bun scripts/verify-history-assets.mjs
```

Verify only the new room while authoring:

```bash
rtk bun scripts/verify-history-assets.mjs kingdom-court
```

## Verification

Focused unit and integration tests run without a browser or provider request:

```bash
cd apps/web
rtk bun test src/immersive/__tests__/featureFlag.test.js
rtk bun test src/immersive/__tests__/resolveRoom.test.js src/immersive/__tests__/roomManifest.test.js
rtk bun test src/immersive/__tests__/roomAssets.test.js src/immersive/__tests__/HistoricalEnvironment.test.jsx
rtk bun test src/components/__tests__/GameplayScreen.test.jsx src/__tests__/App.test.jsx
```

Browser checks use mocked auth and scenario endpoints and block real provider domains:

```bash
PATH=/usr/bin:/bin:$PATH rtk bun run test:immersive -- --project=chromium
PATH=/usr/bin:/bin:$PATH rtk bun run test:immersive:fallback -- --project=chromium
```

The browser commands require native `/usr/bin/node` before the local Bun wrapper so esbuild's service can start. WebKit additionally requires its host libraries; Chromium is the verified local browser target. A missing browser or host library is an environment verification blocker, not evidence that the application assertions passed.

No production deployment, credential change, or external asset publication is part of these local checks.
