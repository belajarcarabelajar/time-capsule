import { test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { createPointsDb } from './test-support/pointsDb.js';
import { PointsError, readUserPoints, refundPoints, reservePoints, saveStory } from './_ai_utils.js';
let fixture;
beforeEach(async () => { fixture = await createPointsDb(); });
afterEach(async () => { await fixture?.dispose(); });
const authUser = { sub: 'google-user' };
const adminUser = { sub: 'google-user', email: 'Admin@Example.com', verified_email: true };
const adminEnv = { ADMIN_EMAILS: ' other@example.com , ADMIN@example.com ' };
const reserve = () => reservePoints(authUser, { DB: fixture.db });
const refund = () => refundPoints(authUser, { DB: fixture.db });
const save = () => saveStory({ authUser, env: { DB: fixture.db } });
const row = () => fixture.db.prepare('SELECT points FROM users').first();
const count = async table => (await fixture.db.prepare(`SELECT count(*) n FROM ${table}`).first()).n;
const ledger = async () => (await fixture.db
  .prepare('SELECT amount, balance_after, type FROM point_transactions ORDER BY id').all()).results;
const pointsError = async (promise) => {
  const error = await promise.then(() => null, e => e);
  expect(error).toBeInstanceOf(PointsError);
  return { code: error.code, status: error.status };
};
test('two simultaneous reservations debit twice with actual FK identity', async () => {
  const result = await Promise.all([reserve(), reserve()]);
  expect(result.map(r => r.points).sort()).toEqual([30, 40]);
  expect((await row()).points).toBe(30);
  expect(await ledger()).toEqual([
    { amount: -10, balance_after: 40, type: 'GENERATE_STORY' },
    { amount: -10, balance_after: 30, type: 'GENERATE_STORY' },
  ]);
  expect(await count('stories')).toBe(0);
});
test('last ten points allow at most one simultaneous reservation', async () => {
  await fixture.db.prepare('UPDATE users SET points=10').run();
  const result = await Promise.allSettled([reserve(), reserve()]);
  expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const lost = result.find(r => r.status === 'rejected').reason;
  expect({ code: lost.code, status: lost.status }).toEqual({ code: 'INSUFFICIENT_POINTS', status: 403 });
  expect((await row()).points).toBe(0);
  expect(await count('point_transactions')).toBe(1);
});
test('a balance below the cost is refused with 403 and no ledger row', async () => {
  await fixture.db.prepare('UPDATE users SET points=9').run();
  expect(await pointsError(reserve())).toEqual({ code: 'INSUFFICIENT_POINTS', status: 403 });
  expect((await row()).points).toBe(9);
  expect(await count('point_transactions')).toBe(0);
});
test('point_transactions failure rolls back the reservation debit', async () => {
  await fixture.db.prepare("CREATE TRIGGER fail_write BEFORE INSERT ON point_transactions BEGIN SELECT RAISE(ABORT, 'injected'); END").run();
  expect(await pointsError(reserve())).toEqual({ code: 'POINTS_UNAVAILABLE', status: 503 });
  expect((await row()).points).toBe(50);
  expect(await count('point_transactions')).toBe(0);
});
test('stories failure rejects the story save with 503 and leaves the balance alone', async () => {
  await fixture.db.prepare("CREATE TRIGGER fail_write BEFORE INSERT ON stories BEGIN SELECT RAISE(ABORT, 'injected'); END").run();
  expect(await pointsError(save())).toEqual({ code: 'POINTS_UNAVAILABLE', status: 503 });
  expect((await row()).points).toBe(50);
  expect(await count('stories')).toBe(0);
});
test('missing binding, absent user and database errors fail the reservation closed with 503', async () => {
  const unavailable = { code: 'POINTS_UNAVAILABLE', status: 503 };
  for (const env of [{}, { DB: { prepare() { throw new Error('read failed'); } } }]) {
    expect(await pointsError(reservePoints(authUser, env))).toEqual(unavailable);
  }
  expect(await pointsError(reservePoints({ sub: 'absent' }, { DB: fixture.db }))).toEqual(unavailable);
  expect(await count('point_transactions')).toBe(0);
});

test('verified admin email skips the reservation without a database', async () => {
  expect(await reservePoints({ ...adminUser, sub: 'missing' }, adminEnv)).toEqual({ unlimited: true });
});

test('verified admin email with a database reserves nothing', async () => {
  expect(await reservePoints(adminUser, { ...adminEnv, DB: fixture.db })).toEqual({ unlimited: true });
  expect((await row()).points).toBe(50);
  expect(await count('point_transactions')).toBe(0);
});

test('missing or empty ADMIN_EMAILS grants nobody the admin bypass', async () => {
  for (const env of [{}, { ADMIN_EMAILS: '' }, { ADMIN_EMAILS: ' , ' }]) {
    for (const identity of [adminUser, { ...adminUser, email: '' }]) {
      expect((await pointsError(reservePoints({ ...identity, sub: 'missing' }, env))).status).toBe(503);
    }
  }
});

test('admin story persistence never decrements points', async () => {
  await saveStory({ authUser: adminUser, env: { ...adminEnv, DB: fixture.db } });
  expect((await row()).points).toBe(50);
  expect((await fixture.db.prepare('SELECT points_spent FROM stories').first()).points_spent).toBe(0);
  expect((await fixture.db.prepare("SELECT amount, type FROM point_transactions WHERE type='ADMIN_GENERATE'").first()))
    .toEqual({ amount: 0, type: 'ADMIN_GENERATE' });
});

test('admin generation remains available when story persistence fails', async () => {
  const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await saveStory({
      authUser: adminUser,
      env: { ...adminEnv, DB: { batch: async () => { throw new Error('injected persistence failure'); } } },
    });
    expect(result).toBeNull();
  } finally {
    errorSpy.mockRestore();
  }
});

test('unverified or near-match emails do not receive the admin bypass', async () => {
  for (const identity of [
    { ...adminUser, verified_email: false },
    { ...adminUser, email: 'admin+test@example.com' },
  ]) {
    expect((await pointsError(reservePoints({ ...identity, sub: 'missing' }, adminEnv))).status).toBe(503);
  }
});
test('concurrent daily reset uses custom maximum once and preserves the reservation', async () => {
  await fixture.db.prepare("UPDATE users SET points=0, max_points=80, last_point_reset='2000-01-01'").run();
  await Promise.all([readUserPoints(authUser, { DB: fixture.db }), reserve(), readUserPoints(authUser, { DB: fixture.db })]);
  expect((await row()).points).toBe(70);
  expect((await fixture.db.prepare("SELECT count(*) n FROM point_transactions WHERE type='DAILY_RESET'").first()).n).toBe(1);
  expect((await fixture.db.prepare("SELECT count(*) n FROM point_transactions WHERE type='GENERATE_STORY'").first()).n).toBe(1);
});
test('story save after the reservation works at a zero balance and records 10 points spent', async () => {
  await fixture.db.prepare('UPDATE users SET points=10').run();
  await reserve();
  expect(typeof await save()).toBe('string');
  expect((await row()).points).toBe(0);
  expect((await fixture.db.prepare('SELECT user_id, points_spent FROM stories').first()))
    .toEqual({ user_id: 'internal-user', points_spent: 10 });
  expect(await count('point_transactions')).toBe(1);
});
test('story save for a session without a user row fails with 503', async () => {
  expect(await pointsError(saveStory({ authUser: { sub: 'absent' }, env: { DB: fixture.db } })))
    .toEqual({ code: 'POINTS_UNAVAILABLE', status: 503 });
});
test('refund returns the reserved points with a REFUND_STORY ledger row', async () => {
  await reserve();
  expect(await refund()).toBe(true);
  expect((await row()).points).toBe(50);
  expect(await ledger()).toEqual([
    { amount: -10, balance_after: 40, type: 'GENERATE_STORY' },
    { amount: 10, balance_after: 50, type: 'REFUND_STORY' },
  ]);
});
test('refund stops at max_points and records the actual change', async () => {
  await fixture.db.prepare('UPDATE users SET points=45').run();
  expect(await refund()).toBe(true);
  expect((await row()).points).toBe(50);
  expect(await ledger()).toEqual([{ amount: 5, balance_after: 50, type: 'REFUND_STORY' }]);
});
test('refund never lowers a balance that is already above max_points', async () => {
  await fixture.db.prepare('UPDATE users SET points=60').run();
  expect(await refund()).toBe(true);
  expect((await row()).points).toBe(60);
  expect(await ledger()).toEqual([{ amount: 0, balance_after: 60, type: 'REFUND_STORY' }]);
});
test('a failed refund resolves false and logs only a reason code', async () => {
  const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const envs = [{}, { DB: { prepare() { throw new Error('secret detail'); } } }];
    for (const env of envs) expect(await refundPoints(authUser, env)).toBe(false);
    expect(await refundPoints({ sub: 'absent' }, { DB: fixture.db })).toBe(false);
    expect(errorSpy.mock.calls).toEqual(Array(3).fill(['Point refund failed:', 'refund_unavailable']));
  } finally {
    errorSpy.mockRestore();
  }
  expect((await row()).points).toBe(50);
});
