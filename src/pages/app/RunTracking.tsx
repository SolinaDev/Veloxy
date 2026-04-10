import { useState, useEffect } from "react";
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
  Navigation,
  Loader2
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/AuthContext";
import { saveActivity } from "@/service/database";
import { toast } from "sonner";

const RunTracking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Stats simulados
  // Stats Reais
  const [distance, setDistance] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [path, setPath] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auxiliar para centralizar o mapa
  const RecenterMap = ({ coords }: { coords: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(coords);
    }, [coords]);
    return null;
  };

  // Função para calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Cronômetro real
  useEffect(() => {
    let interval: any;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Rastreamento GPS real
  useEffect(() => {
    let watchId: number;

    if (isRunning && !isPaused && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`GPS Success: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}m`);
          
          const newPoint: [number, number] = [latitude, longitude];
          setCurrentPos(newPoint);

          // Se a precisão for muito ruim, só mostramos a posição mas não somamos distância
          if (accuracy > 50) return; 

          setPath(prevPath => {
            if (prevPath.length > 0) {
              const lastPoint = prevPath[prevPath.length - 1];
              const d = calculateDistance(lastPoint[0], lastPoint[1], latitude, longitude);
              
              // Evitar somar micro-movimentos de imprecisão
              if (d > 0.005) { 
                setDistance(prev => prev + d);
                return [...prevPath, newPoint];
              }
              return prevPath;
            }
            return [newPoint];
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          toast.error("Erro ao acessar GPS: " + error.message);
        },
        { enableHighAccuracy: true, distanceFilter: 2 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isRunning, isPaused]);

  // Formatar Ritmo (Pace) - Minutos por km
  const getPace = () => {
    if (distance === 0) return "0'00\"";
    const paceDecimal = (seconds / 60) / distance;
    const mins = Math.floor(paceDecimal);
    const secs = Math.round((paceDecimal - mins) * 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  // Simulação de movimento para testes
  useEffect(() => {
    let interval: any;
    if (isSimulating && isRunning && !isPaused) {
      // Coordenada inicial se estiver vazio (Praça da Sé, SP)
      const startPoint: [number, number] = [-23.5505, -46.6333];
      
      interval = setInterval(() => {
        setPath(prev => {
          const last = prev.length > 0 ? prev[prev.length - 1] : startPoint;
          // Adiciona ~5-10 metros de deslocamento aleatório
          const next: [number, number] = [
            last[0] + (Math.random() - 0.5) * 0.0002,
            last[1] + (Math.random() - 0.5) * 0.0002
          ];
          
          const d = calculateDistance(last[0], last[1], next[0], next[1]);
          setDistance(old => old + d);
          setCurrentPos(next);
          return [...prev, next];
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isSimulating, isRunning, isPaused]);

  // Calorias estimadas (Média de 60kcal por km)
  const getCalories = () => (distance * 60).toFixed(0);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await saveActivity({
        userId: user.uid,
        userName: user.displayName || "Corredor",
        userAvatar: user.photoURL,
        distance: Number(distance.toFixed(2)),
        time: formatTime(seconds),
        durationSeconds: seconds,
        pace: getPace(),
        calories: Number(getCalories()),
        route: path,
        type: "RUNNING"
      });
      
      toast.success("Corrida salva com sucesso!");
      navigate("/");
    } catch (error) {
      toast.error("Erro ao salvar corrida");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-top">
      {/* Premium Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-900/50">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-xl italic tracking-tighter text-purple-500 uppercase">
          {isRunning ? (isSimulating ? "SIMULANDO..." : "MONITORANDO") : "INICIAR TREINO"}
        </h1>
        <button 
          onClick={() => setIsSimulating(!isSimulating)}
          className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isSimulating ? 'bg-purple-500 border-purple-400 text-white' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
        >
          {isSimulating ? "OFF" : "SIMULAR"}
        </button>
      </header>

      {/* Map Content Section */}
      <div className="flex-1 relative mx-6 mt-6 rounded-[3rem] overflow-hidden bg-zinc-900 border border-zinc-800 shadow-inner group" style={{ minHeight: '350px' }}>
        <MapContainer 
          center={[-23.5505, -46.6333]} // Padrão SP
          zoom={16} 
          style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {path.length > 0 && (
            <Polyline 
              positions={path} 
              color="#9333ea" 
              weight={6}
              opacity={0.8}
            />
          )}
          {currentPos && (
             <>
               <Circle center={currentPos} radius={10} pathOptions={{ color: '#9333ea', fillColor: '#9333ea', fillOpacity: 0.8 }} />
               <RecenterMap coords={currentPos} />
             </>
          )}
          
          {/* Fallback Overlay se não houver GPS ou ainda não carregou a primeira posição */}
          {!currentPos && isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md z-[1000] pointer-events-none">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4 animate-pulse-glow">
                    <Navigation size={32} className="text-purple-500" />
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  BUSCANDO SINAL GPS...
                </p>
              </div>
            </div>
          )}
        </MapContainer>

        {/* Floating Mini Stats Group */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-6 right-6 grid grid-cols-2 gap-3 z-[1002]"
            >
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3 shadow-2xl">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <MapIcon size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">Pace</p>
                        <p className="text-sm font-black font-display italic leading-none">{getPace()}</p>
                    </div>
                </div>
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3 shadow-2xl">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                        <Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">Calorias</p>
                        <p className="text-sm font-black font-display italic leading-none">{getCalories()} kcal</p>
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
              {distance.toFixed(2)}
            </motion.p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2 italic">DISTÂNCIA TOTAL (KM)</p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-zinc-800">
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tempo</p>
              <p className="font-display font-black text-lg italic">{formatTime(seconds)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Ritmo</p>
              <p className="font-display font-black text-lg italic">{getPace()}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Velocidade</p>
              <p className="font-display font-black text-lg italic">{(distance > 0 ? (distance / (seconds / 3600)) : 0).toFixed(1)}</p>
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
                onClick={handleFinish}
                disabled={isSaving}
                className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 shadow-xl disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Square size={24} className="fill-current" />}
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
