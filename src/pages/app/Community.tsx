import { motion } from "framer-motion";
import ActivityFeedItem from "@/components/ActivityFeedItem";
import { Users, Search } from "lucide-react";

const feedData = [
  {
    userName: "Lucas Mendes",
    avatar: "LM",
    timeAgo: "há 2 horas",
    distance: "10.5",
    duration: "52:30",
    pace: "5'00\"",
    likes: 24,
    comments: 5,
  },
  {
    userName: "Ana Costa",
    avatar: "AC",
    timeAgo: "há 4 horas",
    distance: "5.2",
    duration: "28:15",
    pace: "5'26\"",
    likes: 18,
    comments: 3,
  },
  {
    userName: "Pedro Silva",
    avatar: "PS",
    timeAgo: "há 6 horas",
    distance: "21.1",
    duration: "1:48:20",
    pace: "5'08\"",
    likes: 67,
    comments: 12,
  },
];

const Community = () => {
  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Comunidade</h1>
          <div className="flex gap-3">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Search size={20} />
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Users size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["Todos", "Amigos", "São Paulo", "Iniciantes", "Sub-5"].map((g, i) => (
            <button
              key={g}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-5 space-y-3">
        {feedData.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <ActivityFeedItem {...item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Community;
