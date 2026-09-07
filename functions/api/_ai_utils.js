export class PointsError extends Error {
  constructor(code = 'POINTS_UNAVAILABLE', status = 503) {
    super(code);
    this.code = code;
    this.status = status;
  }
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

export async function checkUserPoints(authUser, env, cost = 10) {
  try {
    const row = await readUserPoints(authUser, env);
    if (row.points < cost) throw new PointsError('INSUFFICIENT_POINTS', 403);
    return { success: true, currentPoints: row.points };
  } catch (error) {
    return { success: false, errorResponse: pointsErrorResponse(error) };
  }
}

export async function deductPointsAndSaveStory({
  authUser, env, cost = 10,
  transactionDescription = 'Generasi cerita time capsule',
  storyTitle = 'Time Capsule Chapter', promptSnippet = 'Time Capsule Story',
  contentStr = '{}', dataObj,
}) {
  if (!authUser || !env.DB) throw new PointsError();
  const db = env.DB;
  const storyId = crypto.randomUUID();
  try {
    const result = await db.batch([
      ...resetStatements(db, authUser.sub),
      db.prepare(`INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
        SELECT ?, id, ?, ?, ?, ? FROM users
        WHERE google_id = ? AND ${validQuota} AND points >= ?`)
        .bind(storyId, storyTitle, promptSnippet, contentStr, cost, authUser.sub, cost),
      db.prepare(`UPDATE users SET points = points - ? WHERE google_id = ?
        AND EXISTS (SELECT 1 FROM stories WHERE id = ? AND user_id = users.id)`)
        .bind(cost, authUser.sub, storyId),
      db.prepare(`INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
        SELECT id, ?, points, 'GENERATE_STORY', ? FROM users WHERE google_id = ?
        AND EXISTS (SELECT 1 FROM stories WHERE id = ? AND user_id = users.id)`)
        .bind(-cost, transactionDescription, authUser.sub, storyId),
      db.prepare('SELECT points, max_points FROM users WHERE google_id = ?').bind(authUser.sub),
    ]);
    const row = requireQuota(result[5].results[0]);
    if (result[2].meta.changes !== 1) throw new PointsError('INSUFFICIENT_POINTS', 403);
    if (dataObj) dataObj.user_points = row.points;
    return row.points;
  } catch (error) {
    if (error instanceof PointsError) throw error;
    throw new PointsError();
  }
}
