import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  MapPin,
  Flame,
  Timer,
  TrendingUp,
  Zap,
  ChevronRight,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import ChallengeCard from "@/components/ChallengeCard";

const weeklyData = [
  { day: "Seg", km: 5.2 },
  { day: "Ter", km: 0 },
  { day: "Qua", km: 8.1 },
  { day: "Qui", km: 3.4 },
  { day: "Sex", km: 0 },
  { day: "Sáb", km: 12.3 },
  { day: "Dom", km: 0 },
];

const maxKm = Math.max(...weeklyData.map((d) => d.km), 1);

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-muted-foreground text-sm">Olá, Corredor 👋</p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            Pronto para correr?
          </h1>
        </motion.div>
      </div>

      {/* Start Run Button */}
      <div className="px-5 mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/run")}
          className="w-full bg-gradient-lime text-primary-foreground rounded-2xl p-5 flex items-center justify-between shadow-glow"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Play size={28} className="ml-1" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-bold text-lg">Iniciar Corrida</h3>
              <p className="text-primary-foreground/70 text-sm">GPS • Mapa em tempo real</p>
            </div>
          </div>
          <ChevronRight size={24} />
        </motion.button>
      </div>

      {/* Weekly Stats */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-foreground">Esta Semana</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<MapPin size={14} />}
            label="Distância"
            value="29.0"
            unit="km"
            color="lime"
          />
          <StatCard
            icon={<Timer size={14} />}
            label="Tempo"
            value="2:45"
            unit="hrs"
            color="blue"
          />
          <StatCard
            icon={<Flame size={14} />}
            label="Calorias"
            value="1,840"
            unit="kcal"
            color="orange"
          />
          <StatCard
            icon={<TrendingUp size={14} />}
            label="Ritmo Médio"
            value={"5'42\""}
            unit="/km"
            color="purple"
          />
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="px-5 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm text-foreground">
              Atividade Semanal
            </h3>
            <div className="flex items-center gap-1 text-primary">
              <Zap size={12} />
              <span className="text-xs font-medium">3 corridas</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-24">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.km / maxKm) * 80}px` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`w-full rounded-t-md ${
                    d.km > 0 ? "bg-gradient-lime" : "bg-muted"
                  }`}
                  style={{ minHeight: d.km > 0 ? "8px" : "4px" }}
                />
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Challenges */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="font-display font-semibold text-foreground">Desafios Ativos</h2>
          <span className="text-xs text-primary font-medium cursor-pointer" onClick={() => navigate("/challenges")}>
            Ver todos
          </span>
        </div>
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
            title="5 Dias Seguidos"
            description="Corra 5 dias consecutivos"
            progress={3}
            target={5}
            unit="dias"
            reward="100 pontos"
            daysLeft={7}
          />
          <ChallengeCard
            title="Velocidade Máxima"
            description="Alcance 15km/h em uma corrida"
            progress={12.8}
            target={15}
            unit="km/h"
            reward="Medalha Velocista"
            daysLeft={14}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-foreground">Última Corrida</h2>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-display font-semibold text-sm text-foreground">
                Corrida Matinal
              </h4>
              <p className="text-xs text-muted-foreground">Hoje, 06:30</p>
            </div>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              Novo recorde!
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Distância", value: "8.1 km" },
              { label: "Tempo", value: "42:15" },
              { label: "Ritmo", value: "5'13\"" },
              { label: "Calorias", value: "520" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-display font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
