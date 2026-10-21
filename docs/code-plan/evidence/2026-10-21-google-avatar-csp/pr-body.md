## 1. Delivery Metadata

| Field | Value |
|---|---|
| Session slot | `google-avatar-csp` |
| Plan | `docs/code-plan/plans/2026-10-21-google-avatar-csp.md` |
| Base branch | `main` (`bf13ada`) |
| Head branch | `2026-10-21-google-avatar-csp/google-avatar-csp` |
| Type of change | bug fix |
| Reviewer | documented self-review (section 5) |

## 2. What This Changes

The user bar showed clipped alt text ("Iw") instead of the Google profile picture. The served CSP is `img-src 'self' data: blob:` (live header read 2026-10-21, in place since `3e79c85`), and Google serves profile pictures from `*.googleusercontent.com`, so the browser blocked them. The CSP now allows images from `https://*.googleusercontent.com` (images only; no bare `https:`). `UserBar` renders a picture only for that host, loads it with `referrerPolicy="no-referrer"`, and shows the initial circle when the picture fails to load.

**Non-goals:** proxying avatars through Pages Functions; any other CSP directive.

## 3. Acceptance Criteria

| ID | Criterion | Check | Evidence |
|---|---|---|---|
| AC1 | `img-src` contains `https://*.googleusercontent.com` and no bare `https:` | `bun run test:script` | exit 0, 13 pass (RED before: the CSP test failed) |
| AC2 | Picture only for an `https` `googleusercontent.com` URL, with `no-referrer`; other URLs show the initial | `cd apps/web && bun test src/components/__tests__/UserBar.test.jsx` | exit 0, 13 pass (RED before: 3 fail) |
| AC3 | A picture that fails to load is replaced by the initial | same | exit 0 |

## 4. Local Verification Evidence

GitHub Actions is disabled by the owner; every gate ran locally.

| Gate | Command | Exit | Result |
|---|---|---|---|
| Component tests | `cd apps/web && bun test src/components/__tests__/UserBar.test.jsx src/__tests__/App.test.jsx` | 0 | 20 pass, 0 fail |
| Script tests | `bun run test:script` | 0 | 13 pass, 0 fail |
| Lint | `bun run --cwd apps/web lint` | 0 | `$ eslint .`, 0 warnings |
| Build | `bun run build` | 0 | 0 warnings; `apps/web/dist/_headers` carries the new `img-src` |
| Client assets | `bun run test:client-assets` | 0 | passed |

## 5. Independent Review

- [x] Documented self-review: `UserBar` is the only consumer of `user.picture`; the host check uses `URL.hostname` (a look-alike such as `googleusercontent.com.evil.example` is rejected and tested); the CSP change is limited to `img-src`.
- [x] Parent diff audit: `git diff origin/main` lists `_headers`, `UserBar.jsx`, its test, `build-website.test.js`, and the plan.

**Reviewer verdict:** `correct`. It would change if the served CSP after deploy differed from `apps/web/public/_headers`.

## 6. Risk, Rollout, Rollback

| Concern | Answer |
|---|---|
| Blast radius | Header avatar; image loading rule of every page. |
| Door | Two-way: revert the merge and redeploy Pages. |
| Rollout | Merge, then deploy Pages at its own approval; check the served `content-security-policy` header. |
| Health signal | The profile picture shows in the user bar. |
| Rollback | `git revert -m 1 <merge commit>` and `bash scripts/deploy-website.sh`. |
| Compatibility | Non-Google picture URLs now show the initial instead of a broken image. |
