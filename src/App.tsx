import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import PrivateRoute from "@/components/PrivateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthContext";

// Páginas públicas
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Páginas protegidas
import Feed from "@/pages/app/Feed";
import Dashboard from "@/pages/app/Dashboard";
import RunTracking from "@/pages/app/RunTracking";
import Challenges from "@/pages/app/Challenges";
import Community from "@/pages/app/Community";
import Events from "@/pages/app/Events";
import Shop from "@/pages/app/Shop";
import Profile from "@/pages/app/Profile";
import NotFound from "@/pages/NotFound";
import CompleteProfile from "@/pages/auth/CompleteProfile";

const queryClient = new QueryClient();

/* 🔥 Layout protegido */
function ProtectedLayout() {
  return (
    <PrivateRoute>
      <div className="max-w-lg mx-auto relative min-h-screen pb-16">
        <Outlet />
        <BottomNav />
      </div>
    </PrivateRoute>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Completar perfil (precisa de auth, mas não de perfil completo) */}
            <Route path="/complete-profile" element={<CompleteProfile />} />

            {/* Rotas protegidas */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Feed />} />
              <Route path="/stats" element={<Dashboard />} />
              <Route path="/run" element={<RunTracking />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/community" element={<Community />} />
              <Route path="/events" element={<Events />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;