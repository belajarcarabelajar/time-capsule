# Auto-tour visual sweep (2026-10-21)

Command (system Chromium 154 through a scratch wrapper config that only adds `executablePath: '/usr/bin/chromium'`, because this machine has no Playwright-bundled browser):

`TOUR_SHOTS=<scratch>/tour-shots bunx playwright test --config <wrapper of playwright.tour.config.js> -g 'visual sweep'` exit 0, 1 passed (5.6 min).

## Settled stops (reduced motion, instant cut)

One sheet per room, lines 1 to 8 left to right and top to bottom: wide, sweep-left, close object 1, detail, close object 2, sweep-right, close object 3, overview.

| Room | Sheet | Finding |
|---|---|---|
| archive | `tour-stops-archive.jpg` | 8 distinct views; no camera inside geometry; no empty background |
| ww1-field-station | `tour-stops-ww1-field-station.jpg` | same |
| ww2-radio-room | `tour-stops-ww2-radio-room.jpg` | same; close-shelf shows the figure's head near the right edge (authored inspection view) |
| kingdom-court | `tour-stops-kingdom-court.jpg` | same; close-courtyard-gate frames a column with the figure's head at the bottom edge (authored inspection view, unchanged by this PR) |
| market-port | `tour-stops-market-port.jpg` | same |
| rural-village | `tour-stops-rural-village.jpg` | same |
| resistance-outpost | `tour-stops-resistance-outpost.jpg` | same |
| ancient-library | `tour-stops-ancient-library.jpg` | same; close-manuscript-shelf shows the figure's head at the bottom edge (authored inspection view) |

Reviewed frame by frame by the parent: 64 of 64 settled frames show the room from the open side.

## Mid-glide frames (motion on)

`render-states.json`: 11 of 64 mid-glide frames rendered in 3D (`mid-02` for every room, `mid-03` for rural-village, resistance-outpost, ancient-library); 53 show the poster because the frame monitor (`createFrameMonitor`, median frame over 40 ms) falls back under SwiftShader within seconds of continuous rendering. `tour-mid-glide.jpg` holds the 11 rendered frames: each is a pose between two stops with no geometry crossing. Glides into close-ups beyond `mid-03` are not covered by rendered frames; this is a limit of software rendering, recorded as follow-up F4, not a pass.
