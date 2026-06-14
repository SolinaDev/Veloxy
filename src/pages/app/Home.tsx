import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Flame,
  Loader2,
  MapPin,
  Timer,
  Trophy,
  Trash2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { deleteUserActivity, getUserActivities, getUserStats } from "@/services/database";
import type { FeedActivity, UserStats } from "@/types";
import { toDateSafe } from "@/lib/feed-utils";
import SafeAvatar from "@/components/SafeAvatar";
import { getBestUserPhotoURL } from "@/lib/user-photo";
import { toast } from "sonner";

const EMPTY_STATS: UserStats = {
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
};

function formatRunDate(activity: FeedActivity) {
  const date = toDateSafe(activity.timestamp) ?? (
    typeof activity.createdAtMs === "number" ? new Date(activity.createdAtMs) : null
  );
  if (!date) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const displayName = user?.displayName || "Corredor";
  const firstName = displayName.split(" ")[0] || "Corredor";
  const userPhotoURL = getBestUserPhotoURL(user);

  const loadHomeData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsData, runs] = await Promise.all([
        getUserStats(user.uid),
        getUserActivities(user.uid, 8),
      ]);
      setStats(statsData);
      setActivities(runs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleDeleteRun = async (run: FeedActivity) => {
    if (!user) return;

    if (confirmDeleteId !== run.id) {
      setConfirmDeleteId(run.id);
      toast.warning("Toque na lixeira novamente para apagar esta corrida.");
      return;
    }

    setDeletingId(run.id);
    try {
      await deleteUserActivity(run.id, user.uid);
      setConfirmDeleteId(null);
      toast.success("Corrida apagada.");
      await loadHomeData();
    } catch (error) {
      console.error("Erro ao apagar corrida:", error);
      const message = error instanceof Error ? error.message : "Não foi possível apagar esta corrida.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const maxKm = Math.max(...stats.weeklyData.map((day) => day.km), 1);
  const lastRun = stats.lastActivity;

  const summaryCards = useMemo(() => [
    { label: "Semana", value: stats.weeklyTotalKm.toFixed(1), unit: "km", icon: TrendingIcon },
    { label: "Ritmo medio", value: stats.averagePace, unit: "/km", icon: Timer },
    { label: "Sequencia", value: stats.currentStreak.toString(), unit: stats.currentStreak === 1 ? "dia" : "dias", icon: Zap },
    { label: "Calorias", value: stats.totalCalories.toString(), unit: "kcal", icon: Flame },
  ], [stats]);

  return (
    <div className="app-shell pb-28 safe-top">
      <header className="app-header sticky top-0 z-40 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/profile")}
            className="h-11 w-11 overflow-hidden rounded-full border border-purple-500/30 bg-zinc-900 flex items-center justify-center"
          >
            <SafeAvatar
              src={userPhotoURL}
              name={displayName}
              alt="Perfil"
              className="h-full w-full rounded-full"
              fallbackClassName="text-xs font-black text-purple-500"
            />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">Veloxy</p>
            <h1 className="font-display text-2xl font-black italic tracking-tighter text-purple-500">
              INICIO
            </h1>
          </div>
          <div className="h-11 w-11" aria-hidden="true" />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-purple-500" size={36} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-600">Carregando corridas</p>
        </div>
      ) : (
        <>
          <section className="px-6 pt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Suas corridas</p>
            <h2 className="mt-2 font-display text-4xl font-black italic uppercase tracking-tighter">
              Bora, {firstName}
            </h2>

            <div className="hero-card mt-6 rounded-[2.5rem] p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-300">Distancia total</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-display text-6xl font-black italic leading-none text-white">{stats.totalKm}</span>
                    <span className="mb-2 text-xs font-black uppercase text-purple-400">km</span>
                  </div>
                </div>
                <div className="hero-icon flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Activity size={24} />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  { label: "Corridas", value: stats.runsCount },
                  { label: "Tempo", value: stats.totalTime },
                  { label: "Melhor", value: stats.bestActivity ? `${stats.bestActivity.distance.toFixed(1)}km` : "0km" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl premium-panel p-3">
                    <p className="font-display text-xl font-black italic leading-none">{item.value}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 px-6">
            {summaryCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-[1.8rem] premium-panel p-4"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <card.icon size={17} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{card.label}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-black italic">{card.value}</span>
                  <span className="text-[9px] font-black uppercase text-purple-500">{card.unit}</span>
                </div>
              </motion.div>
            ))}
          </section>

          <section className="mt-8 px-6">
            <div className="rounded-[2.2rem] premium-panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Ultimos 7 dias</p>
                  <h3 className="mt-1 font-display text-xl font-black italic">Progresso semanal</h3>
                </div>
                <div className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-black text-purple-400">
                  {stats.weeklyTotalKm.toFixed(1)} km
                </div>
              </div>
              <div className="flex h-28 items-end gap-3">
                {stats.weeklyData.map((day) => (
                  <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 4 }}
                      animate={{ height: Math.max(6, (day.km / maxKm) * 96) }}
                      className={`w-full rounded-full ${day.km > 0 ? "bg-purple-500" : "bg-zinc-800"}`}
                    />
                    <span className="text-[8px] font-black text-zinc-500">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 px-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black italic uppercase">Corridas recentes</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Somente suas</span>
            </div>

            <div className="mt-4 space-y-3">
              {activities.length === 0 ? (
                <div className="rounded-[2rem] premium-panel p-8 text-center">
                  <Trophy size={34} className="mx-auto text-zinc-700" />
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Nenhuma corrida salva ainda</p>
                  <button
                    onClick={() => navigate("/run")}
                    className="mt-5 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white"
                  >
                    Comecar corrida
                  </button>
                </div>
              ) : (
                activities.map((run) => (
                  <div
                    key={run.id}
                    className={`w-full rounded-[1.6rem] premium-panel p-4 text-left transition ${
                      confirmDeleteId === run.id ? "border-red-500/40 bg-red-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => navigate("/stats")}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{formatRunDate(run)}</p>
                        <p className="mt-1 font-display text-xl font-black italic text-white">Corrida</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/stats")}
                        className="text-right"
                      >
                        <p className="font-display text-2xl font-black italic text-purple-400">{run.distance.toFixed(2)}</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">km</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRun(run)}
                        disabled={deletingId === run.id}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 disabled:opacity-60 ${
                          confirmDeleteId === run.id
                            ? "border-red-500/50 bg-red-500/15 text-red-400"
                            : "border-zinc-800 bg-black/30 text-zinc-500 hover:border-red-500/35 hover:text-red-400"
                        }`}
                        aria-label="Apagar corrida"
                      >
                        {deletingId === run.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800/70 pt-4">
                      {[
                        { label: "Pace", value: run.pace, icon: Timer },
                        { label: "Tempo", value: run.time, icon: BarChart3 },
                        { label: "Kcal", value: (run.calories ?? 0).toString(), icon: Flame },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-zinc-400">
                          <item.icon size={13} className="text-purple-500" />
                          <div>
                            <p className="text-xs font-black">{item.value}</p>
                            <p className="text-[8px] uppercase tracking-[0.15em] text-zinc-600">{item.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TrendingIcon(props: React.ComponentProps<typeof MapPin>) {
  return <MapPin {...props} />;
}
