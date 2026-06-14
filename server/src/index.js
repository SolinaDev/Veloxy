import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { closeDatabase, db } from "./database.js";

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

await app.register(cors, {
  origin: [appOrigin, "http://localhost:4173"],
});

app.get("/health", async () => ({
  ok: true,
  service: "veloxy-api",
}));

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
