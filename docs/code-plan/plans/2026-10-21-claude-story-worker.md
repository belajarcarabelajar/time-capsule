# Plan: Claude story Worker with Groq fallback

- **Status:** Draft (full plan body follows the `Spec` gate)
- **Spec:** `docs/code-plan/specs/2026-10-21-claude-story-worker-design.md`
- **Session:** `claude-story-worker`, branch `2026-10-21-claude-story-worker/claude-story-worker`

## Session checklist

- [x] Explore and lock intent. Evidence: `Intent` gate answered "Lock intent" 2026-10-21; key check `GET /v1/models/claude-haiku-5-5` returned HTTP 200.
- [x] Design sections A to D approved. Evidence: `Section A` to `Section D` gates answered "Approve" 2026-10-21.
- [ ] Spec committed on the session branch and approved at the `Spec` gate.
- [ ] Plan body written, `ultra-plan-runner.mjs` validation exit 0, approved at the plan gate.
- [ ] T1 scenario prompt module: RED test first, then its test file exit 0.
- [ ] T2 story Worker: its tests exit 0 and `wrangler deploy --dry-run` exit 0.
- [ ] T3 scenario Pages Function: `bun test functions/api/scenario.test.js` exit 0.
- [ ] T4 scenario client: game-engine tests exit 0.
- [ ] T5 docs and config: README, `.env.example`, dev scripts updated; copy-rules check exit 0.
- [ ] Verify: `bun run test:quality` exit 0, web lint exit 0, `bun run build` exit 0, no `sk-ant` string in `apps/web/dist`.
- [ ] Review: parent diff audit and an independent reviewer report with no open P0/P1.
- [ ] Deliver: PR opened through `pr-registry.mjs open`, session state `open`.
- [ ] Merge: approved at its own gate, session state `merged`.
- [ ] Deploy story Worker and set `ANTHROPIC_API_KEY` secret (own gate); public URL check fails to connect.
- [ ] Add `STORY_WORKER` binding to Pages production and deploy Pages (own gate); smoke test with `wrangler tail`.
- [ ] Session-close debt sweep, learning ledger, graphify sync, plan closeout.
