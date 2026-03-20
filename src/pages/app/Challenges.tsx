import { motion } from "framer-motion";
import { Trophy, Medal, Target, Crown, Flame } from "lucide-react";
import ChallengeCard from "@/components/ChallengeCard";

const rankings = [
  { pos: 1, name: "Lucas M.", km: 187.4, city: "São Paulo" },
  { pos: 2, name: "Ana C.", km: 156.2, city: "Rio de Janeiro" },
  { pos: 3, name: "Pedro S.", km: 143.8, city: "Belo Horizonte" },
  { pos: 4, name: "Você", km: 98.5, city: "São Paulo", isUser: true },
  { pos: 5, name: "Julia R.", km: 92.1, city: "Curitiba" },
];

const Challenges = () => {
  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Desafios</h1>
        <p className="text-muted-foreground text-sm mt-1">Conquiste metas e ganhe recompensas</p>
      </div>

      {/* Points */}
      <div className="px-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame size={20} className="text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Seus Pontos
            </span>
          </div>
          <p className="text-4xl font-display font-bold text-gradient-lime">2,450</p>
          <p className="text-xs text-muted-foreground mt-1">+180 esta semana</p>
        </div>
      </div>

      {/* Active Challenges */}
      <div className="mb-6">
        <h2 className="font-display font-semibold text-foreground px-5 mb-3">Ativos</h2>
        <div className="flex gap-3 overflow-x-auto px-5 snap-x snap-mandatory no-scrollbar">
          <ChallengeCard
            title="Corredor de Fevereiro"
            description="Corra 50km este mês"
            progress={29}
            target={50}
            unit="km"
            reward="20% desconto Nike"
            daysLeft={3}
          />
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

      {/* Achievements */}
      <div className="px-5 mb-6">
        <h2 className="font-display font-semibold text-foreground mb-3">Conquistas</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <Medal size={24} />, label: "10km", unlocked: true },
            { icon: <Trophy size={24} />, label: "21km", unlocked: true },
            { icon: <Crown size={24} />, label: "42km", unlocked: false },
            { icon: <Target size={24} />, label: "100 runs", unlocked: false },
          ].map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${
                a.unlocked
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {a.icon}
              <span className="text-[10px] font-medium">{a.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rankings */}
      <div className="px-5">
        <h2 className="font-display font-semibold text-foreground mb-3">Ranking Mensal</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {rankings.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < rankings.length - 1 ? "border-b border-border" : ""
              } ${r.isUser ? "bg-primary/5" : ""}`}
            >
              <span
                className={`w-6 text-center font-display font-bold text-sm ${
                  r.pos <= 3 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {r.pos}
              </span>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                {r.name[0]}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${r.isUser ? "text-primary" : "text-foreground"}`}>
                  {r.name}
                </p>
                <p className="text-[10px] text-muted-foreground">{r.city}</p>
              </div>
              <span className="text-sm font-display font-bold text-foreground">{r.km} km</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
