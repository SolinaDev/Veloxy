import { motion } from "framer-motion";
import { Trophy, Medal, Target, Crown, Flame, ChevronRight, Zap, Users, Loader2 } from "lucide-react";
import ChallengeCard from "@/components/ChallengeCard";
import { useAuth } from "@/hooks/AuthContext";
import { useEffect, useState } from "react";
import { getGlobalRanking, getUserProfile, UserProfile } from "@/service/database";

const Challenges = () => {
    const { user } = useAuth();
    const userInitials = user?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

    const [ranking, setRanking] = useState<UserProfile[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadData = async () => {
        if (!user) return;
        try {
          const [rankData, profileData] = await Promise.all([
            getGlobalRanking(10),
            getUserProfile(user.uid)
          ]);
          setRanking(rankData);
          setUserProfile(profileData);
        } catch (error) {
          console.error("Erro ao carregar desafios:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [user]);

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
          VELOXY CHALLENGES
        </h1>
        
        <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
          <Trophy size={18} />
        </button>
      </header>

      {/* Points Special Card */}
      <section className="px-6 mt-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[3rem] text-center relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-purple-600/10 p-3 rounded-2xl mb-2 text-purple-500 border border-purple-500/20">
                <Flame size={24} className="fill-current" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Meus Pontos Veloxy</p>
            {loading ? (
              <Loader2 className="animate-spin text-purple-500 my-2" size={32} />
            ) : (
              <h2 className="text-5xl font-black font-display italic tracking-tighter text-purple-500">
                {userProfile?.totalXP?.toLocaleString("pt-BR") || "0"}
              </h2>
            )}
            <div className="mt-4 px-4 py-1.5 bg-black/50 border border-zinc-800 rounded-full flex items-center gap-2">
                <Zap size={10} className="text-orange-400 fill-current" />
                <span className="text-[9px] font-black text-zinc-400 italic">
                  NÍVEL {userProfile?.level?.toUpperCase() || "INICIANTE"}
                </span>
            </div>
          </div>
          {/* Abstract background shape */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -ml-16 -mt-16 group-hover:bg-purple-600/10 transition-all" />
        </motion.div>
      </section>

      {/* Active Challenges List */}
      <section className="mt-10">
        <div className="px-6 flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-sm italic tracking-tighter uppercase">Desafios Ativos</h3>
          <button className="text-[10px] font-black text-purple-500 italic">DESCOBRIR</button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-6">
          <div className="min-w-[280px]">
            <ChallengeCard
                title="Corredor de Fevereiro"
                description="Corra 50km este mês"
                progress={userProfile?.monthlyKm || 0}
                target={50}
                unit="km"
                reward="20% desconto Nike"
                daysLeft={3}
            />
          </div>
          <div className="min-w-[280px]">
            <ChallengeCard
                title="Maratonista Jr."
                description="Acumule 100km no mês"
                progress={userProfile?.monthlyKm || 0}
                target={100}
                unit="km"
                reward="Camiseta exclusiva"
                daysLeft={3}
            />
          </div>
        </div>
      </section>

      {/* Badges / Conquistas Grid */}
      <section className="px-6 mt-10">
        <h3 className="font-display font-black text-sm italic tracking-tighter uppercase mb-6 flex items-center gap-2">
            <Medal size={16} className="text-purple-500" />
            Minhas Conquistas
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <Medal size={24} />, label: "10KM", unlocked: (userProfile?.monthlyKm || 0) >= 10 },
            { icon: <Trophy size={24} />, label: "21KM", unlocked: (userProfile?.monthlyKm || 0) >= 21 },
            { icon: <Crown size={24} />, label: "42KM", unlocked: (userProfile?.monthlyKm || 0) >= 42 },
            { icon: <Target size={24} />, label: "100 RUNS", unlocked: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className={`flex flex-col items-center gap-2 p-4 rounded-[2rem] border transition-all ${
                a.unlocked
                  ? "bg-zinc-900 border-purple-500/30 text-purple-500"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-600 grayscale opacity-50"
              }`}
            >
              <div className="mb-1">{a.icon}</div>
              <span className="text-[8px] font-black tracking-widest">{a.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Monthly Ranking List */}
      <section className="px-6 mt-12 pb-10">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-black text-sm italic tracking-tighter uppercase flex items-center gap-2">
                <Users size={16} className="text-purple-500" />
                Ranking Global
            </h3>
            <span className="text-[10px] font-black text-zinc-500 tracking-widest">TOP VELOXY</span>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Loader2 className="animate-spin text-purple-500" />
              <p className="text-[10px] font-black text-zinc-600 uppercase">Carregando Ranking...</p>
            </div>
          ) : ranking.map((r, i) => {
            const isUser = r.uid === user?.uid;
            return (
              <motion.div
                key={r.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-[2rem] border ${
                  isUser 
                  ? "bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-white" 
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 group hover:border-zinc-700 transition-colors"
                }`}
              >
                <span className={`w-6 font-display font-black text-xs ${isUser ? "text-white" : "text-zinc-600"}`}>
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
                  {r.photoURL ? (
                    <img src={r.photoURL} alt={r.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-purple-500">
                      {r.displayName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-black uppercase tracking-tight ${isUser ? "text-white" : "text-white"}`}>
                    {r.displayName}
                  </p>
                  <p className={`text-[9px] font-bold ${isUser ? "text-purple-200" : "text-zinc-500"}`}>
                    {r.level?.toUpperCase() || "INICIANTE"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-sm italic">{r.totalXP?.toLocaleString("pt-BR")}</span>
                  <span className={`text-[9px] font-bold ml-1 ${isUser ? "text-purple-200" : "text-zinc-500"}`}>XP</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Challenges;

