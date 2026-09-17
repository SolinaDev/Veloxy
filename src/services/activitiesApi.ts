import { api, ApiError } from "@/services/apiClient";
import { toDateSafe } from "@/lib/feed-utils";
import type { ActivityData, FeedActivity } from "@/types";

// Fase 1: os 3 chamadores passam objetos já tipados vindos da API (não mais
// dados brutos de documento do Firestore), por isso o parâmetro aceita
// FeedActivity diretamente em vez de Record<string, unknown>.
// Exportado porque groupsApi.ts tambem normaliza atividades (feed de grupo).
export function normalizeActivity(docId: string, data: FeedActivity): FeedActivity {
  return {
    ...data,
    id: docId,
    createdAtMs: typeof data.createdAtMs === "number" ? data.createdAtMs : undefined,
  };
}

function formatPace(totalSeconds: number, totalKm: number) {
  if (totalKm <= 0 || totalSeconds <= 0) return "0'00\"";
  const secondsPerKm = Math.round(totalSeconds / totalKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}'${seconds.toString().padStart(2, "0")}"`;
}

function dayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateCurrentStreak(activeDays: Set<string>) {
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

// Salvar uma nova atividade (corrida)
// Fase 1 da migração: activities, XP/petCoins e weeklyKm dos grupos do
// usuário agora são tudo tratado dentro de POST /activities no backend
// próprio (ver backend/app/routers/activities.py) — não precisa mais de uma
// segunda chamada para atualizar os grupos depois de salvar a corrida.
export const saveActivity = async (data: ActivityData) => {
  return api.post<{ id: string; xpUpdateFailed: boolean }>("/activities", data);
};

export const deleteUserActivities = async (userId: string): Promise<number> => {
  const { deleted_count: deletedCount } = await api.delete<{ deleted_count: number }>(
    `/activities/user/${userId}/all`
  );
  return deletedCount;
};

export const deleteUserActivity = async (activityId: string, userId: string) => {
  try {
    await api.delete(`/activities/${activityId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Corrida não encontrada para este usuário.");
    }
    throw error;
  }
  void userId; // mantido na assinatura por compatibilidade com os chamadores existentes
};

// Feed de atividades — Fase 1: sem onSnapshot ainda (real-time via WebSocket
// é a Fase 2 do plano de migração). Por enquanto, poll simples a cada 15s.
// Interface mantida igual (retorna uma função de "unsubscribe") para não
// exigir mudanças nos componentes que já consomem isso.
export const subscribeToFeed = (
  callback: (activities: FeedActivity[]) => void,
  limitCount = 10
) => {
  let cancelled = false;

  const fetchFeed = async () => {
    try {
      const activities = await api.get<FeedActivity[]>(`/activities/feed?limit=${limitCount}`);
      if (!cancelled) callback(activities);
    } catch (error) {
      console.error("Erro ao buscar feed:", error);
    }
  };

  fetchFeed();
  const intervalId = setInterval(fetchFeed, 15_000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

// Buscar atividades mais antigas (paginação cursor-based pelo id numérico)
export const loadMoreActivities = async (
  lastId: FeedActivity["id"],
  limitCount = 10
): Promise<FeedActivity[]> => {
  try {
    return await api.get<FeedActivity[]>(`/activities/feed?limit=${limitCount}&before_id=${lastId}`);
  } catch (error) {
    console.error("Erro ao carregar mais atividades:", error);
    return [];
  }
};

// Curtir/Descurtir uma atividade
export const toggleLike = async (activityId: string, userId: string, isLiked: boolean) => {
  try {
    await api.post(`/activities/${activityId}/like`, { isLiked });
  } catch (error) {
    console.error("Erro ao dar like:", error);
    throw error;
  }
  void userId; // mantido na assinatura: quem curte é sempre o usuario autenticado no backend
};

// Buscar estatísticas completas do usuário — Fase 1: activities vem do
// backend próprio. limit=100000 pede "todas" (backend não tem endpoint
// dedicado de contagem ainda; volume de corridas por usuário é pequeno).
export const getUserStats = async (userId: string) => {
  try {
    const rawActivities = await api.get<FeedActivity[]>(`/activities/user/${userId}?limit=100000`);
    const activities = rawActivities
      .map((activity) => normalizeActivity(activity.id, activity))
      .sort((a, b) => {
        const dateA = toDateSafe(a.timestamp)?.getTime() ?? a.createdAtMs ?? 0;
        const dateB = toDateSafe(b.timestamp)?.getTime() ?? b.createdAtMs ?? 0;
        return dateB - dateA;
      });

    let totalKm = 0;
    let runsCount = 0;
    let totalSeconds = 0;
    let totalCalories = 0;
    let lastActivity: (ActivityData & { id: string }) | null = null;
    let bestActivity: FeedActivity | null = null;
    let hasHourLongRun = false;
    let hasSub10kRun = false;
    let dawnRunsCount = 0;
    let nightRunsCount = 0;
    const activeDays = new Set<string>();

    // Montar mapa dos últimos 7 dias (YYYY-MM-DD -> km)
    const weekMap: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      weekMap[dayKeyFromDate(d)] = 0;
    }

    activities.forEach((activity) => {
      const distance = Number(activity.distance || 0);
      totalKm += distance;
      totalSeconds += Number(activity.durationSeconds || 0);
      totalCalories += Number(activity.calories || 0);
      runsCount += 1;

      // Primeira iteração = mais recente (ordenado desc)
      if (!lastActivity) {
        lastActivity = activity;
      }

      if (!bestActivity || distance > bestActivity.distance) {
        bestActivity = activity;
      }

      const durationSeconds = Number(activity.durationSeconds || 0);
      if (durationSeconds >= 3600) hasHourLongRun = true;
      if (distance >= 10 && durationSeconds > 0 && durationSeconds <= 3600) hasSub10kRun = true;

      // Acumular km no dia correto para o gráfico semanal
      if (activity.timestamp || typeof activity.createdAtMs === "number") {
        const activityDate = toDateSafe(activity.timestamp) ?? new Date(activity.createdAtMs || 0);
        const dateKey = dayKeyFromDate(activityDate);
        activeDays.add(dateKey);
        if (dateKey in weekMap) {
          weekMap[dateKey] += distance;
        }

        // Amanhecer: 4h-7h. Noite: 20h-4h. Usado pelas conquistas "10 amanheceres"/"10 noites".
        const hour = activityDate.getHours();
        if (hour >= 4 && hour < 7) dawnRunsCount += 1;
        else if (hour >= 20 || hour < 4) nightRunsCount += 1;
      }
    });

    // Formatar tempo total (ex: 4h 12m)
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Converter weekMap para array ordenado por dia
    const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const weeklyData = Object.entries(weekMap).map(([dateStr, km]) => {
      const d = new Date(dateStr + "T12:00:00");
      return { day: DAY_LABELS[d.getDay()], km: Number(km.toFixed(2)) };
    });
    const weeklyTotalKm = weeklyData.reduce((sum, day) => sum + day.km, 0);

    return {
      totalKm: totalKm.toFixed(1),
      runsCount,
      totalTime: formattedTime,
      totalCalories: Math.round(totalCalories),
      averagePace: formatPace(totalSeconds, totalKm),
      currentStreak: calculateCurrentStreak(activeDays),
      weeklyTotalKm: Number(weeklyTotalKm.toFixed(2)),
      bestActivity,
      lastActivity,
      weeklyData,
      hasHourLongRun,
      hasSub10kRun,
      dawnRunsCount,
      nightRunsCount,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return {
      totalKm: "0.0",
      runsCount: 0,
      totalTime: "0m",
      totalCalories: 0,
      averagePace: "0'00\"",
      currentStreak: 0,
      weeklyTotalKm: 0,
      bestActivity: null,
      lastActivity: null,
      weeklyData: [],
      hasHourLongRun: false,
      hasSub10kRun: false,
      dawnRunsCount: 0,
      nightRunsCount: 0,
    };
  }
};

export const getUserActivities = async (userId: string, limitCount = 10): Promise<FeedActivity[]> => {
  try {
    const activities = await api.get<FeedActivity[]>(`/activities/user/${userId}?limit=${limitCount}`);
    return activities.map((activity) => normalizeActivity(activity.id, activity));
  } catch (error) {
    console.error("Erro ao buscar corridas do usuario:", error);
    return [];
  }
};
