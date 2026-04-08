import { useState } from "react";
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
  Plus
} from "lucide-react";
import { auth } from "@/firebase";

const suggestedAthletes = [
  { id: 1, name: "Ana Costa", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
  { id: 2, name: "Lucas Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas" },
  { id: 3, name: "Carla Dias", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carla" },
  { id: 4, name: "Pedro Rocha", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" },
];

const feedData = [
  {
    id: 1,
    userName: "Marcus Chen",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    timeAgo: "2 hours ago",
    activityType: "Morning Ride",
    image: "https://images.unsplash.com/photo-1541625602330-2277a1cd13a1?q=80&w=800&auto=format&fit=crop",
    category: "CYCLING",
    stats: {
      distance: "54.2",
      pace: "32.4",
      elevation: "840"
    },
    likes: 24,
    comments: 8,
    friends: ["https://i.pravatar.cc/150?u=1", "https://i.pravatar.cc/150?u=2"]
  },
  {
    id: 2,
    userName: "Elena Rodriguez",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    timeAgo: "4 hours ago",
    activityType: "Canyon Tempo",
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
    category: "RUNNING",
    stats: {
      distance: "12.4",
      pace: "4:12",
      time: "52"
    },
    likes: 42,
    comments: 3,
    friends: ["https://i.pravatar.cc/150?u=3", "https://i.pravatar.cc/150?u=4"]
  }
];

const Feed = () => {
  const user = auth.currentUser;
  const displayName = user?.displayName || "Corredor";
  const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex flex-col gap-4 sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-purple-500">{userInitials}</span>
            )}
          </div>
          
          <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
            KINETIC
          </h1>
          
          <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
        </div>

        {/* Search Bar (Explore) */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search athletes, clubs or challenges..." 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
          />
        </div>
      </header>

      {/* Your Momentum */}
      <section className="px-6 mt-6">
        <h2 className="font-display text-2xl font-bold mb-4">Your Momentum</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-[2rem] relative overflow-hidden group"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">This Week</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black font-display">42.8</span>
                <span className="text-xs font-bold text-purple-500">KM</span>
              </div>
            </div>
            {/* Abstract Shape */}
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-4 -mb-4 blur-xl transition-all group-hover:bg-purple-500/20" />
            <div className="absolute bottom-4 right-4 text-zinc-800">
               <TrendingUp size={40} className="opacity-20 translate-y-2 group-hover:translate-y-0 transition-transform" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-[2rem] relative overflow-hidden group"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Elevation</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black font-display">1,240</span>
                <span className="text-xs font-bold text-purple-500">M</span>
              </div>
            </div>
             {/* Abstract Shape */}
             <div className="absolute bottom-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-4 -mb-4 blur-xl transition-all group-hover:bg-blue-500/20" />
             <div className="absolute bottom-4 right-4 text-zinc-800">
               <ArrowUpRight size={40} className="opacity-20 translate-y-2 group-hover:translate-y-0 transition-transform" />
            </div>
          </motion.div>
        </div>
      </section>

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
        {feedData.map((item, idx) => (
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
                <div className="w-12 h-12 rounded-full ring-2 ring-purple-500 p-0.5">
                  <img src={item.userAvatar} alt={item.userName} className="w-full h-full rounded-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{item.userName}</h4>
                  <p className="text-[10px] text-zinc-500">
                    {item.timeAgo} • <span className="text-purple-400">{item.activityType}</span>
                  </p>
                </div>
              </div>
              <button className="text-zinc-500">
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* Content Image/Map */}
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden mb-4 group">
              <img src={item.image} alt="Activity" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute top-4 left-4 bg-zinc-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                {item.category === "CYCLING" ? <Zap size={14} className="text-purple-400" /> : <MapIcon size={14} className="text-purple-400" />}
                <span className="text-[10px] font-black tracking-widest">{item.category}</span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 divide-x divide-zinc-800 mb-6 bg-zinc-900/50 py-4 rounded-3xl border border-zinc-800/30">
              <div className="text-center">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Distance</p>
                <p className="text-lg font-black font-display leading-none">{item.stats.distance}<span className="text-[10px] ml-0.5 text-zinc-400 italic">km</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">
                  {item.stats.pace.includes(":") ? "Pace" : "Avg Pace"}
                </p>
                <p className="text-lg font-black font-display leading-none">{item.stats.pace}<span className="text-[10px] ml-0.5 text-zinc-400 italic">{item.stats.pace.includes(":") ? "/km" : "km/h"}</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">
                  {item.stats.elevation ? "Elevation" : "Time"}
                </p>
                <p className="text-lg font-black font-display leading-none">{item.stats.elevation || item.stats.time}<span className="text-[10px] ml-0.5 text-zinc-400 italic">{item.stats.elevation ? "m" : "m"}</span></p>
              </div>
            </div>

            {/* Interaction Bar */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-6">
                <button className="flex items-center gap-1.5 group">
                  <Heart size={20} className="text-zinc-500 group-hover:text-purple-500 transition-colors" />
                  <span className="text-xs font-bold text-zinc-400">{item.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 group">
                  <MessageCircle size={20} className="text-zinc-500 group-hover:text-purple-500 transition-colors" />
                  <span className="text-xs font-bold text-zinc-400">{item.comments}</span>
                </button>
              </div>
              
              <div className="flex -space-x-2">
                {item.friends.map((f, i) => (
                  <img key={i} src={f} className="w-6 h-6 rounded-full border-2 border-black" alt="friend" />
                ))}
                <div className="w-6 h-6 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                  <span className="text-[8px] font-bold">+14</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default Feed;
