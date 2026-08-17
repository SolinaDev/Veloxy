import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";

interface ChallengeCardProps {
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  reward: string;
  daysLeft: number;
}

const ChallengeCard = ({
  title,
  description,
  progress,
  target,
  unit,
  reward,
  daysLeft,
}: ChallengeCardProps) => {
  const pct = Math.min((progress / target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-4 min-w-[280px] snap-start"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Trophy size={16} className="text-white" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-muted-foreground mt-1" />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">
            {progress} / {target} {unit}
          </span>
          <span className="text-purple-400 font-medium">{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-purple-600 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{daysLeft} dias restantes</span>
        <span className="text-[10px] text-purple-400 font-medium">🎁 {reward}</span>
      </div>
    </motion.div>
  );
};

export default ChallengeCard;
