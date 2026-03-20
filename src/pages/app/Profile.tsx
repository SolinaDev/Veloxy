import { motion } from "framer-motion";
import {
  Settings,
  ChevronRight,
  MapPin,
  Trophy,
  Flame,
  Calendar,
  TrendingUp,
  Award,
  Medal,
} from "lucide-react";

const stats = [
  { label: "Total km", value: "847", icon: <MapPin size={16} /> },
  { label: "Corridas", value: "124", icon: <Calendar size={16} /> },
  { label: "Pontos", value: "2,450", icon: <Flame size={16} /> },
  { label: "Ranking", value: "#4", icon: <Trophy size={16} /> },
];

const achievements = [
  { icon: <Medal size={20} />, name: "Primeiro 5K", date: "Jan 2025" },
  { icon: <Award size={20} />, name: "10K Sub-50", date: "Mar 2025" },
  { icon: <Trophy size={20} />, name: "Meia Maratona", date: "Jul 2025" },
  { icon: <TrendingUp size={20} />, name: "100 Corridas", date: "Nov 2025" },
];

const Profile = () => {
  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Perfil</h1>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings size={22} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-lime mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl font-display font-bold text-primary-foreground">VC</span>
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">Você Corredor</h2>
          <p className="text-muted-foreground text-sm">São Paulo, SP</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              Nível Avançado
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-3 text-center"
            >
              <div className="text-primary mb-1 flex justify-center">{s.icon}</div>
              <p className="font-display font-bold text-lg text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Monthly Progress */}
      <div className="px-5 mb-6">
        <h2 className="font-display font-semibold text-foreground mb-3">Este Mês</h2>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Meta: 100 km</span>
            <span className="text-sm font-display font-bold text-primary">98.5 km</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "98.5%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-lime rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Faltam apenas 1.5 km! 🔥</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="px-5 mb-6">
        <h2 className="font-display font-semibold text-foreground mb-3">Conquistas</h2>
        <div className="space-y-2">
          {achievements.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {a.icon}
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-sm text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.date}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
