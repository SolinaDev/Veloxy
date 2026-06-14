import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/veloxy.db");
mkdirSync(dirname(databasePath), {
  recursive: true,
});

export const db = new DatabaseSync(databasePath);

db.exec(`
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

const runColumns = db
  .prepare("PRAGMA table_info(runs)")
  .all()
  .map((column) => column.name);

if (!runColumns.includes("time")) {
  db.exec("ALTER TABLE runs ADD COLUMN time TEXT NOT NULL DEFAULT '0m'");
}

if (!runColumns.includes("type")) {
  db.exec("ALTER TABLE runs ADD COLUMN type TEXT NOT NULL DEFAULT 'RUNNING'");
}

if (!runColumns.includes("created_at_ms")) {
  db.exec("ALTER TABLE runs ADD COLUMN created_at_ms INTEGER NOT NULL DEFAULT 0");
}

const userColumns = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map((column) => column.name);

if (!userColumns.includes("bio")) {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
}

if (!userColumns.includes("location")) {
  db.exec("ALTER TABLE users ADD COLUMN location TEXT");
}

if (!userColumns.includes("weekly_goal_km")) {
  db.exec("ALTER TABLE users ADD COLUMN weekly_goal_km REAL NOT NULL DEFAULT 10");
}

export function closeDatabase() {
  db.close();
}
