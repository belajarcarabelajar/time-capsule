# Admin Unlimited Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give only the verified Google identity `kurniawaniwan7906@gmail.com` an unlimited generation quota without changing the quota policy for other users.

**Architecture:** The server recognizes the admin from the signed OAuth JWT email and verified-email claim. Quota checks bypass D1 only for that identity; generated stories are persisted best-effort with zero point cost when D1 is available, while ordinary users remain fail-closed. `/api/auth/me` and the user badge expose an explicit unlimited state.

**Tech Stack:** Cloudflare Pages Functions, D1, signed JWT sessions, Bun tests, React JSX.

---

### Task 1: Server-side admin quota policy

**Files:**
- Modify: `functions/api/_ai_utils.js`
- Test: `functions/api/_ai_utils.test.js`

- [x] Write tests proving exact verified admin email bypasses missing/empty quota state, near-match or unverified identities do not bypass, and an admin story does not decrement points.
- [x] Run `rtk bun test functions/api/_ai_utils.test.js` and observe the new tests fail because no admin policy exists.
- [x] Add a normalized exact-email helper requiring `verified_email === true`; return unlimited quota before D1 reads and persist admin stories with `points_spent=0` and a zero-amount admin ledger entry when possible.
- [x] Keep admin persistence best-effort so a missing D1 binding cannot block the admin's provider request; preserve fail-closed 503 behavior for every non-admin.
- [x] Rerun the focused helper test and confirm all cases pass: 10 passed.

### Task 2: Admin status in session API and UI

**Files:**
- Modify: `functions/api/auth/me.js`
- Test: `functions/api/auth/me.test.js`
- Modify: `apps/web/src/components/UserBar.jsx`
- Test: `apps/web/src/components/__tests__/UserBar.test.jsx`

- [x] Add a RED test that a verified admin session reports `unlimitedQuota: true` even when D1 is unavailable, while ordinary sessions retain unavailable balance state.
- [x] Run the focused auth test and observe the expected failure.
- [x] Return the server-derived `unlimitedQuota` flag and render `Quota tanpa batas` without inventing a numeric balance.
- [x] Rerun auth and UserBar tests: 8 and 10 passed.

### Task 3: Endpoint regression and release verification

**Files:**
- Modify: `functions/api/gemini.test.js`
- Modify: `functions/api/ai.test.js`

- [x] Add endpoint tests proving an admin request reaches both providers without D1 and a normal user still receives 503 before provider invocation when quota is unavailable.
- [ ] Run the endpoint tests, targeted lint, and the relevant existing frontend/backend regression tests.
- [ ] Build with the repository production script, commit the reviewed changes, push `main`, and deploy only to the configured `time-capsule` Pages project.
- [ ] Verify deployment status, live static assets, clean Git state, and document that an authenticated admin request is not reproduced without the user's session cookie.
