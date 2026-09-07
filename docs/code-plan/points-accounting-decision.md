**Points accounting checkpoint — 2026-09-07**

Reviewed implementation design: no schema migration. Preserve 10 points per successful generation, including automatic preload. Cached consumption has no second debit. Preserve provider-success charging policy even when the client later rejects unusable story JSON.

Cloudflare documents D1 batches as sequential transactional statements, rolling back the complete batch on statement failure: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch. Local Miniflare D1 tests must establish actual guard and rollback behavior before completion claims.

Each accounting batch first conditionally records and applies the UTC daily reset using the database UTC date and stored reset date; using SQL date('now') avoids stale application dates around midnight. Reset ledger INSERT SELECT and conditional UPDATE execute within the same transaction. Ledger amount records the actual balance change to the user's max_points. No default balance is invented for absent/corrupt quota state.

Then INSERT a story with a fresh per-call UUID by SELECT from users WHERE google_id = ? AND points >= cost. The story uses the actual users.id foreign key. UPDATE users SET points = points - cost is gated by EXISTS of that story UUID and user identity. INSERT generation ledger SELECT reads the resulting balance with the same gate. SELECT returns the balance. A zero-change story insertion returns 403 without a generation debit or ledger; statement failures roll everything back and return 503 POINTS_UNAVAILABLE. There is no stale absolute balance assignment.

The UUID gates statements inside a single call; it is not retry idempotency. Concurrent provider calls may both run before one loses the quota guard. The losing call is not delivered as chargeable success. Provider-success/accounting-failure is terminal and must not trigger fallback. Own accounting unavailability uses 503; upstream provider 503 is translated to 502 to preserve ordinary provider fallback. Auth/quota and own 503 responses remain terminal even with malformed/empty bodies.

The shared reset-and-read function serves /auth/me; generation repeats its reset at commit to handle a provider call crossing midnight. Concurrent /me reads cannot overwrite committed debits. Auth remains available on quota-read failure with points/maxPoints null and pointsAvailable false.

Frontend RED evidence: 12 failures reproduced out-of-order refresh (40 overwrote 30), identity lost on temporary refresh failure, post-logout resurrection, and malformed status fallback. GREEN: all 12 pass. Hook RED reproduced zero session refreshes after foreground/preload; GREEN confirms two refreshes and only one new generation on cached continuation.

Live production attribution, bindings and deployment remain unverified; no live data or provider calls are used.
