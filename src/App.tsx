import { Suspense, lazy, useEffect } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import PrivateRoute from "@/components/PrivateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthContext";

/* =========================
   PÁGINAS DE AUTENTICAÇÃO
========================= */

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const CompleteProfile = lazy(
  () => import("@/pages/auth/CompleteProfile"),
);

/* NOVA PÁGINA */
const Legal = lazy(() => import("@/pages/auth/Legal"));

/* =========================
   PÁGINAS DO APP
========================= */

const Home = lazy(() => import("@/pages/app/Home"));
const Social = lazy(() => import("@/pages/app/Social"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const RunTracking = lazy(() => import("@/pages/app/RunTracking"));
const Challenges = lazy(() => import("@/pages/app/Challenges"));
const Events = lazy(() => import("@/pages/app/Events"));
const Profile = lazy(() => import("@/pages/app/Profile"));
const Group = lazy(() => import("@/pages/app/Group"));
const Pet = lazy(() => import("@/pages/app/Pet"));

const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function applySavedTheme() {
  const theme =
    localStorage.getItem("veloxy-theme") === "light"
      ? "light"
      : "dark";

  document.documentElement.classList.toggle(
    "light",
    theme === "light",
  );

  document.documentElement.classList.toggle(
    "dark",
    theme === "dark",
  );
}

function ProtectedLayout() {
  return (
    <PrivateRoute>
      <div className="min-h-screen">
        <Outlet />
        <BottomNav />
      </div>
    </PrivateRoute>
  );
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Carregando...
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
          <Sonner />

          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<AppLoading />}>
                <Routes>
                  {/* =========================
                      ROTAS PÚBLICAS
                  ========================= */}

                  <Route
                    path="/login"
                    element={<Login />}
                  />

                  <Route
                    path="/register"
                    element={<Register />}
                  />

                  <Route
                    path="/complete-profile"
                    element={<CompleteProfile />}
                  />

                  {/* TERMOS E PRIVACIDADE */}
                  <Route
                    path="/termos-e-privacidade"
                    element={<Legal />}
                  />

                  {/* =========================
                      ROTAS PROTEGIDAS
                  ========================= */}

                  <Route element={<ProtectedLayout />}>
                    <Route
                      index
                      element={<Home />}
                    />

                    <Route
                      path="home"
                      element={<Home />}
                    />

                    <Route
                      path="feed"
                      element={<Social />}
                    />

                    <Route
                      path="social"
                      element={<Social />}
                    />

                    <Route
                      path="dashboard"
                      element={<Dashboard />}
                    />

                    <Route
                      path="stats"
                      element={<Dashboard />}
                    />

                    <Route
                      path="run"
                      element={<RunTracking />}
                    />

                    <Route
                      path="challenges"
                      element={<Challenges />}
                    />

                    <Route
                      path="events"
                      element={<Events />}
                    />

                    <Route
                      path="profile"
                      element={<Profile />}
                    />

                    <Route
                      path="grupo/:groupId"
                      element={<Group />}
                    />

                    <Route
                      path="pet"
                      element={<Pet />}
                    />
                  </Route>

                  {/* =========================
                      404
                  ========================= */}

                  <Route
                    path="*"
                    element={<NotFound />}
                  />
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