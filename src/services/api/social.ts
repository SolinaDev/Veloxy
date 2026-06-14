import type { FeedActivity, RunningEvent, RunningGroup, UserProfile } from "@/types";
import { apiRequest } from "@/services/api/client";

export function getFeedFromApi(limit = 20) {
  return apiRequest<FeedActivity[]>(`/feed?limit=${limit}`);
}

export function toggleLikeInApi(
  activityId: string,
  userId: string,
  liked: boolean,
) {
  return apiRequest<{ likes: string[] }>(
    `/runs/${encodeURIComponent(activityId)}/likes`,
    {
      method: "POST",
      body: {
        userId,
        liked,
      },
    },
  );
}

export function getGroupsFromApi() {
  return apiRequest<RunningGroup[]>("/groups");
}

export function createGroupInApi(data: {
  name: string;
  city: string;
  description: string;
  tag: string;
  createdBy: string;
  creatorName: string;
}) {
  return apiRequest<RunningGroup>("/groups", {
    method: "POST",
    body: data,
  });
}

export function joinGroupInApi(groupId: string, userId: string) {
  return apiRequest<RunningGroup>(
    `/groups/${encodeURIComponent(groupId)}/members`,
    {
      method: "POST",
      body: {
        userId,
      },
    },
  );
}

export function leaveGroupInApi(groupId: string, userId: string) {
  return apiRequest<{ ok: boolean }>(
    `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
}

export function getGroupFeedFromApi(groupId: string, limit = 20) {
  return apiRequest<FeedActivity[]>(
    `/groups/${encodeURIComponent(groupId)}/feed?limit=${limit}`,
  );
}

export function getGroupLeaderboardFromApi(groupId: string) {
  return apiRequest<UserProfile[]>(
    `/groups/${encodeURIComponent(groupId)}/leaderboard`,
  );
}

export function getGlobalLeaderboardFromApi(limit = 100) {
  return apiRequest<UserProfile[]>(`/leaderboard?limit=${limit}`);
}

export function getEventsFromApi(city?: string) {
  const query = city ? `?city=${encodeURIComponent(city)}` : "";
  return apiRequest<RunningEvent[]>(`/events${query}`);
}

export function joinEventInApi(eventId: string, userId: string) {
  return apiRequest<RunningEvent>(
    `/events/${encodeURIComponent(eventId)}/participants`,
    {
      method: "POST",
      body: {
        userId,
      },
    },
  );
}
