import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Rota protegida que consome o AuthContext global.
 * Sem listener próprio — evita duplicação do onAuthStateChanged.
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default PrivateRoute;