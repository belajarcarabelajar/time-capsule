export class PointsError extends Error {
  constructor(code = 'POINTS_UNAVAILABLE', status = 503) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function adminEmails(env) {
  if (typeof env?.ADMIN_EMAILS !== 'string') return [];
  return env.ADMIN_EMAILS.split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isUnlimitedQuotaUser(authUser, env) {
  return authUser?.verified_email === true
    && typeof authUser.email === 'string'
    && adminEmails(env).includes(authUser.email.trim().toLowerCase());
}

export function pointsErrorResponse(error) {
  return new Response(JSON.stringify({
    success: false,
    error: error.code,
    message: error.status === 403
      ? 'Poin Anda tidak mencukupi. Diperlukan 10 poin untuk men-generate cerita. Poin akan di-reset besok!'
      : 'Saldo poin sementara tidak tersedia. Silakan coba lagi.',
  }), { status: error.status, headers: { 'Content-Type': 'application/json' } });
}

const validQuota = "typeof(points) = 'integer' AND points >= 0 AND typeof(max_points) = 'integer' AND max_points >= 0";
const resetDue = "(last_point_reset IS NULL OR last_point_reset < date('now'))";

function resetStatements(db, subject) {
  return [
    db.prepare(`INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
      SELECT id, max_points - points, max_points, 'DAILY_RESET', 'Daily point reset'
      FROM users WHERE google_id = ? AND ${validQuota} AND ${resetDue}`).bind(subject),
    db.prepare(`UPDATE users SET points = max_points, last_point_reset = date('now')
      WHERE google_id = ? AND ${validQuota} AND ${resetDue}`).bind(subject),
  ];
}

function requireQuota(row) {
  if (!row || !Number.isInteger(row.points) || row.points < 0 ||
      !Number.isInteger(row.max_points) || row.max_points < 0) throw new PointsError();
  return row;
}

export async function readUserPoints(authUser, env) {
  if (!authUser || !env.DB) throw new PointsError();
  try {
    const result = await env.DB.batch([
      ...resetStatements(env.DB, authUser.sub),
      env.DB.prepare('SELECT id, points, max_points FROM users WHERE google_id = ?').bind(authUser.sub),
    ]);
    return requireQuota(result[2].results[0]);
  } catch {
    throw new PointsError();
  }
}

// Takes the points before any paid call, in one transactional batch, so
// parallel requests cannot both pass on the same balance. Resolves to
// { unlimited: true } for the admin, else { unlimited: false, points }.
export async function reservePoints(authUser, env, cost = 10, description = 'Generasi cerita time capsule') {
  if (isUnlimitedQuotaUser(authUser, env)) return { unlimited: true };
  if (!authUser || !env.DB) throw new PointsError();
  const db = env.DB;
  const affordable = `google_id = ? AND ${validQuota} AND points >= ?`;
  let result;
  try {
    result = await db.batch([
      ...resetStatements(db, authUser.sub),
      db.prepare(`INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
        SELECT id, ?, points - ?, 'GENERATE_STORY', ? FROM users WHERE ${affordable}`)
        .bind(-cost, cost, description, authUser.sub, cost),
      db.prepare(`UPDATE users SET points = points - ? WHERE ${affordable}`)
        .bind(cost, authUser.sub, cost),
      db.prepare('SELECT points, max_points FROM users WHERE google_id = ?').bind(authUser.sub),
    ]);
  } catch {
    throw new PointsError();
  }
  const row = requireQuota(result[4].results[0]);
  if (result[3].meta.changes !== 1) throw new PointsError('INSUFFICIENT_POINTS', 403);
  return { unlimited: false, points: row.points };
}

// Gives a reservation back after a failed generation. Never throws: a failed
// refund is logged with a reason code and the points stay spent.
export async function refundPoints(authUser, env, cost = 10, description = 'Pengembalian poin generasi gagal') {
  // A daily reset may have refilled the balance since the reservation, so the
  // refund stops at max_points and never lowers a balance already above it.
  const refunded = 'max(points, min(points + ?, max_points))';
  try {
    const db = env.DB;
    const result = await db.batch([
      db.prepare(`INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
        SELECT id, ${refunded} - points, ${refunded}, 'REFUND_STORY', ?
        FROM users WHERE google_id = ? AND ${validQuota}`)
        .bind(cost, cost, description, authUser.sub),
      db.prepare(`UPDATE users SET points = ${refunded} WHERE google_id = ? AND ${validQuota}`)
        .bind(cost, authUser.sub),
    ]);
    if (result[1].meta.changes !== 1) throw new Error('no refundable row');
    return true;
  } catch {
    console.error('Point refund failed:', 'refund_unavailable');
    return false;
  }
}

// Records the generated story. The balance was already debited by
// reservePoints, so this neither reads nor changes it.
export async function saveStory({
  authUser, env, cost = 10,
  transactionDescription = 'Generasi cerita time capsule',
  storyTitle = 'Time Capsule Chapter', promptSnippet = 'Time Capsule Story',
  contentStr = '{}',
}) {
  const unlimited = isUnlimitedQuotaUser(authUser, env);
  if (!authUser || (!env.DB && !unlimited)) throw new PointsError();
  if (unlimited && !env.DB) return null;
  const db = env.DB;
  const storyId = crypto.randomUUID();
  try {
    if (unlimited) {
      await db.batch([
        db.prepare(`INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
          SELECT ?, id, ?, ?, ?, 0 FROM users WHERE google_id = ?`)
          .bind(storyId, storyTitle, promptSnippet, contentStr, authUser.sub),
        db.prepare(`INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
          SELECT id, 0, points, 'ADMIN_GENERATE', ? FROM users WHERE google_id = ?
          AND EXISTS (SELECT 1 FROM stories WHERE id = ? AND user_id = users.id)`)
          .bind(transactionDescription, authUser.sub, storyId),
      ]);
      return null;
    }
    const result = await db.batch([
      db.prepare(`INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
        SELECT ?, id, ?, ?, ?, ? FROM users WHERE google_id = ? AND ${validQuota}`)
        .bind(storyId, storyTitle, promptSnippet, contentStr, cost, authUser.sub),
    ]);
    if (result[0].meta.changes !== 1) throw new PointsError();
    return storyId;
  } catch (error) {
    if (unlimited) {
      console.error('Admin story persistence unavailable');
      return null;
    }
    if (error instanceof PointsError) throw error;
    throw new PointsError();
  }
}
