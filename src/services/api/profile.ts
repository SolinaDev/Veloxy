import type { UserProfile } from "@/types";
import { apiRequest } from "@/services/api/client";

export type UpdateProfilePayload = {
  displayName?: string;
  email?: string | null;
  photoURL?: string | null;
  bio?: string | null;
  location?: string | null;
  weeklyGoalKm?: number;
  privateProfile?: boolean;
};

export function getProfileFromApi(userId: string) {
  return apiRequest<UserProfile>(`/users/${encodeURIComponent(userId)}`);
}

export function updateProfileInApi(
  userId: string,
  payload: UpdateProfilePayload,
) {
  return apiRequest<UserProfile>(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: payload,
  });
}
