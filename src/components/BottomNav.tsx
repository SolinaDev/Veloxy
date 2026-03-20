import { NavLink, useLocation } from "react-router-dom";
import { Activity, Users, Trophy, Calendar, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Activity, label: "Treinos" },
  { path: "/community", icon: Users, label: "Social" },
  { path: "/challenges", icon: Trophy, label: "Desafios" },
  { path: "/events", icon: Calendar, label: "Eventos" },
  { path: "/shop", icon: ShoppingBag, label: "Loja" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const BottomNav = () => {
  const location = useLocation();

  // Hide on run tracking page
  if (location.pathname === "/run") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-lime rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
