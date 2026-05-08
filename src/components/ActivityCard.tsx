import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import { RouteSVGPreview } from "./RouteSVGPreview";
import { getActivityBadge, initials, formatCardDate, shareActivity } from "@/lib/feed-utils";
import type { FeedActivity } from "@/types";

export interface ActivityCardProps {
  item: FeedActivity;
  userUid?: string;
  idx: number;
  onLike: (id: string, likes: string[]) => void;
}

const ActivityCard = ({ item, userUid, idx, onLike }: ActivityCardProps) => {
  const isLiked = item.likes?.includes(userUid);
  const badge = getActivityBadge(item.distance || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.08, 0.4) }}
      className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full ring-2 ring-purple-500/50 p-0.5 bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.userAvatar ? (
              <img src={item.userAvatar} alt={item.userName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-purple-500">{initials(item.userName || "")}</span>
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight">{item.userName}</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {formatCardDate(item.timestamp)} · <span className="text-purple-400">{item.type === "RUNNING" ? "Corrida" : item.type}</span>
            </p>
          </div>
        </div>
        {item.userId === userUid && (
          <span className="text-[8px] font-black text-purple-500/60 uppercase tracking-widest border border-purple-500/20 px-2 py-0.5 rounded-full">
            Você
          </span>
        )}
      </div>

      <div className="relative mx-3 aspect-[16/8] rounded-[1.8rem] overflow-hidden mb-1">
        <RouteSVGPreview route={item.route} uid={item.id} />
        <div className="absolute bottom-3 left-4">
          <div className="bg-black/60 backdrop-blur-md border border-purple-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="text-purple-400">{badge.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white">{badge.label}</span>
          </div>
        </div>
        <div className="absolute top-3 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl">
          <span className="font-display font-black text-white text-lg leading-none">{Number(item.distance).toFixed(2)}</span>
          <span className="text-[9px] font-black text-purple-400 ml-0.5">km</span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-zinc-800 mx-3 my-3 bg-zinc-900/60 py-4 rounded-2xl border border-zinc-800/30">
        {[
          { label: "Ritmo", value: item.pace, unit: "/km" },
          { label: "Tempo", value: item.time, unit: "" },
          { label: "Calorias", value: (item.calories ?? 0).toString(), unit: "kcal" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">{s.label}</p>
            <p className="text-base font-black font-display leading-none">
              {s.value}
              {s.unit && <span className="text-[9px] ml-0.5 text-zinc-400 italic">{s.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 pb-5 pt-1">
        <div className="flex items-center gap-5">
          <button onClick={() => onLike(item.id, item.likes)} className="flex items-center gap-1.5 group outline-none active:scale-95 transition-transform">
            <motion.div whileTap={{ scale: 1.5 }}>
              <Heart size={20} className={`transition-all duration-200 ${isLiked ? "text-purple-500 fill-current drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" : "text-zinc-500 group-hover:text-purple-400"}`} />
            </motion.div>
            <span className={`text-xs font-bold tabular-nums ${isLiked ? "text-purple-400" : "text-zinc-500"}`}>
              {item.likes?.length || 0}
            </span>
          </button>
        </div>
        <button
          onClick={() => shareActivity(item)}
          className="w-9 h-9 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center active:scale-95 transition-transform group"
        >
          <Share2 size={15} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
        </button>
      </div>
    </motion.div>
  );
};

export default memo(ActivityCard, (prevProps, nextProps) => {
  return prevProps.item.likes?.length === nextProps.item.likes?.length && prevProps.item.id === nextProps.item.id;
});
