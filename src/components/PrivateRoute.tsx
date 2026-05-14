import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { auth } from "@/firebase";
import { useAuth } from "@/hooks/AuthContext";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const currentUser = user ?? auth.currentUser;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-purple-500" size={36} />

        <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">
          Carregando...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default PrivateRoute;