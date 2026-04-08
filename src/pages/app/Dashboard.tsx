import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Play,
  MapPin,
  Flame,
  Timer,
  TrendingUp,
  Zap,
  ChevronRight,
  BarChart3,
  Calendar,
  Activity
} from "lucide-react";
import { auth } from "@/firebase";

const weeklyData = [
  { day: "SEG", km: 5.2 },
  { day: "TER", km: 0 },
  { day: "QUA", km: 8.1 },
  { day: "QUI", km: 3.4 },
  { day: "SEX", km: 0 },
  { day: "SÁB", km: 12.3 },
  { day: "DOM", km: 0 },
];

const maxKm = Math.max(...weeklyData.map((d) => d.km), 1);

const Dashboard = () => {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const displayName = user?.displayName || "Corredor";
    const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

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
          KINETIC STATS
        </h1>
        
        <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
          <Calendar size={18} />
        </button>
      </header>

      {/* Hero: Welcome & Quick Stats */}
      <section className="px-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Bem-vindo de volta,</p>
          <h2 className="font-display font-black text-4xl italic tracking-tighter text-white uppercase">
            {displayName.split(" ")[0]}
          </h2>
        </motion.div>

        {/* Start Run Button (Restyled) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/run")}
          className="w-full bg-purple-600 rounded-[2.5rem] p-6 flex items-center justify-between shadow-[0_10px_40px_rgba(147,51,234,0.3)] group relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
              <Play size={28} className="text-white fill-current ml-1" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-black text-xl italic text-white uppercase leading-none mb-1">Gravar Corrida</h3>
              <p className="text-purple-200 text-[10px] font-bold tracking-widest uppercase opacity-70">GPS Ativo • Pronto para ir</p>
            </div>
          </div>
          <ChevronRight size={24} className="text-white opacity-40 group-hover:opacity-100 transition-opacity" />
          
          {/* Shape background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/10 transition-all" />
        </motion.button>
      </section>

      {/* Weekly Momentum Grid */}
      <section className="px-6 mt-10">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-black text-sm italic tracking-tighter uppercase flex items-center gap-2">
                <Activity size={16} className="text-purple-500" />
                Performance Semanal
            </h3>
            <span className="text-[10px] font-black text-zinc-500 tracking-widest">FEV 2025</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {[
                { label: "Distância Total", value: "29.0", unit: "KM", icon: <MapPin size={16} />, color: "purple" },
                { label: "Tempo de Atividade", value: "2:45", unit: "HR", icon: <Timer size={16} />, color: "zinc" },
                { label: "Energia Gasta", value: "1,840", unit: "KCAL", icon: <Flame size={16} />, color: "zinc" },
                { label: "Ritmo Médio", value: "5'42\"", unit: "MIN/KM", icon: <TrendingUp size={16} />, color: "zinc" },
            ].map((stat, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2.5rem] relative group"
                >
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-display text-white">{stat.value}</span>
                        <span className="text-[9px] font-black text-purple-500 uppercase tracking-tighter italic">{stat.unit}</span>
                    </div>
                </motion.div>
            ))}
        </div>
      </section>

      {/* Weekly Activity Chart (Premium Style) */}
      <section className="px-6 mt-10">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-7">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-black text-sm italic tracking-tighter uppercase text-white">
              Histórico Diário
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <Zap size={10} className="text-purple-500 fill-current" />
              <span className="text-[9px] font-black text-purple-400">3 CORRIDAS ATIVAS</span>
            </div>
          </div>
          
          <div className="flex items-end justify-between gap-3 h-32">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-3 flex-1">
                <div className="relative w-full flex flex-col items-center">
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.km / maxKm) * 100}px` }}
                        transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                        className={`w-full rounded-2xl ${
                            d.km > 0 
                            ? "bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)]" 
                            : "bg-zinc-800/50"
                        }`}
                        style={{ minHeight: d.km > 0 ? "10px" : "4px" }}
                    />
                </div>
                <span className={`text-[8px] font-black tracking-tighter ${d.km > 0 ? "text-purple-400" : "text-zinc-600"}`}>
                    {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Record Card */}
      <section className="px-6 mt-12 pb-10">
        <h3 className="font-display font-black text-sm italic tracking-tighter uppercase mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-500" />
            Último Recorde
        </h3>
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between mb-8">
            <div>
              <h4 className="font-display font-black text-xl italic text-white uppercase">Corrida Matinal</h4>
              <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">HOJE • 06:30 • IBIRAPUERA</p>
            </div>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <span className="text-[9px] font-black text-purple-500 tracking-widest italic">PR Record!</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "KM", value: "8.1" },
              { label: "MIN", value: "42" },
              { label: "PACE", value: "5'13\"" },
              { label: "KCAL", value: "520" },
            ].map((s) => (
              <div key={s.label} className="text-left">
                <p className="font-display font-black text-lg italic text-white leading-none mb-1">{s.value}</p>
                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
