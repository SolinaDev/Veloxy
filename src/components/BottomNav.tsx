import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Activity, 
  Users, 
  BarChart3, 
  User,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Activity, label: "INICIO" },
  { path: "/social", icon: Users, label: "SOCIAL" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] premium-nav safe-bottom">
      <div className="flex items-center justify-around px-2 pt-3 pb-2 max-w-lg mx-auto relative">
        {tabs.map((tab, idx) => {
          if (tab.path === "RECORD") {
            return (
              <div key={idx} className="relative -top-6">
                <motion.button
                  initial={{ y: 12, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1, rotate: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/run")}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_28px_rgba(147,51,234,0.55)] border-4 border-black text-white animate-soft-glow"
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)] animate-pulse" />
                </motion.button>
              </div>
            );
          }

          const isActive =
            location.pathname === tab.path ||
            (tab.path === "/" && location.pathname === "/home") ||
            (tab.path === "/social" && ["/feed", "/shop", "/events", "/community"].includes(location.pathname));
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center gap-1 px-4 py-1 relative group pressable-premium"
            >
              <motion.div
                animate={isActive ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <tab.icon
                  size={22}
                  className={isActive ? "text-purple-500" : "text-zinc-500 group-hover:text-zinc-300 transition-colors"}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
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
