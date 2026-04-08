import { motion } from "framer-motion";
import { Trophy, Medal, Target, Crown, Flame, ChevronRight, Zap, Users } from "lucide-react";
import ChallengeCard from "@/components/ChallengeCard";
import { auth } from "@/firebase";

const rankings = [
  { pos: 1, name: "Lucas M.", km: 187.4, city: "São Paulo", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas" },
  { pos: 2, name: "Ana C.", km: 156.2, city: "Rio de Janeiro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
  { pos: 3, name: "Pedro S.", km: 143.8, city: "Belo Horizonte", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" },
  { pos: 4, name: "Você", km: 98.5, city: "São Paulo", isUser: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You" },
  { pos: 5, name: "Julia R.", km: 92.1, city: "Curitiba", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julia" },
];

const Challenges = () => {
    const user = auth.currentUser;
    const userInitials = user?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

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
          KINETIC CHALLENGES
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
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Meus Pontos Kinetic</p>
            <h2 className="text-5xl font-black font-display italic tracking-tighter text-purple-500">2,450</h2>
            <div className="mt-4 px-4 py-1.5 bg-black/50 border border-zinc-800 rounded-full flex items-center gap-2">
                <Zap size={10} className="text-orange-400 fill-current" />
                <span className="text-[9px] font-black text-zinc-400">+180 ESTA SEMANA</span>
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
                progress={29}
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
                progress={67}
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
            { icon: <Medal size={24} />, label: "10KM", unlocked: true },
            { icon: <Trophy size={24} />, label: "21KM", unlocked: true },
            { icon: <Crown size={24} />, label: "42KM", unlocked: false },
            { icon: <Target size={24} />, label: "100 RUNS", unlocked: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className={`flex flex-col items-center gap-2 p-4 rounded-[2rem] border transition-all ${
                a.unlocked
                  ? "bg-zinc-900 border-purple-500/30 text-purple-500"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-600 grayscale"
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
                Ranking Mensal
            </h3>
            <span className="text-[10px] font-black text-zinc-500 tracking-widest">SÃO PAULO</span>
        </div>
        
        <div className="space-y-3">
          {rankings.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-4 p-4 rounded-[2rem] border ${
                r.isUser 
                  ? "bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-white" 
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 group hover:border-zinc-700 transition-colors"
              }`}
            >
              <span className={`w-6 font-display font-black text-xs ${r.isUser ? "text-white" : "text-zinc-600"}`}>
                {r.pos}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden">
                <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black uppercase tracking-tight ${r.isUser ? "text-white" : "text-white"}`}>
                  {r.name}
                </p>
                <p className={`text-[9px] font-bold ${r.isUser ? "text-purple-200" : "text-zinc-500"}`}>
                    {r.city.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-sm italic">{r.km}</span>
                <span className={`text-[9px] font-bold ml-1 ${r.isUser ? "text-purple-200" : "text-zinc-500"}`}>KM</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Challenges;
