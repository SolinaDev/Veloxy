import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Pause, 
  Play, 
  Square, 
  MapPin, 
  Timer, 
  Zap, 
  TrendingUp,
  Map as MapIcon,
  Navigation
} from "lucide-react";

const RunTracking = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-top">
      {/* Premium Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-900/50">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-xl italic tracking-tighter text-purple-500 uppercase">
          {isRunning ? "MONITORANDO" : "INICIAR TREINO"}
        </h1>
        <div className="w-10" />
      </header>

      {/* Map Content Section */}
      <div className="flex-1 relative mx-6 mt-6 rounded-[3rem] overflow-hidden bg-zinc-900/50 border border-zinc-800/50 shadow-inner group">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4 animate-pulse-glow">
                <Navigation size={32} className="text-purple-500" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              {isRunning ? "RASTREANDO ROTA..." : "AGUARDANDO GPS"}
            </p>
          </div>
        </div>

        {/* Floating Mini Stats Group */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-6 right-6 grid grid-cols-2 gap-3"
            >
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <MapIcon size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">Ritmo</p>
                        <p className="text-sm font-black font-display italic leading-none">5'47"</p>
                    </div>
                </div>
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">Frequência</p>
                        <p className="text-sm font-black font-display italic leading-none">164</p>
                    </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Running Stats Card */}
      <section className="px-6 py-8">
        <motion.div 
            layout
            className="bg-zinc-900 border border-zinc-800/50 rounded-[3rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="text-center mb-10">
            <motion.p
              key={isRunning ? "running" : "idle"}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-7xl font-display font-black text-purple-500 italic tracking-tighter"
            >
              {isRunning ? "3.24" : "0.00"}
            </motion.p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2 italic">DISTÂNCIA TOTAL (KM)</p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-zinc-800">
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tempo</p>
              <p className="font-display font-black text-lg italic">{isRunning ? "18:42" : "00:00"}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ritmo</p>
              <p className="font-display font-black text-lg italic">{isRunning ? "5'47\"" : "--'--\""}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Velocidade</p>
              <p className="font-display font-black text-lg italic">{isRunning ? "10.4" : "0.0"}</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Control Actions Section */}
      <footer className="px-6 pb-12 safe-bottom">
        <div className="flex items-center justify-center gap-8">
          {!isRunning ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsRunning(true)}
              className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_10px_40px_rgba(147,51,234,0.4)] border-4 border-black group"
            >
              <Play size={40} className="text-white fill-current ml-2 group-hover:scale-110 transition-transform" />
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
                className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 shadow-xl"
              >
                <Square size={24} className="fill-current" />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPaused(!isPaused)}
                className="w-24 h-24 rounded-full bg-zinc-200 flex items-center justify-center shadow-xl border-4 border-black group"
              >
                {isPaused ? (
                  <Play size={40} className="text-black fill-current ml-2" />
                ) : (
                  <Pause size={40} className="text-black fill-current" />
                )}
              </motion.button>

              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-500 shadow-xl"
              >
                <TabIcon icon={MapIcon} size={24} />
              </motion.button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

// Helper component for lucide icons in custom buttons
const TabIcon = ({ icon: Icon, size }: { icon: any, size: number }) => <Icon size={size} />;

export default RunTracking;
