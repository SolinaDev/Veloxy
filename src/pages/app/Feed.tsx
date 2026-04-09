import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Bell, 
  MoreHorizontal, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Map as MapIcon,
  Zap,
  ArrowUpRight,
  Search,
  Users,
  Plus,
  Timer,
  Loader2
} from "lucide-react";
import { auth } from "@/firebase";
import { subscribeToFeed, toggleLike, getUserStats } from "@/service/database";
import { useAuth } from "@/hooks/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const suggestedAthletes = [
  { id: 1, name: "Ana Costa", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
  { id: 2, name: "Lucas Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas" },
  { id: 3, name: "Carla Dias", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carla" },
  { id: 4, name: "Pedro Rocha", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" },
];



const Feed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalKm: "0.0", runsCount: 0, totalTime: "0m" });

  const displayName = user?.displayName || "Corredor";
  const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    // 1. Escuta estatísticas
    const loadStats = async () => {
      if (user) {
        const userStats = await getUserStats(user.uid);
        setStats(userStats);
      }
    };
    loadStats();

    // 2. Escuta feed em tempo real
    const unsubscribe = subscribeToFeed((newActivities) => {
      setActivities(newActivities);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (activityId: string, likes: string[] = []) => {
    if (!user) return;
    const isLiked = likes.includes(user.uid);
    try {
      await toggleLike(activityId, user.uid, isLiked);
    } catch (error) {
       console.error("Erro ao curtir:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Sticky Top Area (Header + Momentum) */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900/50">
        {/* Header */}
        <header className="px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-purple-500">{userInitials}</span>
              )}
            </div>
            
            <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
            VELOXY
            </h1>
            
            <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Your Momentum (Sticky) */}
        <section className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {/* Card 1: Frequência */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">Frequência</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black font-display">{stats.runsCount}</span>
                  <span className="text-[7px] font-bold text-purple-500 italic">CORRIDAS</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 opacity-5 text-purple-500">
                 <Zap size={24} />
              </div>
            </motion.div>

            {/* Card 2: Distância */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">Distância</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black font-display">{stats.totalKm}</span>
                  <span className="text-[7px] font-bold text-purple-500 italic">KM</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 opacity-5 text-purple-500">
                 <TrendingUp size={24} />
              </div>
            </motion.div>

            {/* Card 3: Tempo */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">Tempo</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black font-display uppercase">{stats.totalTime}</span>
                  <span className="text-[7px] font-bold text-purple-500 italic ml-1">TOTAL</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 opacity-5 text-purple-500">
                 <Timer size={24} />
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      <div className="px-6 py-4">
        {/* Search Bar (Explore) */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search athletes, clubs or challenges..." 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Suggested Athletes (Explore Integration) */}
      <section className="mt-8">
        <div className="px-6 flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} className="text-purple-500" />
            Discover Athletes
          </h3>
          <button className="text-[10px] font-bold text-purple-500 hover:text-purple-400 transition-colors">VIEW ALL</button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-6">
          {suggestedAthletes.map((athlete) => (
            <motion.div 
              key={athlete.id}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-2 min-w-[80px]"
            >
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 p-0.5 relative group">
                <img src={athlete.avatar} alt={athlete.name} className="w-full h-full rounded-[1.4rem] object-cover" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full border-2 border-black flex items-center justify-center">
                  <Plus size={12} className="text-white" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 text-center truncate w-full">{athlete.name.split(" ")[0]}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feed List */}
      <section className="px-5 mt-10 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="animate-spin text-purple-500" size={40} />
             <p className="text-zinc-500 font-display italic tracking-widest text-xs uppercase">Carregando Feed...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Nenhuma atividade encontrada.</p>
          </div>
        ) : (
          activities.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-4"
            >
              {/* User Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full ring-2 ring-purple-500 p-0.5 bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {item.userAvatar ? (
                      <img src={item.userAvatar} alt={item.userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-purple-500">
                        {item.userName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.userName}</h4>
                    <p className="text-[10px] text-zinc-500">
                      {item.timestamp ? formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : "Agora mesmo"} • <span className="text-purple-400">{item.type === "RUNNING" ? "Corrida" : "Atividade"}</span>
                    </p>
                  </div>
                </div>
                <button className="text-zinc-500">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* Content Image (Premium Placeholder) */}
              <div className="relative aspect-[16/9] rounded-[2rem] overflow-hidden mb-6 group bg-zinc-900">
                 <img 
                    src={`https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=800&auto=format&fit=crop`} 
                    alt="Run" 
                    className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                 <div className="absolute bottom-4 left-6 flex items-center gap-2">
                    <div className="bg-purple-600/20 backdrop-blur-md border border-purple-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                       <Zap size={10} className="text-purple-400 fill-current" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-white">Performance Alta</span>
                    </div>
                 </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 divide-x divide-zinc-800 mb-6 bg-zinc-900/50 py-4 rounded-3xl border border-zinc-800/30">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Distância</p>
                  <p className="text-lg font-black font-display leading-none">{item.distance}<span className="text-[10px] ml-0.5 text-zinc-400 italic">km</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">
                    Ritmo
                  </p>
                  <p className="text-lg font-black font-display leading-none">{item.pace}<span className="text-[10px] ml-0.5 text-zinc-400 italic">/km</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">
                    Tempo
                  </p>
                  <p className="text-lg font-black font-display leading-none">{item.time}<span className="text-[10px] ml-0.5 text-zinc-400 italic">min</span></p>
                </div>
              </div>

              {/* Interaction Bar */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => handleLike(item.id, item.likes)}
                    className="flex items-center gap-1.5 group outline-none"
                  >
                    <motion.div whileTap={{ scale: 1.5 }}>
                        <Heart 
                           size={20} 
                           className={`transition-colors ${item.likes?.includes(user?.uid) ? "text-purple-500 fill-current" : "text-zinc-500 group-hover:text-purple-500"}`} 
                        />
                    </motion.div>
                    <span className={`text-xs font-bold ${item.likes?.includes(user?.uid) ? "text-purple-500" : "text-zinc-400"}`}>{item.likes?.length || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 group">
                    <MessageCircle size={20} className="text-zinc-500 group-hover:text-purple-500 transition-colors" />
                    <span className="text-xs font-bold text-zinc-400">{item.comments || 0}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </section>
    </div>
  );
};

export default Feed;
