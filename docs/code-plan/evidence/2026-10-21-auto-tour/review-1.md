# Independent review 1 (2026-10-21)

Reviewer: independent read-only subagent (`staid`), template `vivera/templates/code-review-template.md`, diff `origin/main...HEAD` at `016928e`.

Verdict: **correct** (no P0 or P1), confidence 0.75 (no browser run by the reviewer).

| Severity | Finding | Resolution |
|---|---|---|
| P2 | `auto-tour.spec.js` test "motion on glides to the next stop" asserts only `data-tour-stop`, identical under a cut | renamed to say what it checks; glide wiring stays covered by `chooseCameraTransition` unit tests and code review only |
| P2 | AC9 and AC11 only partly proven for motion-on glides (11 of 64 mid-glide frames rendered; drift extremes never rendered) | recorded as partial in the plan; follow-up F4 |
| P3 | CSP test "nothing broader" allowed any extra host | exact `toEqual` on `img-src` |
| P3 | no test that the stop follows `storyStep` while blocked; frame-difference test relied on the config's reduced motion | blocked test added; `emulateMedia({ reducedMotion: 'reduce' })` inside the tests |
| pre-existing | arrival can stay in `data-journey="arrival"` after the tab is hidden mid-arrival (code reading, confidence 0.5) | follow-up F8 |
| pre-existing | keyboard look offsets returning to zero cut instead of the 0.45 s exit glide | follow-up F9 |

Focus questions answered with file:line evidence: camera state machine (no stuck, repeating, or unintended jump found), held-stop logic (six combinations traced), toggle never reaches `handleNext` by click or Enter, 44 px target by CSS selector, `aria-label` idiom matches the mode button, CSP changes only `img-src`, the two `transparenttextures.com` backgrounds render only with `VITE_IMMERSIVE_ENABLED=false`.
