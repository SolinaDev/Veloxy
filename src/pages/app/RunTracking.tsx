import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pause, Play, Square, MapPin, Timer, Zap, TrendingUp } from "lucide-react";

const RunTracking = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-display font-bold text-foreground">
          {isRunning ? "Correndo..." : "Iniciar Corrida"}
        </h1>
        <div className="w-6" />
      </div>

      {/* Map Placeholder */}
      <div className="flex-1 relative mx-5 rounded-2xl overflow-hidden bg-muted border border-border mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={48} className="text-primary mx-auto mb-3 animate-pulse-glow" />
            <p className="text-muted-foreground text-sm">
              {isRunning ? "Rastreando rota..." : "Aguardando sinal GPS"}
            </p>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 flex items-center gap-1 justify-center"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary">GPS ativo</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Floating stats during run */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-4 left-4 right-4 glass rounded-xl p-3"
            >
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-display font-bold text-primary">3.24</p>
                  <p className="text-[10px] text-muted-foreground">KM</p>
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-foreground">18:42</p>
                  <p className="text-[10px] text-muted-foreground">TEMPO</p>
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-foreground">5'47"</p>
                  <p className="text-[10px] text-muted-foreground">RITMO</p>
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-foreground">210</p>
                  <p className="text-[10px] text-muted-foreground">KCAL</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Stats */}
      <div className="px-5 mb-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-center mb-6">
            <motion.p
              key={isRunning ? "running" : "idle"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-display font-bold text-primary"
            >
              {isRunning ? "3.24" : "0.00"}
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1">quilômetros</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-stat-blue mb-1">
                <Timer size={14} />
              </div>
              <p className="font-display font-bold text-foreground">
                {isRunning ? "18:42" : "00:00"}
              </p>
              <p className="text-[10px] text-muted-foreground">Tempo</p>
            </div>
            <div className="text-center border-x border-border">
              <div className="flex items-center justify-center gap-1 text-stat-orange mb-1">
                <TrendingUp size={14} />
              </div>
              <p className="font-display font-bold text-foreground">
                {isRunning ? "5'47\"" : "--'--\""}
              </p>
              <p className="text-[10px] text-muted-foreground">Ritmo</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-stat-red mb-1">
                <Zap size={14} />
              </div>
              <p className="font-display font-bold text-foreground">
                {isRunning ? "10.4" : "0.0"}
              </p>
              <p className="text-[10px] text-muted-foreground">km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pb-8 safe-bottom">
        <div className="flex items-center justify-center gap-6">
          {!isRunning ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRunning(true)}
              className="w-20 h-20 rounded-full bg-gradient-lime flex items-center justify-center shadow-glow"
            >
              <Play size={32} className="text-primary-foreground ml-1" />
            </motion.button>
          ) : (
            <>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setIsRunning(false);
                  setIsPaused(false);
                }}
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center"
              >
                <Square size={20} className="text-destructive-foreground" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPaused(!isPaused)}
                className="w-20 h-20 rounded-full bg-gradient-lime flex items-center justify-center shadow-glow"
              >
                {isPaused ? (
                  <Play size={32} className="text-primary-foreground ml-1" />
                ) : (
                  <Pause size={32} className="text-primary-foreground" />
                )}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunTracking;
