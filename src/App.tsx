import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import PrivateRoute from "@/components/PrivateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthContext";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import CompleteProfile from "@/pages/auth/CompleteProfile";

import Feed from "@/pages/app/Feed";
import Dashboard from "@/pages/app/Dashboard";
import RunTracking from "@/pages/app/RunTracking";
import Challenges from "@/pages/app/Challenges";
import Community from "@/pages/app/Community";
import Events from "@/pages/app/Events";
import Shop from "@/pages/app/Shop";
import Profile from "@/pages/app/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

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

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />

                <Route element={<ProtectedLayout />}>
                  <Route index element={<Feed />} />
                  <Route path="feed" element={<Feed />} />

                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="stats" element={<Dashboard />} />

                  <Route path="run" element={<RunTracking />} />
                  <Route path="challenges" element={<Challenges />} />
                  <Route path="community" element={<Community />} />
                  <Route path="events" element={<Events />} />
                  <Route path="shop" element={<Shop />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App; 