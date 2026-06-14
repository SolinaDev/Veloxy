import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Pool } = pg;

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
const usePostgres = provider === "postgres";

function toPostgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const normalized = {};

    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "string" || value === null || value === undefined) {
        normalized[key] = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        normalized[key] = value;
      } else if (typeof value === "bigint") {
        normalized[key] = Number(value);
      } else if (value instanceof Date) {
        normalized[key] = value.toISOString();
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  });
}

function createSqliteClient() {
  const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/veloxy.db");
  mkdirSync(dirname(databasePath), {
    recursive: true,
  });

  const sqlite = new DatabaseSync(databasePath);

  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT NOT NULL,
      photo_url TEXT,
      bio TEXT,
      location TEXT,
      weekly_goal_km REAL NOT NULL DEFAULT 10,
      private_profile INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      total_km REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT,
      distance REAL NOT NULL,
      time TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      pace TEXT NOT NULL,
      calories INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'RUNNING',
      route_json TEXT NOT NULL DEFAULT '[]',
      created_at_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_runs_user_created
      ON runs(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS activity_likes (
      activity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (activity_id, user_id),
      FOREIGN KEY (activity_id) REFERENCES runs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      description TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_by TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      image TEXT,
      price TEXT,
      official_url TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const runColumns = sqlite
    .prepare("PRAGMA table_info(runs)")
    .all()
    .map((column) => column.name);

  if (!runColumns.includes("time")) {
    sqlite.exec("ALTER TABLE runs ADD COLUMN time TEXT NOT NULL DEFAULT '0m'");
  }

  if (!runColumns.includes("type")) {
    sqlite.exec("ALTER TABLE runs ADD COLUMN type TEXT NOT NULL DEFAULT 'RUNNING'");
  }

  if (!runColumns.includes("created_at_ms")) {
    sqlite.exec("ALTER TABLE runs ADD COLUMN created_at_ms INTEGER NOT NULL DEFAULT 0");
  }

  const userColumns = sqlite
    .prepare("PRAGMA table_info(users)")
    .all()
    .map((column) => column.name);

  if (!userColumns.includes("bio")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN bio TEXT");
  }

  if (!userColumns.includes("location")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN location TEXT");
  }

  if (!userColumns.includes("weekly_goal_km")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN weekly_goal_km REAL NOT NULL DEFAULT 10");
  }

  return {
    provider: "sqlite",
    async all(sql, params = []) {
      return sqlite.prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return sqlite.prepare(sql).get(...params);
    },
    async run(sql, params = []) {
      return sqlite.prepare(sql).run(...params);
    },
    async close() {
      sqlite.close();
    },
  };
}

async function createPostgresClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL precisa estar definida quando DATABASE_PROVIDER=postgres");
  }

  const pool = new Pool({
    connectionString,
  });

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const schemaPath = resolve(currentDir, "../sql/001_init_postgres.sql");
  const schema = readFileSync(schemaPath, "utf8");
  await pool.query(schema);

  return {
    provider: "postgres",
    async all(sql, params = []) {
      const result = await pool.query(toPostgresSql(sql), params);
      return normalizeRows(result.rows);
    },
    async get(sql, params = []) {
      const result = await pool.query(toPostgresSql(sql), params);
      return normalizeRows(result.rows)[0];
    },
    async run(sql, params = []) {
      const result = await pool.query(toPostgresSql(sql), params);
      return {
        changes: result.rowCount,
        rowCount: result.rowCount,
      };
    },
    async close() {
      await pool.end();
    },
  };
}

export const db = usePostgres ? await createPostgresClient() : createSqliteClient();

export async function closeDatabase() {
  await db.close();
}
