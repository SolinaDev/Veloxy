import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { closeDatabase, db } from "./database.js";
import { verifyFirebaseUser } from "./auth.js";

const app = Fastify({
  logger: true,
});

const port = Number(process.env.PORT ?? 3333);
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:5173";

const runSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable().optional(),
  distance: z.number().nonnegative(),
  time: z.string().min(1),
  durationSeconds: z.number().int().nonnegative(),
  pace: z.string().min(1),
  calories: z.number().int().nonnegative(),
  type: z.string().default("RUNNING"),
  route: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
      timestamp: z.number().optional(),
    }),
  ).default([]),
});

const profileSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  location: z.string().max(80).nullable().optional(),
  weeklyGoalKm: z.number().min(0).max(500).optional(),
  privateProfile: z.boolean().optional(),
});

const groupSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  description: z.string().min(2),
  tag: z.string().min(1),
  createdBy: z.string().min(1),
  creatorName: z.string().min(1),
});

const eventSchema = z.object({
  title: z.string().min(2),
  city: z.string().min(2),
  state: z.string().optional(),
  location: z.string().min(2),
  category: z.string().min(1),
  date: z.string().min(1),
  timestamp: z.string().min(1),
  image: z.string().optional(),
  price: z.string().optional(),
  officialUrl: z.string().optional(),
  source: z.string().optional(),
  status: z.string().default("unknown"),
});

function formatPace(totalSeconds, totalKm) {
  if (totalKm <= 0 || totalSeconds <= 0) return "0'00\"";
  const secondsPerKm = Math.round(totalSeconds / totalKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}'${String(seconds).padStart(2, "0")}"`;
}

function runToResponse(run) {
  const createdAtMs = run.created_at_ms || new Date(run.created_at).getTime();

  return {
    id: run.id,
    userId: run.user_id,
    userName: run.user_name,
    userAvatar: run.user_avatar,
    distance: run.distance,
    time: run.time,
    durationSeconds: run.duration_seconds,
    pace: run.pace,
    calories: run.calories,
    type: run.type,
    likes: [],
    route: JSON.parse(run.route_json || "[]"),
    timestamp: {
      seconds: Math.floor(createdAtMs / 1000),
      nanoseconds: 0,
    },
    createdAtMs,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  };
}

function groupToResponse(group) {
  const members = db
    .prepare("SELECT user_id FROM group_members WHERE group_id = ?")
    .all(group.id)
    .map((member) => member.user_id);
  const weeklyKmRow = db.prepare(`
    SELECT COALESCE(SUM(r.distance), 0) AS weekly_km
    FROM runs r
    WHERE r.user_id IN (
      SELECT user_id FROM group_members WHERE group_id = ?
    )
    AND r.created_at_ms >= ?
  `).get(group.id, Date.now() - 7 * 24 * 60 * 60 * 1000);

  return {
    id: group.id,
    name: group.name,
    city: group.city,
    description: group.description,
    tag: group.tag,
    createdBy: group.created_by,
    creatorName: group.creator_name,
    memberIds: members,
    membersCount: members.length,
    weeklyKm: Number(weeklyKmRow?.weekly_km ?? 0),
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

function eventToResponse(event) {
  const participants = db
    .prepare("SELECT user_id FROM event_participants WHERE event_id = ?")
    .all(event.id)
    .map((participant) => participant.user_id);

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    city: event.city,
    state: event.state,
    participantsCount: participants.length,
    participantsIds: participants,
    category: event.category,
    image: event.image ?? "",
    price: event.price ?? "",
    officialUrl: event.official_url,
    source: event.source,
    status: event.status,
    timestamp: event.timestamp,
  };
}

function dayKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildWeeklyData(runs) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  });
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dayKeyFromDate(date);
    const km = runs
      .filter((run) => dayKeyFromDate(new Date(run.created_at_ms || run.created_at)) === key)
      .reduce((sum, run) => sum + run.distance, 0);

    return {
      day: formatter.format(date).replace(".", "").toUpperCase(),
      km: Number(km.toFixed(2)),
    };
  });
}

function calculateCurrentStreak(runs) {
  const activeDays = new Set(
    runs.map((run) => dayKeyFromDate(new Date(run.created_at_ms || run.created_at))),
  );

  if (activeDays.size === 0) return 0;

  const cursor = new Date();
  let key = dayKeyFromDate(cursor);

  if (!activeDays.has(key)) {
    cursor.setDate(cursor.getDate() - 1);
    key = dayKeyFromDate(cursor);
  }

  let streak = 0;
  while (activeDays.has(key)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    key = dayKeyFromDate(cursor);
  }

  return streak;
}

function formatTotalTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function ensureUser(data) {
  db.prepare(`
    INSERT INTO users (id, display_name, photo_url)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      photo_url = excluded.photo_url,
      updated_at = CURRENT_TIMESTAMP
  `).run(data.userId, data.userName, data.userAvatar ?? null);
}

function userToResponse(user) {
  if (!user) return null;

  return {
    uid: user.id,
    displayName: user.display_name,
    photoURL: user.photo_url,
    bio: user.bio ?? "",
    location: user.location ?? "",
    weeklyGoalKm: user.weekly_goal_km,
    privateProfile: Boolean(user.private_profile),
    totalXP: user.total_xp,
    totalKm: user.total_km,
    level: "Iniciante",
    monthlyKm: user.total_km,
    createdAt: user.created_at,
    lastUpdated: user.updated_at,
  };
}

await app.register(cors, {
  origin: [appOrigin, "http://localhost:4173"],
});

app.addHook("preHandler", verifyFirebaseUser);

app.get("/health", async () => ({
  ok: true,
  service: "veloxy-api",
}));

app.get("/users/:userId", async (request, reply) => {
  const { userId } = request.params;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  if (!user) {
    return reply.code(404).send({
      error: "user_not_found",
    });
  }

  return userToResponse(user);
});

app.patch("/users/:userId", async (request, reply) => {
  const { userId } = request.params;
  const parsed = profileSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "invalid_profile",
      issues: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const displayName = data.displayName ?? currentUser?.display_name ?? "Corredor";
  const email = data.email ?? currentUser?.email ?? null;
  const photoURL = data.photoURL ?? currentUser?.photo_url ?? null;
  const bio = data.bio ?? currentUser?.bio ?? null;
  const location = data.location ?? currentUser?.location ?? null;
  const weeklyGoalKm = data.weeklyGoalKm ?? currentUser?.weekly_goal_km ?? 10;
  const privateProfile =
    data.privateProfile ?? Boolean(currentUser?.private_profile ?? false);

  db.prepare(`
    INSERT INTO users (
      id,
      email,
      display_name,
      photo_url,
      bio,
      location,
      weekly_goal_km,
      private_profile
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      photo_url = excluded.photo_url,
      bio = excluded.bio,
      location = excluded.location,
      weekly_goal_km = excluded.weekly_goal_km,
      private_profile = excluded.private_profile,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    email,
    displayName,
    photoURL,
    bio,
    location,
    weeklyGoalKm,
    privateProfile ? 1 : 0,
  );

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return userToResponse(user);
});

app.post("/runs", async (request, reply) => {
  const parsed = runSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "invalid_run",
      issues: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  ensureUser(data);

  const runId = randomUUID();

  db.prepare(`
    INSERT INTO runs (
      id,
      user_id,
      user_name,
      user_avatar,
      distance,
      time,
      duration_seconds,
      pace,
      calories,
      type,
      created_at_ms,
      route_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    runId,
    data.userId,
    data.userName,
    data.userAvatar ?? null,
    data.distance,
    data.time,
    data.durationSeconds,
    data.pace,
    data.calories,
    data.type,
    Date.now(),
    JSON.stringify(data.route),
  );

  db.prepare(`
    UPDATE users
    SET total_km = total_km + ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.distance, data.userId);

  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId);

  return reply.code(201).send(runToResponse(run));
});

app.get("/users/:userId/runs", async (request) => {
  const { userId } = request.params;
  const limit = Math.min(Number(request.query?.limit ?? 20), 100);

  const runs = db.prepare(`
    SELECT *
    FROM runs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);

  return runs.map(runToResponse);
});

app.get("/feed", async (request) => {
  const limit = Math.min(Number(request.query?.limit ?? 20), 100);
  const runs = db.prepare(`
    SELECT *
    FROM runs
    ORDER BY created_at_ms DESC
    LIMIT ?
  `).all(limit);

  return runs.map((run) => {
    const likes = db
      .prepare("SELECT user_id FROM activity_likes WHERE activity_id = ?")
      .all(run.id)
      .map((like) => like.user_id);

    return {
      ...runToResponse(run),
      likes,
    };
  });
});

app.post("/runs/:runId/likes", async (request, reply) => {
  const { runId } = request.params;
  const userId = request.body?.userId;
  const liked = Boolean(request.body?.liked);

  if (!userId) {
    return reply.code(400).send({
      error: "missing_user",
    });
  }

  if (liked) {
    db.prepare(`
      INSERT OR IGNORE INTO activity_likes (activity_id, user_id)
      VALUES (?, ?)
    `).run(runId, userId);
  } else {
    db.prepare(`
      DELETE FROM activity_likes
      WHERE activity_id = ? AND user_id = ?
    `).run(runId, userId);
  }

  const likes = db
    .prepare("SELECT user_id FROM activity_likes WHERE activity_id = ?")
    .all(runId)
    .map((like) => like.user_id);

  return {
    likes,
  };
});

app.delete("/runs/:runId", async (request, reply) => {
  const { runId } = request.params;
  const userId = request.query?.userId;

  if (!userId) {
    return reply.code(400).send({
      error: "missing_user",
    });
  }

  const run = db.prepare(`
    SELECT *
    FROM runs
    WHERE id = ? AND user_id = ?
  `).get(runId, userId);

  if (!run) {
    return reply.code(404).send({
      error: "run_not_found",
    });
  }

  db.prepare("DELETE FROM runs WHERE id = ?").run(run.id);

  db.prepare(`
    UPDATE users
    SET total_km = MAX(total_km - ?, 0), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(run.distance, userId);

  return {
    ok: true,
  };
});

app.delete("/users/:userId/runs", async (request) => {
  const { userId } = request.params;
  const result = db.prepare("DELETE FROM runs WHERE user_id = ?").run(userId);

  db.prepare(`
    UPDATE users
    SET total_km = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);

  return {
    ok: true,
    deletedCount: result.changes,
  };
});

app.get("/users/:userId/stats", async (request) => {
  const { userId } = request.params;
  const runs = db.prepare("SELECT * FROM runs WHERE user_id = ?").all(userId);

  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalDuration = runs.reduce((sum, run) => sum + run.duration_seconds, 0);
  const calories = runs.reduce((sum, run) => sum + run.calories, 0);
  const bestRun = runs.reduce((best, run) => {
    if (!best || run.distance > best.distance) return run;
    return best;
  }, null);

  const weeklyData = buildWeeklyData(runs);
  const lastActivity = runs
    .slice()
    .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0))[0];

  return {
    totalKm: totalDistance.toFixed(1),
    runsCount: runs.length,
    totalTime: formatTotalTime(totalDuration),
    totalCalories: calories,
    averagePace: formatPace(totalDuration, totalDistance),
    currentStreak: calculateCurrentStreak(runs),
    weeklyTotalKm: weeklyData.reduce((sum, day) => sum + day.km, 0),
    bestActivity: bestRun ? runToResponse(bestRun) : null,
    lastActivity: lastActivity ? runToResponse(lastActivity) : null,
    weeklyData,
  };
});

app.get("/groups", async () => {
  const groups = db.prepare(`
    SELECT *
    FROM groups
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  return groups.map(groupToResponse);
});

app.get("/leaderboard", async (request) => {
  const limit = Math.min(Number(request.query?.limit ?? 100), 500);
  const users = db.prepare(`
    SELECT
      u.*,
      COALESCE(SUM(r.distance), 0) AS leaderboard_km
    FROM users u
    LEFT JOIN runs r ON r.user_id = u.id
    WHERE u.private_profile = 0
    GROUP BY u.id
    ORDER BY leaderboard_km DESC
    LIMIT ?
  `).all(limit);

  return users.map((user) => ({
    ...userToResponse(user),
    monthlyKm: Number(user.leaderboard_km ?? 0),
  }));
});

app.post("/groups", async (request, reply) => {
  const parsed = groupSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "invalid_group",
      issues: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const groupId = randomUUID();

  db.prepare(`
    INSERT INTO groups (id, name, city, description, tag, created_by, creator_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    groupId,
    data.name,
    data.city,
    data.description,
    data.tag,
    data.createdBy,
    data.creatorName,
  );

  db.prepare(`
    INSERT OR IGNORE INTO group_members (group_id, user_id)
    VALUES (?, ?)
  `).run(groupId, data.createdBy);

  return groupToResponse(db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId));
});

app.post("/groups/:groupId/members", async (request, reply) => {
  const { groupId } = request.params;
  const userId = request.body?.userId;

  if (!userId) {
    return reply.code(400).send({
      error: "missing_user",
    });
  }

  db.prepare(`
    INSERT OR IGNORE INTO group_members (group_id, user_id)
    VALUES (?, ?)
  `).run(groupId, userId);

  return groupToResponse(db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId));
});

app.delete("/groups/:groupId/members/:userId", async (request) => {
  const { groupId, userId } = request.params;

  db.prepare(`
    DELETE FROM group_members
    WHERE group_id = ? AND user_id = ?
  `).run(groupId, userId);

  return {
    ok: true,
  };
});

app.get("/groups/:groupId/feed", async (request) => {
  const { groupId } = request.params;
  const limit = Math.min(Number(request.query?.limit ?? 20), 100);
  const runs = db.prepare(`
    SELECT *
    FROM runs
    WHERE user_id IN (
      SELECT user_id FROM group_members WHERE group_id = ?
    )
    ORDER BY created_at_ms DESC
    LIMIT ?
  `).all(groupId, limit);

  return runs.map(runToResponse);
});

app.get("/groups/:groupId/leaderboard", async (request) => {
  const { groupId } = request.params;

  const users = db.prepare(`
    SELECT
      u.*,
      COALESCE(SUM(r.distance), 0) AS leaderboard_km
    FROM users u
    JOIN group_members gm ON gm.user_id = u.id
    LEFT JOIN runs r ON r.user_id = u.id
    WHERE gm.group_id = ?
    GROUP BY u.id
    ORDER BY leaderboard_km DESC
    LIMIT 100
  `).all(groupId);

  return users.map((user) => ({
    ...userToResponse(user),
    monthlyKm: Number(user.leaderboard_km ?? 0),
  }));
});

app.get("/events", async (request) => {
  const city = request.query?.city?.toString().trim().toLowerCase();
  const events = city
    ? db.prepare(`
        SELECT *
        FROM events
        WHERE lower(city) = ?
        ORDER BY timestamp ASC
      `).all(city)
    : db.prepare(`
        SELECT *
        FROM events
        ORDER BY timestamp ASC
      `).all();

  return events.map(eventToResponse);
});

app.post("/events", async (request, reply) => {
  const parsed = eventSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: "invalid_event",
      issues: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const eventId = randomUUID();

  db.prepare(`
    INSERT INTO events (
      id, title, city, state, location, category, date, timestamp,
      image, price, official_url, source, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    data.title,
    data.city,
    data.state ?? null,
    data.location,
    data.category,
    data.date,
    data.timestamp,
    data.image ?? "",
    data.price ?? "",
    data.officialUrl ?? null,
    data.source ?? null,
    data.status,
  );

  return eventToResponse(db.prepare("SELECT * FROM events WHERE id = ?").get(eventId));
});

app.post("/events/:eventId/participants", async (request, reply) => {
  const { eventId } = request.params;
  const userId = request.body?.userId;

  if (!userId) {
    return reply.code(400).send({
      error: "missing_user",
    });
  }

  db.prepare(`
    INSERT OR IGNORE INTO event_participants (event_id, user_id)
    VALUES (?, ?)
  `).run(eventId, userId);

  return eventToResponse(db.prepare("SELECT * FROM events WHERE id = ?").get(eventId));
});

const close = async () => {
  await app.close();
    closeDatabase();
  };

process.on("SIGINT", close);
process.on("SIGTERM", close);

try {
  await app.listen({
    port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
