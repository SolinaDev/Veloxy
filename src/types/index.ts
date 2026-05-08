// ─── Veloxy — Types Centralizados ────────────────────────────────────────────
// Todas as interfaces ficam aqui para manter uma única fonte de verdade.
// Importar a partir daqui em vez de database.ts quando precisar apenas dos tipos.

import { Timestamp } from "firebase/firestore";
import { LucideIcon } from "lucide-react";

// ═══ USER ═══
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalXP: number;
  level: string;
  monthlyKm: number;
  monthlyKmMonth?: string;
  bio?: string;
  location?: string;
  onboarded?: boolean;
  enrolledEvents?: string[];
  createdAt?: Timestamp;
  lastUpdated?: Timestamp;
}

// ═══ ACTIVITY (CORRIDA) ═══
export interface ActivityData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  distance: number;
  time: string;
  durationSeconds: number;
  pace: string;
  calories?: number;
  type: string;
  likes?: string[];
  route?: [number, number][];
  xpGained?: number;
  timestamp?: Timestamp;
}

/** Atividade com ID do Firestore (resultado de uma query) */
export interface FeedActivity extends ActivityData {
  id: string;
}

// ═══ PRODUCT (LOJA) ═══
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number | null;
  rating: number;
  reviews: number;
  tag?: string | null;
  gradient: string;
  accent: string;
  emoji: string;
  externalUrl?: string;
}

// ═══ EVENT (CORRIDA / EVENTO) ═══
export interface RunningEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  city: string;
  participantsCount: number;
  participantsIds?: string[];
  category: string;
  image: string;
  price: string;
  timestamp: Date | Timestamp;
}

// ═══ STATS ═══
export interface UserStats {
  totalKm: string;
  runsCount: number;
  totalTime: string;
  totalCalories: number;
  lastActivity: FeedActivity | null;
  weeklyData: { day: string; km: number }[];
}

// ═══ GAMIFICATION ═══
export interface LevelInfo {
  currentLevel: string;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
}

// ═══ UI HELPERS ═══
export interface ActivityBadge {
  label: string;
  icon: React.ReactNode;
}

export interface TabIconProps {
  icon: LucideIcon;
  size: number;
}
