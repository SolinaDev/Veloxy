import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import PrivateRoute from "@/components/PrivateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthContext";

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const CompleteProfile = lazy(() => import("@/pages/auth/CompleteProfile"));

const Home = lazy(() => import("@/pages/app/Home"));
const Social = lazy(() => import("@/pages/app/Social"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const RunTracking = lazy(() => import("@/pages/app/RunTracking"));
const Challenges = lazy(() => import("@/pages/app/Challenges"));
const Community = lazy(() => import("@/pages/app/Community"));
const Events = lazy(() => import("@/pages/app/Events"));
const Profile = lazy(() => import("@/pages/app/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function applySavedTheme() {
  const theme = localStorage.getItem("veloxy-theme") === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
}

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

function AppLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
      <div className="h-10 w-10 rounded-full border-2 border-purple-500/25 border-t-purple-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
        Carregando
      </p>
    </div>
  );
}

const App = () => {
  useEffect(() => {
    applySavedTheme();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<AppLoading />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/complete-profile" element={<CompleteProfile />} />

                  <Route element={<ProtectedLayout />}>
                    <Route index element={<Home />} />
                    <Route path="home" element={<Home />} />
                    <Route path="feed" element={<Social />} />
                    <Route path="social" element={<Social />} />

                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="stats" element={<Dashboard />} />

                    <Route path="run" element={<RunTracking />} />
                    <Route path="challenges" element={<Challenges />} />
                    <Route path="community" element={<Community />} />
                    <Route path="events" element={<Events />} />
                    <Route path="shop" element={<Social />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App; 
