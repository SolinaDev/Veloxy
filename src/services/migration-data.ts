import {
  deleteUserActivity,
  getUserActivities,
  getUserStats,
} from "@/services/database";
import { isOwnApiEnabled } from "@/services/api/client";
import {
  deleteRunFromApi,
  getUserRunsFromApi,
  getUserStatsFromApi,
} from "@/services/api/runs";

export async function getMigratedUserStats(userId: string) {
  if (!isOwnApiEnabled) {
    return getUserStats(userId);
  }

  try {
    return await getUserStatsFromApi(userId);
  } catch (error) {
    console.warn("Falha ao carregar stats da API propria, usando Firebase:", error);
    return getUserStats(userId);
  }
}

export async function getMigratedUserActivities(userId: string, limit = 10) {
  if (!isOwnApiEnabled) {
    return getUserActivities(userId, limit);
  }

  try {
    return await getUserRunsFromApi(userId, limit);
  } catch (error) {
    console.warn("Falha ao carregar corridas da API propria, usando Firebase:", error);
    return getUserActivities(userId, limit);
  }
}

export async function deleteMigratedUserActivity(activityId: string, userId: string) {
  if (!isOwnApiEnabled) {
    return deleteUserActivity(activityId, userId);
  }

  try {
    await deleteRunFromApi(activityId, userId);
  } catch (error) {
    console.warn("Falha ao apagar corrida na API propria, tentando Firebase:", error);
    await deleteUserActivity(activityId, userId);
  }
}
