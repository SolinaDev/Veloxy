import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, TrendingUp, Zap, Timer,
  Loader2, Play, Search, X, Users,
  RotateCw, ChevronDown,
} from "lucide-react";
import { subscribeToFeed, toggleLike, getUserStats, loadMoreActivities } from "@/service/database";
import type { FeedActivity } from "@/types";
import { useAuth } from "@/hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Custom Hooks & Utils
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { initials } from "@/lib/feed-utils";
import ActivityCard from "@/components/ActivityCard";
import { Skeleton } from "@/components/ui/skeleton";

const FEED_LIMIT = 10;
const PULL_THRESHOLD = 70;

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [liveActivities, setLiveActivities] = useState<FeedActivity[]>([]);
  const [moreActivities, setMoreActivities] = useState<FeedActivity[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalKm: "0.0", runsCount: 0, totalTime: "0m" });
  const [query, setQuery] = useState("");
  const [lastSeenLikes, setLastSeenLikes] = useState(0);

  const displayName = user?.displayName || "Corredor";

  // Merge live + older, deduplicate by id
  const activities = useMemo(() => {
    const seen = new Set<string>();
    return [...liveActivities, ...moreActivities].filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [liveActivities, moreActivities]);

  const userLikeCount = useMemo(
    () => activities.filter((a) => a.userId === user?.uid).reduce((sum, a) => sum + (a.likes?.length || 0), 0),
    [activities, user?.uid]
  );
  const hasNewLikes = userLikeCount > lastSeenLikes;

  useEffect(() => {
    if (!user) return;
    const stored = parseInt(localStorage.getItem(`veloxy_lastlikes_${user.uid}`) || "0");
    setLastSeenLikes(stored);
    getUserStats(user.uid).then((s) =>
      setStats({ totalKm: s.totalKm, runsCount: s.runsCount, totalTime: s.totalTime })
    );
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToFeed((data) => {
      setLiveActivities(data);
      setLoading(false);
    }, FEED_LIMIT);
    return () => unsub();
  }, []);

  const handleBellClick = () => {
    if (!user) return;
    localStorage.setItem(`veloxy_lastlikes_${user.uid}`, userLikeCount.toString());
    setLastSeenLikes(userLikeCount);
    if (userLikeCount > 0) {
      toast.success(`❤️ Suas atividades têm ${userLikeCount} curtida${userLikeCount !== 1 ? 's' : ''} no total!`);
    } else {
      toast.info("Nenhuma curtida ainda. Vai correr! 🏃");
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    const lastItem = activities[activities.length - 1];
    if (!lastItem?.timestamp) return;
    setLoadingMore(true);
    try {
      const more = await loadMoreActivities(lastItem.timestamp, FEED_LIMIT);
      if (more.length < FEED_LIMIT) setHasMore(false);
      setMoreActivities((prev) => [...prev, ...more]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setMoreActivities([]);
    setHasMore(true);
    if (user) {
      await getUserStats(user.uid).then((s) =>
        setStats({ totalKm: s.totalKm, runsCount: s.runsCount, totalTime: s.totalTime })
      );
    }
    toast.success("Feed atualizado!");
  }, [user]);

  const { refreshing, pullDist } = usePullToRefresh(handleRefresh);

  const handleLike = useCallback(async (activityId: string, likes: string[] = []) => {
    if (!user) return;
    const isLiked = likes.includes(user.uid);
    try { await toggleLike(activityId, user.uid, isLiked); }
    catch (e) { console.error(e); }
  }, [user]);

  const athletes = useMemo(() => {
    const seen = new Set<string>();
    return activities
      .filter((a) => { if (a.userId === user?.uid || seen.has(a.userId)) return false; seen.add(a.userId); return true; })
      .slice(0, 6)
      .map((a) => ({
        id: a.userId, name: a.userName, avatar: a.userAvatar,
        runs: activities.filter((x) => x.userId === a.userId).length,
        totalKm: activities.filter((x) => x.userId === a.userId).reduce((sum, x) => sum + Number(x.distance || 0), 0).toFixed(1),
      }));
  }, [activities, user?.uid]);

  const filteredActivities = useMemo(() => {
    if (!query.trim()) return activities;
    const q = query.toLowerCase();
    return activities.filter((a) => a.userName?.toLowerCase().includes(q));
  }, [activities, query]);

  const filteredAthletes = useMemo(() => {
    if (!query.trim()) return athletes;
    const q = query.toLowerCase();
    return athletes.filter((a) => a.name?.toLowerCase().includes(q));
  }, [athletes, query]);

  const isSearchActive = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-black text-white pb-28 safe-top">
      <AnimatePresence>
        {(pullDist > 10 || refreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: Math.min(pullDist, 56), opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center bg-purple-500/10 border-b border-purple-500/20 overflow-hidden"
          >
            <div className={`flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-widest ${refreshing ? "animate-pulse" : ""}`}>
              <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{pullDist >= PULL_THRESHOLD || refreshing ? "Atualizando..." : "Puxe para atualizar"}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-900/60">
        <header className="px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
            >
              {user?.photoURL
                ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-purple-500">{initials(displayName)}</span>
              }
            </button>
            <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">VELOXY</h1>

            <button
              onClick={handleBellClick}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center relative active:scale-95 transition-transform"
            >
              <Bell size={20} />
              <AnimatePresence>
                {hasNewLikes && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.9)]"
                  />
                )}
              </AnimatePresence>
            </button>
          </div>

          <motion.div
            animate={{ borderColor: query ? "rgba(147,51,234,0.6)" : "rgba(63,63,70,0.8)" }}
            className="flex items-center gap-3 bg-zinc-900/70 border rounded-2xl px-4 py-3"
          >
            <Search size={16} className={`flex-shrink-0 transition-colors duration-200 ${query ? "text-purple-400" : "text-zinc-500"}`} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar atletas ou atividades..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"
                >
                  <X size={11} className="text-zinc-300" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {!isSearchActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-3 gap-2 overflow-hidden"
              >
                {[
                  { label: "Corridas",  value: stats.runsCount.toString(), unit: "",   icon: <Zap size={14} /> },
                  { label: "Distância", value: stats.totalKm,               unit: "km", icon: <TrendingUp size={14} /> },
                  { label: "Tempo",     value: stats.totalTime,              unit: "",   icon: <Timer size={14} /> },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl relative overflow-hidden"
                  >
                    <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">{s.label}</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base font-black font-display">{s.value}</span>
                      {s.unit && <span className="text-[7px] font-bold text-purple-500 italic">{s.unit}</span>}
                    </div>
                    <div className="absolute -bottom-1 -right-1 opacity-5 text-purple-500">{s.icon}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      <AnimatePresence mode="wait">
        {isSearchActive ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-5 pt-6 space-y-6"
          >
            {filteredAthletes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={14} className="text-purple-500" />
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atletas</h3>
                </div>
                <div className="space-y-2">
                  {filteredAthletes.map((athlete) => (
                    <motion.div
                      key={athlete.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl px-4 py-3"
                    >
                      <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {athlete.avatar
                          ? <img src={athlete.avatar} alt={athlete.name} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-purple-500">{initials(athlete.name)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{athlete.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {athlete.runs} {athlete.runs === 1 ? "corrida" : "corridas"} · {athlete.totalKm} km
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={12} className="text-purple-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {filteredActivities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-purple-500" />
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Atividades ({filteredActivities.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {filteredActivities.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-4 py-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {item.userAvatar
                          ? <img src={item.userAvatar} alt={item.userName} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-purple-500">{initials(item.userName || "")}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.userName}</p>
                        <p className="text-[10px] text-zinc-500">
                          {Number(item.distance).toFixed(2)} km · {item.pace}/km · {item.time}
                        </p>
                        {item.timestamp && (
                          <p className="text-[9px] text-zinc-600 mt-0.5">
                            {format(item.timestamp.toDate(), "d MMM yyyy · HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-display font-black text-base text-purple-400">{Number(item.distance).toFixed(1)}</p>
                        <p className="text-[8px] text-zinc-600 uppercase">km</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {filteredAthletes.length === 0 && filteredActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Search size={32} className="text-zinc-700" />
                <p className="font-black text-zinc-500 uppercase tracking-widest text-xs">
                  Nenhum resultado para "{query}"
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnimatePresence>
              {!loading && athletes.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                  <div className="px-6 flex items-center gap-2 mb-3">
                    <Users size={14} className="text-purple-500" />
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atletas Ativos</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-1">
                    {athletes.map((athlete, i) => (
                      <motion.button
                        key={athlete.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQuery(athlete.name)}
                        className="flex flex-col items-center gap-1.5 min-w-[68px]"
                      >
                        <div className="w-14 h-14 rounded-[1.2rem] bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center relative">
                          {athlete.avatar
                            ? <img src={athlete.avatar} alt={athlete.name} className="w-full h-full object-cover" />
                            : <span className="text-sm font-black text-purple-500">{initials(athlete.name)}</span>
                          }
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-purple-600 rounded-full text-[7px] font-black text-white px-1.5 py-0.5 whitespace-nowrap">
                            {athlete.totalKm}km
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 text-center truncate w-full">
                          {athlete.name.split(" ")[0]}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <section className="px-5 mt-6 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-purple-500" size={36} />
                  <p className="text-zinc-500 font-display italic tracking-widest text-xs uppercase">Carregando Feed...</p>
                </div>
              ) : activities.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 gap-5 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Play size={32} className="text-purple-500 fill-current ml-1" />
                  </div>
                  <div>
                    <p className="font-display font-black text-xl italic text-white uppercase tracking-tighter">Nenhuma corrida ainda</p>
                    <p className="text-zinc-500 text-xs mt-1">Seja o primeiro a registrar uma atividade!</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/run")}
                    className="px-8 py-3 bg-purple-600 rounded-2xl text-sm font-black uppercase tracking-widest text-white shadow-[0_5px_30px_rgba(147,51,234,0.35)]"
                  >
                    Iniciar Corrida
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence>
                    {activities.map((item, idx) => (
                      <ActivityCard 
                        key={item.id} 
                        item={item} 
                        idx={idx} 
                        userUid={user?.uid} 
                        onLike={handleLike} 
                      />
                    ))}
                  </AnimatePresence>

                  {hasMore ? (
                    <div className="flex justify-center pb-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-black text-zinc-400 uppercase tracking-widest disabled:opacity-50 transition-opacity"
                      >
                        {loadingMore
                          ? <><Loader2 size={13} className="animate-spin text-purple-500" /> Carregando...</>
                          : <><ChevronDown size={13} className="text-purple-500" /> Ver mais atividades</>
                        }
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-center text-[10px] text-zinc-700 uppercase tracking-widest pb-2 font-black">
                      · você chegou ao início do feed ·
                    </p>
                  )}
                </>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Feed;
