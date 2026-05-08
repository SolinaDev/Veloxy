import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import React from "react";
import { Award, Zap, Flame, TrendingUp } from "lucide-react";
import type { FeedActivity } from "@/types";
import type { Timestamp } from "firebase/firestore";

export const getActivityBadge = (distance: number): { label: string, icon: React.ReactNode } => {
  if (distance >= 21) return { label: "MEIA MARATONA!", icon: React.createElement(Award, { size: 10 }) };
  if (distance >= 10) return { label: "10K+ KM!",       icon: React.createElement(Flame, { size: 10 }) };
  if (distance >= 5)  return { label: "5K Atingido",    icon: React.createElement(Zap, { size: 10 }) };
  return              { label: "Em Forma",        icon: React.createElement(TrendingUp, { size: 10 }) };
};

export const initials = (name: string) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??";

export const formatCardDate = (timestamp: Timestamp | null | undefined | any) => {
  if (!timestamp) return "Agora mesmo";
  const date = timestamp.toDate ? timestamp.toDate() : new Date();
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  const absolute = format(date, "d MMM · HH:mm", { locale: ptBR });
  return `${relative} · ${absolute}`;
};

export const shareActivity = async (item: FeedActivity) => {
  const distanceFixed = Number(item.distance || 0).toFixed(2);
  const text = `🏃 ${item.userName} correu ${distanceFixed}km em ${item.time} com pace ${item.pace}/km! 🔥\n\nVeloxy Running App`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Veloxy Run", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a área de transferência!");
    }
  } catch {
    // cancelled
  }
};
