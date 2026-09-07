import { test, expect, beforeEach, afterEach } from 'bun:test';
import { createPointsDb } from './test-support/pointsDb.js';
import { checkUserPoints, deductPointsAndSaveStory } from './_ai_utils.js';
let fixture;
beforeEach(async () => { fixture = await createPointsDb(); });
afterEach(async () => { await fixture?.dispose(); });
const authUser = { sub: 'google-user' };
const adminUser = { sub: 'google-user', email: 'Kurniawaniwan7906@gmail.com', verified_email: true };
const debit = () => deductPointsAndSaveStory({ authUser, env: { DB: fixture.db }, currentPoints: 50 });
const row = () => fixture.db.prepare('SELECT points FROM users').first();
const count = async table => (await fixture.db.prepare(`SELECT count(*) n FROM ${table}`).first()).n;
test('two simultaneous successes debit twice with actual FK identity', async () => {
  const result = await Promise.all([debit(), debit()]);
  expect(result.every(n => typeof n === 'number')).toBe(true);
  expect((await row()).points).toBe(30);
  expect(await count('stories')).toBe(2);
  expect(await count('point_transactions')).toBe(2);
});
test('last ten points allow at most one simultaneous success', async () => {
  await fixture.db.prepare('UPDATE users SET points=10').run();
  const result = await Promise.allSettled([debit(), debit()]);
  expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await row()).points).toBe(0);
  expect(await count('stories')).toBe(1);
  expect(await count('point_transactions')).toBe(1);
});
for (const table of ['stories', 'point_transactions']) {
  test(`${table} failure rolls back debit and all writes`, async () => {
    await fixture.db.prepare(`CREATE TRIGGER fail_write BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'injected'); END`).run();
    await expect(debit()).rejects.toThrow();
    expect((await row()).points).toBe(50);
    expect(await count('stories')).toBe(0);
    expect(await count('point_transactions')).toBe(0);
  });
}
test('missing binding, absent user and database errors fail closed', async () => {
  for (const env of [{}, { DB: { prepare() { throw new Error('read failed'); } } }]) {
    const result = await checkUserPoints(authUser, env);
    expect(result.success).toBe(false);
    expect(result.errorResponse.status).toBe(503);
  }
  const missing = await checkUserPoints({ sub: 'absent' }, { DB: fixture.db });
  expect(missing.success).toBe(false);
});

test('verified admin email bypasses quota without a database', async () => {
  const result = await checkUserPoints({ ...adminUser, sub: 'missing' }, {});
  expect(result).toEqual({ success: true, unlimited: true, currentPoints: null });
});

test('admin story persistence never decrements points', async () => {
  await deductPointsAndSaveStory({ authUser: adminUser, env: { DB: fixture.db } });
  expect((await row()).points).toBe(50);
  expect((await fixture.db.prepare('SELECT points_spent FROM stories').first()).points_spent).toBe(0);
  expect((await fixture.db.prepare("SELECT amount, type FROM point_transactions WHERE type='ADMIN_GENERATE'").first()))
    .toEqual({ amount: 0, type: 'ADMIN_GENERATE' });
});

test('admin generation remains available when story persistence fails', async () => {
  const result = await deductPointsAndSaveStory({
    authUser: adminUser,
    env: { DB: { batch: async () => { throw new Error('injected persistence failure'); } } },
  });
  expect(result).toBeNull();
});

test('unverified or near-match emails do not receive the admin bypass', async () => {
  for (const identity of [
    { ...adminUser, verified_email: false },
    { ...adminUser, email: 'kurniawaniwan7906+test@gmail.com' },
  ]) {
    const result = await checkUserPoints({ ...identity, sub: 'missing' }, {});
    expect(result.success).toBe(false);
    expect(result.errorResponse.status).toBe(503);
  }
});
test('concurrent daily reset uses custom maximum once and preserves debit', async () => {
  await fixture.db.prepare("UPDATE users SET points=0, max_points=80, last_point_reset='2000-01-01'").run();
  await Promise.all([checkUserPoints(authUser, { DB: fixture.db }), debit(), checkUserPoints(authUser, { DB: fixture.db })]);
  expect((await row()).points).toBe(70);
  expect((await fixture.db.prepare("SELECT count(*) n FROM point_transactions WHERE type='DAILY_RESET'").first()).n).toBe(1);
  expect(await count('stories')).toBe(1);
});
