import type { ActivityData, FeedActivity, UserStats } from "@/types";
import { apiRequest } from "@/services/api/client";

export type ApiRun = FeedActivity & {
  createdAt: string;
  updatedAt: string;
};

export function saveRunToApi(data: ActivityData) {
  return apiRequest<ApiRun>("/runs", {
    method: "POST",
    body: {
      ...data,
      route: data.route ?? [],
    },
  });
}

export function getUserRunsFromApi(userId: string, limit = 20) {
  return apiRequest<ApiRun[]>(
    `/users/${encodeURIComponent(userId)}/runs?limit=${limit}`,
  );
}

export function deleteRunFromApi(runId: string, userId: string) {
  return apiRequest<{ ok: boolean }>(
    `/runs/${encodeURIComponent(runId)}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
}

export function getUserStatsFromApi(userId: string) {
  return apiRequest<UserStats>(
    `/users/${encodeURIComponent(userId)}/stats`,
  );
}
