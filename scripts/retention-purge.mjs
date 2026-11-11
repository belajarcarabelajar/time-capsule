#!/usr/bin/env bun
// Manual 90-day retention purge for the time-capsule D1 database.
// Usage: bun scripts/retention-purge.mjs --database <d1-name> [--apply]
// Without --apply it only prints the SQL and runs nothing. Cron trigger slots on
// the account are full, so this is run by hand; see README "Data retention".
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const RETENTION_DAYS = 90;

// Stored timestamps are SQLite CURRENT_TIMESTAMP text (YYYY-MM-DD HH:MM:SS), so
// the cutoff must come from datetime() to compare in the same format.
const cutoff = `datetime('now', '-${RETENTION_DAYS} days')`;

export function purgeTargets() {
  return [
    // IP address, country, user agent, and email of every login.
    { table: "auth_audit_logs", column: "login_at" },
    // Story topics live in prompt and content; no endpoint reads stories back.
    { table: "stories", column: "created_at" },
  ].map(({ table, column }) => ({
    table,
    count: `SELECT COUNT(*) AS expired FROM ${table} WHERE ${column} < ${cutoff};`,
    delete: `DELETE FROM ${table} WHERE ${column} < ${cutoff};`,
  }));
}

const USAGE =
  "Usage: bun scripts/retention-purge.mjs --database <d1-name> [--apply]";

function parseArgs(argv) {
  let database;
  let apply = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--database") {
      database = argv[i + 1];
      i += 1;
    } else return null;
  }
  if (typeof database !== "string" || !/^[A-Za-z0-9_-]+$/.test(database))
    return null;
  return { database, apply };
}

export function runRetentionPurge(argv, { run, log }) {
  const options = parseArgs(argv);
  if (!options) {
    log(USAGE);
    return 2;
  }
  const targets = purgeTargets();
  const statements = [
    ...targets.map((t) => t.count),
    ...targets.map((t) => t.delete),
  ];
  const wranglerArgs = (sql) => [
    "d1",
    "execute",
    options.database,
    "--remote",
    "--command",
    sql,
  ];

  if (!options.apply) {
    log(
      `Dry run: nothing executed. Retention ${RETENTION_DAYS} days on D1 database ${options.database}.`,
    );
    log("Counts of rows past retention:");
    for (const t of targets) log(`  ${t.count}`);
    log("Deletes that --apply would run:");
    for (const t of targets) log(`  ${t.delete}`);
    log(
      "Re-run with --apply to execute them with wrangler d1 execute --remote.",
    );
    return 0;
  }

  for (const sql of statements) {
    log(`wrangler d1 execute ${options.database} --remote --command "${sql}"`);
    const code = run(wranglerArgs(sql));
    if (code !== 0) {
      log(`Stopped: wrangler exited ${code}.`);
      return code || 1;
    }
  }
  return 0;
}

if (import.meta.main) {
  const wrangler = fileURLToPath(
    new URL("../node_modules/.bin/wrangler", import.meta.url),
  );
  const run = (args) =>
    spawnSync(wrangler, args, { stdio: "inherit" }).status ?? 1;
  process.exit(
    runRetentionPurge(process.argv.slice(2), {
      run,
      log: (line) => console.log(line),
    }),
  );
}
