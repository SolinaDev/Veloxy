import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Activity, 
  ShoppingBag, 
  BarChart3, 
  User,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Activity, label: "FEED" },
  { path: "/shop", icon: ShoppingBag, label: "SHOP" },
  { path: "RECORD", icon: Plus, label: "" }, // Botão central especial
  { path: "/stats", icon: BarChart3, label: "STATS" },
  { path: "/profile", icon: User, label: "PROFILE" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on run tracking page
  if (location.pathname === "/run") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-zinc-800/50 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-3 pb-2 max-w-lg mx-auto relative">
        {tabs.map((tab, idx) => {
          if (tab.path === "RECORD") {
            return (
              <div key={idx} className="relative -top-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/run")}
                  className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.5)] border-4 border-black text-white"
                >
                  <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                </motion.button>
              </div>
            );
          }

          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center gap-1 px-4 py-1 relative group"
            >
              <tab.icon
                size={22}
                className={isActive ? "text-purple-500" : "text-zinc-500 group-hover:text-zinc-300 transition-colors"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[9px] font-black tracking-tighter ${
                  isActive ? "text-purple-500" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute -bottom-1 w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
