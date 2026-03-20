import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface ActivityFeedItemProps {
  userName: string;
  avatar: string;
  timeAgo: string;
  distance: string;
  duration: string;
  pace: string;
  likes: number;
  comments: number;
}

const ActivityFeedItem = ({
  userName,
  avatar,
  timeAgo,
  distance,
  duration,
  pace,
  likes,
  comments,
}: ActivityFeedItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-lime flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
          {avatar}
        </div>
        <div className="flex-1">
          <h4 className="font-display font-semibold text-sm text-foreground">{userName}</h4>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 bg-muted rounded-lg p-3">
        <div className="text-center">
          <p className="text-lg font-display font-bold text-primary">{distance}</p>
          <p className="text-[10px] text-muted-foreground uppercase">km</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-lg font-display font-bold text-foreground">{duration}</p>
          <p className="text-[10px] text-muted-foreground uppercase">tempo</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-display font-bold text-foreground">{pace}</p>
          <p className="text-[10px] text-muted-foreground uppercase">ritmo</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Heart size={16} />
          <span className="text-xs">{likes}</span>
        </button>
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <MessageCircle size={16} />
          <span className="text-xs">{comments}</span>
        </button>
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors ml-auto">
          <Share2 size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default ActivityFeedItem;
