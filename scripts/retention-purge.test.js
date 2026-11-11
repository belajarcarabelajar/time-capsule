import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createPointsDb } from "../functions/api/test-support/pointsDb.js";
import {
  RETENTION_DAYS,
  purgeTargets,
  runRetentionPurge,
} from "./retention-purge.mjs";

describe("retention SQL on a local D1 fixture", () => {
  let fixture;

  beforeEach(async () => {
    fixture = await createPointsDb();
    const db = fixture.db;
    for (const [email, age] of [
      ["recent@example.invalid", "-89 days"],
      ["old@example.invalid", "-91 days"],
    ]) {
      await db
        .prepare(
          "INSERT INTO auth_audit_logs (user_id, email, ip_address, country, user_agent, login_at) VALUES ('internal-user', ?, '203.0.113.7', 'ID', 'Agent/1', datetime('now', ?))",
        )
        .bind(email, age)
        .run();
    }
    for (const [id, age] of [
      ["story-recent", "-89 days"],
      ["story-old", "-91 days"],
    ]) {
      await db
        .prepare(
          "INSERT INTO stories (id, user_id, title, prompt, content, points_spent, created_at) VALUES (?, 'internal-user', 'Time Capsule Chapter', 'Roma (bagian 1)', '{}', 10, datetime('now', ?))",
        )
        .bind(id, age)
        .run();
    }
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  test("keeps 90 days", () => {
    expect(RETENTION_DAYS).toBe(90);
  });

  test("covers the login audit log and the stories table", () => {
    expect(purgeTargets().map((target) => target.table)).toEqual([
      "auth_audit_logs",
      "stories",
    ]);
  });

  test("each count statement counts only the row older than 90 days", async () => {
    for (const target of purgeTargets()) {
      const row = await fixture.db.prepare(target.count).first();
      expect(Object.values(row)).toEqual([1]);
    }
  });

  test("the delete statements remove the 91-day-old login record and story and keep the 89-day-old ones", async () => {
    for (const target of purgeTargets())
      await fixture.db.prepare(target.delete).run();
    const logins = await fixture.db
      .prepare("SELECT email FROM auth_audit_logs")
      .all();
    expect(logins.results).toEqual([{ email: "recent@example.invalid" }]);
    const stories = await fixture.db.prepare("SELECT id FROM stories").all();
    expect(stories.results).toEqual([{ id: "story-recent" }]);
  });

  test("the delete statements leave users and the points ledger alone", async () => {
    await fixture.db
      .prepare(
        "INSERT INTO point_transactions (user_id, amount, balance_after, type, created_at) VALUES ('internal-user', -10, 40, 'GENERATE_STORY', datetime('now', '-200 days'))",
      )
      .run();
    for (const target of purgeTargets())
      await fixture.db.prepare(target.delete).run();
    const users = await fixture.db
      .prepare("SELECT COUNT(*) AS n FROM users")
      .first();
    const ledger = await fixture.db
      .prepare("SELECT COUNT(*) AS n FROM point_transactions")
      .first();
    expect(users.n).toBe(1);
    expect(ledger.n).toBe(1);
  });
});

describe("runRetentionPurge command line", () => {
  function harness() {
    const calls = [];
    const lines = [];
    return {
      calls,
      lines,
      deps: {
        run: (args) => {
          calls.push(args);
          return 0;
        },
        log: (line) => lines.push(line),
      },
    };
  }

  test("a dry run prints every count and delete statement and never calls wrangler", () => {
    const { calls, lines, deps } = harness();
    const code = runRetentionPurge(["--database", "time-capsule-db"], deps);
    expect(code).toBe(0);
    expect(calls).toEqual([]);
    const output = lines.join("\n");
    for (const target of purgeTargets()) {
      expect(output).toContain(target.count);
      expect(output).toContain(target.delete);
    }
    expect(output).toContain("--apply");
  });

  test("--apply runs the counts and then the deletes against the remote database", () => {
    const { calls, deps } = harness();
    const code = runRetentionPurge(
      ["--database", "time-capsule-db", "--apply"],
      deps,
    );
    expect(code).toBe(0);
    const targets = purgeTargets();
    const expected = [
      ...targets.map((t) => t.count),
      ...targets.map((t) => t.delete),
    ].map((sql) => [
      "d1",
      "execute",
      "time-capsule-db",
      "--remote",
      "--command",
      sql,
    ]);
    expect(calls).toEqual(expected);
  });

  test("--apply stops at the first failing wrangler call", () => {
    const { calls, deps } = harness();
    deps.run = (args) => {
      calls.push(args);
      return 1;
    };
    expect(
      runRetentionPurge(["--database", "time-capsule-db", "--apply"], deps),
    ).toBe(1);
    expect(calls).toHaveLength(1);
  });

  for (const [name, argv] of [
    ["a missing --database", ["--apply"]],
    ["an empty database name", ["--database", ""]],
    ["a database name with shell characters", ["--database", "db;rm"]],
    ["an unknown flag", ["--database", "time-capsule-db", "--local"]],
  ]) {
    test(`rejects ${name} with exit 2 and no wrangler call`, () => {
      const { calls, deps } = harness();
      expect(runRetentionPurge(argv, deps)).toBe(2);
      expect(calls).toEqual([]);
    });
  }
});
