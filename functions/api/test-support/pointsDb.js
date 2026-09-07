import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';

export async function createPointsDb({ points = 50, maxPoints = 50, reset = new Date().toISOString().slice(0, 10) } = {}) {
  const runtime = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("local fixture"); } };',
    compatibilityDate: '2026-07-30',
    d1Databases: ['DB'],
  });
  try {
    const db = await runtime.getD1Database('DB');
    const schema = readFileSync(new URL('../../../schema.sql', import.meta.url), 'utf8');
    for (const statement of schema.split(';').filter(s => s.trim())) await db.prepare(statement).run();
    await db.prepare('INSERT INTO users (id, google_id, email, points, max_points, last_point_reset) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('internal-user', 'google-user', 'fixture@example.invalid', points, maxPoints, reset).run();
    return { db, dispose: () => runtime.dispose() };
  } catch (error) {
    await runtime.dispose();
    throw error;
  }
}
