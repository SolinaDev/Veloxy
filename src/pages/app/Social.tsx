import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  Loader2,
  MapPin,
  Rss,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Feed from "@/pages/app/Feed";
import Events from "@/pages/app/Events";
import { getGlobalRanking } from "@/services/database";
import type { UserProfile } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import SafeAvatar from "@/components/SafeAvatar";
import { getBestUserPhotoURL } from "@/lib/user-photo";

type SocialTab = "feed" | "leaderboard" | "groups" | "events";

const RANKING_STEP = 100;
const RANKING_CAP = 500;

const socialTabs: Array<{ id: SocialTab; label: string; icon: typeof Rss }> = [
  { id: "feed", label: "Feed", icon: Rss },
  { id: "leaderboard", label: "Ranking", icon: Trophy },
  { id: "groups", label: "Grupos", icon: Users },
  { id: "events", label: "Eventos", icon: Calendar },
];

const communities = [
  {
    id: "sp-runners",
    name: "Sao Paulo Runners",
    city: "Sao Paulo, SP",
    members: 128,
    weeklyKm: 842,
    tag: "Urbano",
  },
  {
    id: "5k-iniciantes",
    name: "5K Iniciantes",
    city: "Brasil",
    members: 94,
    weeklyKm: 318,
    tag: "Comecando",
  },
  {
    id: "treino-noturno",
    name: "Treino Noturno",
    city: "Online",
    members: 76,
    weeklyKm: 454,
    tag: "Noite",
  },
  {
    id: "longao-domingo",
    name: "Longao de Domingo",
    city: "Brasil",
    members: 63,
    weeklyKm: 611,
    tag: "Longo",
  },
];

function getJoinedGroupsKey(userId?: string) {
  return `veloxy_joined_groups_${userId || "guest"}`;
}

export default function Social() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [rankingLimit, setRankingLimit] = useState(RANKING_STEP);
  const [ranking, setRanking] = useState<UserProfile[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);

  const displayName = user?.displayName || "Corredor";
  const userPhotoURL = getBestUserPhotoURL(user);
  const joinedKey = getJoinedGroupsKey(user?.uid);

  useEffect(() => {
    try {
      setJoinedGroups(JSON.parse(localStorage.getItem(joinedKey) || "[]"));
    } catch {
      setJoinedGroups([]);
    }
  }, [joinedKey]);

  useEffect(() => {
    if (activeTab !== "leaderboard") return;
    let cancelled = false;

    const loadRanking = async () => {
      setRankingLoading(true);
      try {
        const data = await getGlobalRanking(rankingLimit);
        if (!cancelled) setRanking(data);
      } finally {
        if (!cancelled) setRankingLoading(false);
      }
    };

    loadRanking();
    return () => {
      cancelled = true;
    };
  }, [activeTab, rankingLimit]);

  const userPosition = useMemo(() => {
    if (!user) return null;
    const index = ranking.findIndex((item) => item.uid === user.uid);
    return index >= 0 ? index + 1 : null;
  }, [ranking, user]);

  const toggleGroup = (groupId: string) => {
    setJoinedGroups((prev) => {
      const next = prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      localStorage.setItem(joinedKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 safe-top">
      <header className="sticky top-0 z-50 border-b border-zinc-900/60 bg-black/90 px-5 py-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SafeAvatar
              src={userPhotoURL}
              name={displayName}
              alt="Perfil"
              className="h-11 w-11 rounded-full border border-purple-500/30 bg-zinc-900"
            />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-600">Veloxy</p>
              <h1 className="font-display text-2xl font-black italic tracking-tighter text-purple-500">SOCIAL</h1>
            </div>
          </div>

          <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-300">Ranking</p>
            <p className="text-xs font-black text-white">{userPosition ? `#${userPosition}` : "--"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {socialTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[9px] font-black uppercase transition ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.28)]"
                  : "premium-panel text-zinc-500"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="px-5 pt-6"
        >
          {activeTab === "feed" && <Feed embedded />}
          {activeTab === "leaderboard" && (
            <section>
              <div className="mb-5 rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-300">Leaderboard</p>
                    <h2 className="mt-1 font-display text-3xl font-black italic">Top corredores</h2>
                  </div>
                  <Trophy size={28} className="text-purple-400" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Carrega 100 atletas por vez, com limite inicial de 500 para manter a tela leve.
                </p>
              </div>

              <div className="space-y-3">
                {rankingLoading && ranking.length === 0 ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="rounded-[2rem] premium-panel p-10 text-center">
                    <Trophy className="mx-auto text-zinc-700" size={36} />
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Ranking vazio por enquanto</p>
                  </div>
                ) : (
                  ranking.map((athlete, index) => (
                    <div
                      key={athlete.uid}
                      className={`flex items-center gap-4 rounded-[1.5rem] p-4 ${
                        athlete.uid === user?.uid
                          ? "border border-purple-500/35 bg-purple-500/10"
                          : "premium-panel"
                      }`}
                    >
                      <div className="w-8 text-center font-display text-xl font-black italic text-purple-400">
                        {index + 1}
                      </div>
                      <SafeAvatar
                        src={athlete.photoURL}
                        name={athlete.displayName || "Atleta"}
                        className="h-11 w-11 rounded-2xl bg-zinc-900"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{athlete.displayName || "Atleta"}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                          {athlete.level || "Iniciante"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-black italic text-white">
                          {(athlete.totalXP || 0).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-purple-400">XP</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {ranking.length > 0 && rankingLimit < RANKING_CAP && (
                <button
                  onClick={() => setRankingLimit((value) => Math.min(value + RANKING_STEP, RANKING_CAP))}
                  disabled={rankingLoading}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl premium-panel py-4 text-xs font-black uppercase tracking-widest text-zinc-300 disabled:opacity-60"
                >
                  {rankingLoading ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <ChevronDown size={14} className="text-purple-500" />}
                  Ver mais
                </button>
              )}
            </section>
          )}

          {activeTab === "groups" && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Comunidades</p>
                  <h2 className="mt-1 font-display text-3xl font-black italic">Grupos de corrida</h2>
                </div>
                <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[10px] font-black text-purple-300">
                  {joinedGroups.length} ativo{joinedGroups.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="space-y-4">
                {communities.map((group) => {
                  const joined = joinedGroups.includes(group.id);
                  return (
                    <div key={group.id} className="rounded-[2rem] premium-panel p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                            <Users size={24} />
                          </div>
                          <div>
                            <p className="font-display text-xl font-black italic">{group.name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              <MapPin size={11} className="text-purple-500" />
                              {group.city}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[9px] font-black uppercase text-purple-300">
                          {group.tag}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-black/30 p-3">
                          <p className="font-display text-2xl font-black italic">{group.members + (joined ? 1 : 0)}</p>
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">membros</p>
                        </div>
                        <div className="rounded-2xl bg-black/30 p-3">
                          <p className="font-display text-2xl font-black italic">{group.weeklyKm}</p>
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">km semanais</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition ${
                          joined
                            ? "border border-green-500/30 bg-green-500/10 text-green-400"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        <Zap size={14} />
                        {joined ? "Participando" : "Entrar no grupo"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "events" && <Events embedded />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
