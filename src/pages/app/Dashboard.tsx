import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Flame,
  Timer,
  Zap,
  BarChart3,
  Activity,
  Play,
  TrendingUp,
  Award
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { getUserStats, ActivityData, getUserProfile, UserProfile } from "@/service/database";
import { getLevelFromXP } from "@/lib/gamification";

type StatsResult = {
  totalKm: string;
  runsCount: number;
  totalTime: string;
  totalCalories: number;
  lastActivity: (ActivityData & { id: string }) | null;
  weeklyData: { day: string; km: number }[];
};

const DEFAULT_STATS: StatsResult = {
  totalKm: "0.0",
  runsCount: 0,
  totalTime: "0m",
  totalCalories: 0,
  lastActivity: null,
  weeklyData: [],
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsResult>(DEFAULT_STATS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = user?.displayName || "Corredor";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [statsData, profileData] = await Promise.all([
          getUserStats(user.uid),
          getUserProfile(user.uid)
        ]);
        setStats(statsData as StatsResult);
        setProfile(profileData);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const levelInfo = getLevelFromXP(profile?.totalXP || 0);

  const weeklyData = stats.weeklyData;
  const maxKm = Math.max(...weeklyData.map((d) => d.km), 1);

  // Formatar data da última atividade
  const formatLastRunDate = (activity: (ActivityData & { id: string }) | null) => {
    if (!activity?.timestamp) return "—";
    const date = activity.timestamp.toDate();
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return `HOJE • ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
  };

  const statCards = [
    { label: "Distância Total",   value: stats.totalKm,                     unit: "KM",      icon: <MapPin size={16} />,     color: "purple" },
    { label: "Total de Treinos",  value: stats.runsCount.toString(),         unit: "RUNS",    icon: <Zap size={16} />,        color: "zinc"   },
    { label: "Tempo de Atividade",value: stats.totalTime,                   unit: "ATIVO",   icon: <Timer size={16} />,      color: "zinc"   },
    { label: "Energia Gasta",     value: stats.totalCalories.toString(),    unit: "KCAL",    icon: <Flame size={16} />,      color: "zinc"   },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-purple-500">{userInitials}</span>
          )}
        </div>

        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          VELOXY STATS
        </h1>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/run")}
          className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.4)]"
        >
          <Play size={16} className="text-white fill-current ml-0.5" />
        </motion.button>
      </header>

      {/* Welcome & Level Badge */}
      <section className="px-6 mt-8">
        <div className="flex items-start justify-between">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              Bem-vindo de volta,
            </p>
            {loading ? (
              <Skeleton className="h-10 w-32 rounded-lg" />
            ) : (
              <h2 className="font-display font-black text-4xl italic tracking-tighter text-white uppercase">
                {displayName.split(" ")[0]}
              </h2>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 10 }} 
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end"
          >
            {loading ? (
               <Skeleton className="h-6 w-20 rounded-full mb-2" />
            ) : (
               <>
                 <div className="bg-purple-600 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                     <Award size={12} className="text-white fill-current" />
                     <span className="text-[10px] font-black tracking-widest text-white">NÍVEL {levelInfo.currentLevel.toUpperCase()}</span>
                 </div>
                 <p className="text-[10px] font-black text-purple-400 mt-2 italic tracking-tighter">
                     {profile?.totalXP?.toLocaleString("pt-BR") || "0"} XP TOTAL
                 </p>
               </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-black text-sm italic tracking-tighter uppercase flex items-center gap-2">
            <Activity size={16} className="text-purple-500" />
            Performance Geral
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-[2.5rem]" />)}
            </>
          ) : (
            statCards.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2.5rem] relative group"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
                    stat.color === "purple"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {stat.icon}
                </div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-display text-white leading-none">
                    {stat.value}
                  </span>
                  <span className="text-[9px] font-black text-purple-500 uppercase tracking-tighter italic">
                    {stat.unit}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Weekly Chart */}
      <section className="px-6 mt-10">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-7">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-black text-sm italic tracking-tighter uppercase text-white">
              Últimos 7 Dias
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <Zap size={10} className="text-purple-500 fill-current" />
              <span className="text-[9px] font-black text-purple-400">
                {stats.runsCount} {stats.runsCount === 1 ? "CORRIDA" : "CORRIDAS"}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <Loader2 className="animate-spin text-purple-500" size={24} />
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <TrendingUp size={28} className="text-zinc-700" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Nenhuma corrida ainda
              </p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-3 h-32">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-3 flex-1">
                  <div className="relative w-full flex flex-col items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.km / maxKm) * 100}px` }}
                      transition={{ delay: i * 0.1, duration: 0.7, ease: "easeOut" }}
                      className={`w-full rounded-2xl ${
                        d.km > 0
                          ? "bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                          : "bg-zinc-800/50"
                      }`}
                      style={{ minHeight: d.km > 0 ? "10px" : "4px" }}
                    />
                  </div>
                  <span
                    className={`text-[8px] font-black tracking-tighter ${
                      d.km > 0 ? "text-purple-400" : "text-zinc-600"
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Last Run Card */}
      <section className="px-6 mt-10 pb-10">
        <h3 className="font-display font-black text-sm italic tracking-tighter uppercase mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-purple-500" />
          Última Atividade
        </h3>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-purple-500" size={24} />
          </div>
        ) : stats.lastActivity ? (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 relative overflow-hidden">
            {/* purple glow blob */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between mb-8">
              <div>
                <h4 className="font-display font-black text-xl italic text-white uppercase">
                  {stats.lastActivity.type === "RUNNING" ? "Corrida" : stats.lastActivity.type}
                </h4>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                  {formatLastRunDate(stats.lastActivity)}
                </p>
              </div>
              <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <span className="text-[9px] font-black text-purple-400 tracking-widest italic">
                  GPS REAL
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "KM",    value: stats.lastActivity.distance.toFixed(2) },
                { label: "PACE",  value: stats.lastActivity.pace },
                { label: "TEMPO", value: stats.lastActivity.time },
                { label: "KCAL",  value: (stats.lastActivity.calories ?? 0).toString() },
              ].map((s) => (
                <div key={s.label} className="text-left">
                  <p className="font-display font-black text-lg italic text-white leading-none mb-1">
                    {s.value}
                  </p>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-zinc-900/30 border border-zinc-800/30 rounded-[2.5rem] p-10 flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Play size={28} className="text-purple-500 fill-current ml-1" />
            </div>
            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest text-center">
              Ainda sem corridas registradas
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/run")}
              className="px-6 py-3 bg-purple-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-[0_5px_20px_rgba(147,51,234,0.3)]"
            >
              Iniciar Primeira Corrida
            </motion.button>
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
