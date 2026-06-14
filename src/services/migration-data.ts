import {
  deleteUserActivity,
  getUserActivities,
  getUserStats,
} from "@/services/database";
import { isOwnApiEnabled } from "@/services/api/client";
import {
  deleteRunFromApi,
  deleteUserRunsFromApi,
  getUserRunsFromApi,
  getUserStatsFromApi,
} from "@/services/api/runs";
import {
  getProfileFromApi,
  updateProfileInApi,
  type UpdateProfilePayload,
} from "@/services/api/profile";
import { getUserProfile } from "@/services/database";
import {
  createGroup,
  getEvents,
  getGlobalRanking,
  getGroupActivities,
  getGroupLeaderboard,
  getGroups,
  joinEvent,
  joinGroup,
  leaveGroup,
  loadMoreActivities,
  toggleLike,
} from "@/services/database";
import {
  createGroupInApi,
  getEventsFromApi,
  getFeedFromApi,
  getGroupFeedFromApi,
  getGroupLeaderboardFromApi,
  getGlobalLeaderboardFromApi,
  getGroupsFromApi,
  joinEventInApi,
  joinGroupInApi,
  leaveGroupInApi,
  toggleLikeInApi,
} from "@/services/api/social";
import type { RunningGroup, UserProfile } from "@/types";

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

export async function deleteMigratedUserActivities(userId: string) {
  if (!isOwnApiEnabled) {
    return deleteUserActivities(userId);
  }

  try {
    const result = await deleteUserRunsFromApi(userId);
    return result.deletedCount;
  } catch (error) {
    console.warn("Falha ao apagar corridas na API propria, tentando Firebase:", error);
    return deleteUserActivities(userId);
  }
}

export async function getMigratedUserProfile(userId: string) {
  if (!isOwnApiEnabled) {
    return getUserProfile(userId);
  }

  try {
    return await getProfileFromApi(userId);
  } catch (error) {
    console.warn("Falha ao carregar perfil da API propria, usando Firebase:", error);
    return getUserProfile(userId);
  }
}

export async function updateMigratedUserProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile | null> {
  if (!isOwnApiEnabled) return null;

  try {
    return await updateProfileInApi(userId, payload);
  } catch (error) {
    console.warn("Falha ao atualizar perfil na API propria:", error);
    return null;
  }
}

export async function getMigratedFeed(limit = 20) {
  if (!isOwnApiEnabled) return loadMoreActivities(limit);

  try {
    return await getFeedFromApi(limit);
  } catch (error) {
    console.warn("Falha ao carregar feed da API propria, usando Firebase:", error);
    return loadMoreActivities(limit);
  }
}

export async function toggleMigratedLike(
  activityId: string,
  userId: string,
  isLiked: boolean,
) {
  if (!isOwnApiEnabled) {
    return toggleLike(activityId, userId, isLiked);
  }

  try {
    await toggleLikeInApi(activityId, userId, !isLiked);
  } catch (error) {
    console.warn("Falha ao curtir na API propria, tentando Firebase:", error);
    await toggleLike(activityId, userId, isLiked);
  }
}

export async function getMigratedGroups() {
  if (!isOwnApiEnabled) return getGroups();

  try {
    return await getGroupsFromApi();
  } catch (error) {
    console.warn("Falha ao carregar grupos da API propria, usando Firebase:", error);
    return getGroups();
  }
}

export async function createMigratedGroup(data: {
  name: string;
  city: string;
  description: string;
  tag: string;
  createdBy: string;
  creatorName: string;
}) {
  const firebasePayload = {
    name: data.name,
    city: data.city,
    description: data.description,
    tag: data.tag,
    userId: data.createdBy,
    userName: data.creatorName,
  };

  if (!isOwnApiEnabled) return createGroup(firebasePayload);

  try {
    return await createGroupInApi(data);
  } catch (error) {
    console.warn("Falha ao criar grupo na API propria, usando Firebase:", error);
    return createGroup(firebasePayload);
  }
}

export async function joinMigratedGroup(groupId: string, userId: string) {
  if (!isOwnApiEnabled) return joinGroup(groupId, userId);

  try {
    return await joinGroupInApi(groupId, userId);
  } catch (error) {
    console.warn("Falha ao entrar no grupo na API propria, usando Firebase:", error);
    return joinGroup(groupId, userId);
  }
}

export async function leaveMigratedGroup(groupId: string, userId: string) {
  if (!isOwnApiEnabled) return leaveGroup(groupId, userId);

  try {
    await leaveGroupInApi(groupId, userId);
  } catch (error) {
    console.warn("Falha ao sair do grupo na API propria, usando Firebase:", error);
    await leaveGroup(groupId, userId);
  }
}

export async function getMigratedGroupFeed(group: RunningGroup, limit = 20) {
  if (!isOwnApiEnabled) return getGroupActivities(group, limit);

  try {
    return await getGroupFeedFromApi(group.id, limit);
  } catch (error) {
    console.warn("Falha ao carregar feed do grupo na API propria, usando Firebase:", error);
    return getGroupActivities(group, limit);
  }
}

export async function getMigratedGroupLeaderboard(group: RunningGroup) {
  if (!isOwnApiEnabled) return getGroupLeaderboard(group);

  try {
    return await getGroupLeaderboardFromApi(group.id);
  } catch (error) {
    console.warn("Falha ao carregar ranking do grupo na API propria, usando Firebase:", error);
    return getGroupLeaderboard(group);
  }
}

export async function getMigratedEvents(city?: string) {
  if (!isOwnApiEnabled) return getEvents(city);

  try {
    return await getEventsFromApi(city);
  } catch (error) {
    console.warn("Falha ao carregar eventos da API propria, usando Firebase:", error);
    return getEvents(city);
  }
}

export async function joinMigratedEvent(eventId: string, userId: string) {
  if (!isOwnApiEnabled) return joinEvent(eventId, userId);

  try {
    return await joinEventInApi(eventId, userId);
  } catch (error) {
    console.warn("Falha ao entrar no evento na API propria, usando Firebase:", error);
    return joinEvent(eventId, userId);
  }
}

export async function getMigratedGlobalRanking(limit = 100) {
  if (!isOwnApiEnabled) return getGlobalRanking(limit);

  try {
    return await getGlobalLeaderboardFromApi(limit);
  } catch (error) {
    console.warn("Falha ao carregar ranking da API propria, usando Firebase:", error);
    return getGlobalRanking(limit);
  }
}
