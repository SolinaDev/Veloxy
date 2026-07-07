import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  BackgroundGeolocationPlugin,
  CallbackError,
  Location as BackgroundLocation,
} from "@capacitor-community/background-geolocation";
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
  Loader2,
  Music,
  X,
  ExternalLink
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/useAuth";
import { saveActivity } from "@/services/database";
import { toast } from "sonner";
import { getBestUserPhotoURL } from "@/lib/user-photo";

const BackgroundGeolocation =
  registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

type ScreenWakeLockSentinel = {
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
  };
};

const SIMULATED_ROUTE: [number, number][] = [
  [-23.55053, -46.63331],
  [-23.55038, -46.63308],
  [-23.55021, -46.63274],
  [-23.55008, -46.63235],
  [-23.55020, -46.63203],
  [-23.55048, -46.63182],
  [-23.55083, -46.63193],
  [-23.55108, -46.63224],
  [-23.55118, -46.63269],
  [-23.55105, -46.63309],
  [-23.55080, -46.63342],
  [-23.55051, -46.63368],
  [-23.55020, -46.63355],
  [-23.55007, -46.63322],
  [-23.55024, -46.63292],
  [-23.55055, -46.63278],
  [-23.55082, -46.63296],
  [-23.55093, -46.63331],
  [-23.55074, -46.63362],
  [-23.55053, -46.63331],
];

const getSaveErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return "Sem permissão no Firestore. Verifique se as regras foram publicadas.";
    }

    if (error.code === "invalid-argument") {
      return "Dados da corrida inválidos para o Firestore.";
    }

    if (error.code === "unavailable") {
      return "Firebase indisponível agora. Tente novamente em instantes.";
    }

    return `Erro Firebase: ${error.code}`;
  }

  return "Erro ao salvar corrida. Veja o console para detalhes.";
};

const getGpsErrorMessage = (error: GeolocationPositionError) => {
  if (!window.isSecureContext) {
    return "GPS real precisa de HTTPS no celular. Use o simulador ou abra por um link HTTPS.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Permissao de GPS negada. Libere a localizacao no navegador.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Localizacao indisponivel agora. Tente em uma area com melhor sinal.";
  }

  if (error.code === error.TIMEOUT) {
    return "Tempo esgotado ao buscar GPS. Tente novamente.";
  }

  return `Erro ao acessar GPS: ${error.message}`;
};

const getBackgroundGpsErrorMessage = (error: CallbackError) => {
  if (error.code === "NOT_AUTHORIZED") {
    return "Permissao de GPS negada. Libere a localizacao nas configuracoes do app.";
  }

  if (error.message) {
    return `Erro no GPS em segundo plano: ${error.message}`;
  }

  return "Erro no GPS em segundo plano.";
};

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
  const [trackingStatus, setTrackingStatus] = useState("Pronto para iniciar");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
  const simulatedPointRef = useRef(0);
  const isNativeAndroid = Capacitor.getPlatform() === "android";

  // Gerenciar Screen Wake Lock para PWA (Não deixar a tela do celular apagar/pausar o app)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;
        if (navigatorWithWakeLock.wakeLock) {
          wakeLockRef.current = await navigatorWithWakeLock.wakeLock.request("screen");
        }
      } catch (err) {
        console.error(`Wake Lock error: ${err}`);
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
        });
      }
    };

    if (isRunning && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => releaseWakeLock();
  }, [isRunning, isPaused]);

  // Auxiliar para centralizar o mapa
  const RecenterMap = ({ coords }: { coords: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(coords);
    }, [coords, map]);
    return null;
  };

  // Função para calcular distância entre dois pontos (Haversine)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const applyGpsPoint = useCallback((
    latitude: number,
    longitude: number,
    accuracy: number,
    speed: number | null,
    source: "web" | "background",
  ) => {
    setGpsAccuracy(accuracy);

    if (accuracy > 50) {
      setTrackingStatus("Sinal GPS fraco");
      if (source === "web") {
        toast.warning("Sinal de GPS fraco. Aguardando uma posicao melhor.");
      }
      return;
    }

    if (speed && speed > 8.33) {
      console.warn("Velocidade incompatÃ­vel com corrida. Trecho ignorado.");
      setTrackingStatus("Trecho ignorado por velocidade alta");
      return;
    }

    const newPoint: [number, number] = [latitude, longitude];
    setCurrentPos(newPoint);
    setTrackingStatus(source === "background" ? "GPS em segundo plano ativo" : "GPS conectado");

    setPath(prevPath => {
      if (prevPath.length > 0) {
        const lastPoint = prevPath[prevPath.length - 1];
        const d = calculateDistance(lastPoint[0], lastPoint[1], latitude, longitude);

        if (d > 0.005 && d < 0.5) {
          setDistance(prev => prev + d);
          return [...prevPath, newPoint];
        }
        return prevPath;
      }
      return [newPoint];
    });
  }, [calculateDistance]);

  // Cronômetro real
  // Busca sinal antes do usuário iniciar a gravação.
  useEffect(() => {
    if (isRunning || isSimulating) return undefined;

    if (!("geolocation" in navigator)) {
      setTrackingStatus("GPS indisponivel");
      return undefined;
    }

    if (!window.isSecureContext) {
      setTrackingStatus("GPS exige HTTPS");
      return undefined;
    }

    setTrackingStatus("Buscando sinal GPS");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(accuracy);
        setCurrentPos([latitude, longitude]);
        setTrackingStatus(accuracy <= 50 ? "GPS pronto" : "Sinal GPS fraco");
      },
      (error) => {
        console.error("GPS preflight error:", error);
        setTrackingStatus(getGpsErrorMessage(error));
      },
      { enableHighAccuracy: true, maximumAge: 1000 * 10, timeout: 12000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isRunning, isSimulating]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Rastreamento GPS real
  useEffect(() => {
    let watchId: number | undefined;

    if (isNativeAndroid) return undefined;

    if (isRunning && !isPaused && !isSimulating && "geolocation" in navigator) {
      if (!window.isSecureContext) {
        setTrackingStatus("GPS exige HTTPS");
        toast.error("GPS real precisa de HTTPS no celular. Ative o simulador ou use um link HTTPS.", { duration: 8000 });
        return;
      }

      setTrackingStatus("Buscando sinal GPS");
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          console.log(`GPS Success: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}m`);

          if (accuracy > 50) {
            setTrackingStatus("Sinal GPS fraco");
            toast.warning("Sinal de GPS fraco. Aguardando uma posição melhor.");
            return;
          }

          // Anti-Cheat: Se a velocidade exceder 30km/h (8.33 m/s), o cara pode estar num carro/bike
          if (speed && speed > 8.33) {
            console.warn("Velocidade incompatível com corrida. Trecho ignorado.");
            setTrackingStatus("Trecho ignorado por velocidade alta");
            return;
          }
          
          const newPoint: [number, number] = [latitude, longitude];
          setCurrentPos(newPoint);
          setTrackingStatus("GPS conectado");

          setPath(prevPath => {
            if (prevPath.length > 0) {
              const lastPoint = prevPath[prevPath.length - 1];
              const d = calculateDistance(lastPoint[0], lastPoint[1], latitude, longitude);
              
              // Filtro de Ruído Geográfico:
              // Limite superior de pulo: mais que 500m (0.5km) entre duas coletas é falha grossa do GPS
              if (d > 0.005 && d < 0.5) { 
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
          setTrackingStatus("Erro no GPS");
          toast.error(getGpsErrorMessage(error), { duration: 8000 });
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    } else if (isRunning && !isPaused && !isSimulating && !("geolocation" in navigator)) {
      setTrackingStatus("GPS indisponivel");
      toast.error("GPS não disponível neste dispositivo.");
    }

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [calculateDistance, isNativeAndroid, isRunning, isPaused, isSimulating]);

  // Rastreamento GPS nativo no Android. Mantem a corrida ativa com notificacao fixa.
  useEffect(() => {
    let watcherId: string | null = null;
    let cancelled = false;

    if (!isNativeAndroid || !isRunning || isPaused || isSimulating) {
      return undefined;
    }

    setTrackingStatus("Ativando GPS em segundo plano");

    BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: "Runnex gravando corrida",
        backgroundMessage: "Sua corrida continua sendo registrada enquanto o app esta em segundo plano.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 5,
      },
      (location?: BackgroundLocation, error?: CallbackError) => {
        if (error) {
          console.error("Background GPS Error:", error);
          setTrackingStatus("Erro no GPS em segundo plano");
          toast.error(getBackgroundGpsErrorMessage(error), { duration: 8000 });
          return;
        }

        if (!location) return;

        applyGpsPoint(
          location.latitude,
          location.longitude,
          location.accuracy,
          location.speed,
          "background",
        );
      },
    ).then((id) => {
      if (cancelled) {
        BackgroundGeolocation.removeWatcher({ id }).catch((error) => {
          console.warn("Nao foi possivel remover watcher nativo:", error);
        });
        return;
      }

      watcherId = id;
    }).catch((error: CallbackError) => {
      console.error("Erro ao iniciar GPS em segundo plano:", error);
      setTrackingStatus("Erro no GPS em segundo plano");
      toast.error(getBackgroundGpsErrorMessage(error), { duration: 8000 });
    });

    return () => {
      cancelled = true;
      if (watcherId) {
        BackgroundGeolocation.removeWatcher({ id: watcherId }).catch((error) => {
          console.warn("Nao foi possivel remover watcher nativo:", error);
        });
      }
    };
  }, [applyGpsPoint, isNativeAndroid, isRunning, isPaused, isSimulating]);

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
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isSimulating && isRunning && !isPaused) {
      setTrackingStatus("Simulando corrida");
      
      interval = setInterval(() => {
        setPath(prev => {
          const last = prev.length > 0 ? prev[prev.length - 1] : SIMULATED_ROUTE[0];
          const routeIndex = simulatedPointRef.current % SIMULATED_ROUTE.length;
          const next = SIMULATED_ROUTE[routeIndex];
          simulatedPointRef.current += 1;
          
          const d = calculateDistance(last[0], last[1], next[0], next[1]);
          if (prev.length > 0) {
            setDistance(old => old + d);
          }
          setCurrentPos(next);
          return [...prev, next];
        });
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [calculateDistance, isSimulating, isRunning, isPaused]);

  // Calorias estimadas (Média de 60kcal por km)
  const getCalories = () => (distance * 60).toFixed(0);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const startPoint = !isSimulating ? currentPos : null;
    setDistance(0);
    setSeconds(0);
    setPath(startPoint ? [startPoint] : []);
    setCurrentPos(startPoint);
    simulatedPointRef.current = 0;
    setTrackingStatus(isSimulating ? "Preparando simulacao" : startPoint ? "GPS pronto" : "Buscando sinal GPS");
    setIsPaused(false);
    setIsRunning(true);
  };

  const handleFinish = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await saveActivity({
        userId: user.uid,
        userName: user.displayName || "Corredor",
        userAvatar: getBestUserPhotoURL(user),
        distance: Number(distance.toFixed(2)),
        time: formatTime(seconds),
        durationSeconds: seconds,
        pace: getPace(),
        calories: Number(getCalories()),
        route: path.map(([lat, lng]) => ({ lat, lng })),
        type: "RUNNING"
      });
      
      toast.success("Corrida salva com sucesso!");
      navigate("/");
    } catch (error) {
      console.error("Erro ao finalizar corrida:", error);
      toast.error(getSaveErrorMessage(error), { duration: 8000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-top">
      {/* Premium Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-2xl z-40 border-b border-zinc-900/60 shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
      >
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full premium-panel flex items-center justify-center text-zinc-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <motion.h1
          key={`${isRunning}-${isPaused}-${isSimulating}`}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="font-display font-black text-xl italic tracking-tighter text-purple-500 uppercase drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]"
        >
          {isRunning ? (isPaused ? "PAUSADO" : isSimulating ? "SIMULANDO..." : "MONITORANDO") : "INICIAR TREINO"}
        </motion.h1>
        <button 
          onClick={() => setIsSimulating(!isSimulating)}
          className={`text-[10px] font-black px-3 py-2 rounded-2xl border transition-colors ${isSimulating ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_18px_rgba(147,51,234,0.35)]' : 'premium-panel text-zinc-500'}`}
        >
          {isSimulating ? "OFF" : "SIMULAR"}
        </button>
      </motion.header>

      {/* Map Content Section */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.08 }}
        className="flex-1 relative mx-6 mt-6 rounded-[3rem] overflow-hidden premium-surface premium-line shadow-inner group"
        style={{ minHeight: '350px' }}
      >
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
          {!currentPos && !isSimulating && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md z-[1000] pointer-events-none">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4 animate-float animate-soft-glow">
                    <Navigation size={32} className="text-purple-500" />
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  {isRunning ? "BUSCANDO SINAL GPS..." : "AGUARDANDO SINAL GPS..."}
                </p>
              </div>
            </div>
          )}
        </MapContainer>

        <div className="absolute bottom-5 left-6 right-6 z-[1002] flex items-center justify-between rounded-3xl premium-panel px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isPaused ? "bg-yellow-400" : currentPos ? "bg-green-400 animate-status-pulse" : isRunning ? "bg-purple-400 animate-status-pulse" : "bg-zinc-600"}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
              {isPaused ? "Pausado" : trackingStatus}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
            {gpsAccuracy ? `${gpsAccuracy.toFixed(0)}m` : `${path.length} pontos`}
          </span>
        </div>

        {/* Floating Mini Stats Group */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-6 right-6 grid grid-cols-2 gap-3 z-[1002]"
            >
                <div className="premium-panel rounded-3xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <MapIcon size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">Pace</p>
                        <p className="text-sm font-black font-display italic leading-none">{getPace()}</p>
                    </div>
                </div>
                <div className="premium-panel rounded-3xl p-4 flex items-center gap-3">
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
      </motion.div>

      {/* Primary Running Stats Card */}
      <section className="px-6 py-8">
        <motion.div 
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="premium-surface premium-line rounded-[3rem] p-8"
        >
          <div className="text-center mb-10">
            <motion.p
              key={isRunning ? "running" : "idle"}
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.96, 1.03, 1] }}
              transition={{ duration: 0.32 }}
              className="text-7xl font-display font-black text-purple-500 italic tracking-tighter drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]"
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
            <>
              <motion.button
                initial={{ opacity: 0, scale: 0.82, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMusicOpen(true)}
                className="w-16 h-16 rounded-3xl premium-panel flex items-center justify-center text-purple-500 active:scale-95 transition-transform"
                aria-label="Abrir musica"
              >
                <Music size={24} />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.82, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleStart}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-[0_14px_44px_rgba(147,51,234,0.48)] border-4 border-black group animate-soft-glow"
              >
                <Play size={40} className="text-white fill-current ml-2 group-hover:scale-110 transition-transform" />
              </motion.button>
              <div className="w-16 h-16" aria-hidden="true" />
            </>
          ) : (
            <>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleFinish}
                disabled={isSaving}
                className="w-16 h-16 rounded-3xl premium-panel flex items-center justify-center text-red-500 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Square size={24} className="fill-current" />}
              </motion.button>
              
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.06 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPaused(!isPaused)}
                className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center shadow-[0_16px_42px_rgba(255,255,255,0.16)] border-4 border-black group active:scale-95 transition-transform"
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
                transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.12 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMusicOpen(true)}
                className="w-16 h-16 rounded-3xl premium-panel flex items-center justify-center text-purple-500 active:scale-95 transition-transform"
              >
                <Music size={24} />
              </motion.button>
            </>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {isMusicOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-md"
              onClick={() => setIsMusicOpen(false)}
            />
            <div className="fixed inset-0 z-[1210] flex items-end justify-center p-4 pointer-events-none sm:items-center">
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.96 }}
                className="premium-surface pointer-events-auto w-full max-w-md rounded-[2rem] p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">Treino</p>
                    <h2 className="font-display text-2xl font-black italic text-purple-500">Musica</h2>
                  </div>
                  <button
                    onClick={() => setIsMusicOpen(false)}
                    className="premium-panel flex h-10 w-10 items-center justify-center rounded-full text-zinc-400"
                    aria-label="Fechar musica"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                  Abra sua playlist antes ou durante a corrida. O Veloxy continua acompanhando o treino quando você voltar para o app.
                </p>
                <div className="grid gap-3">
                  {[
                    { label: "Spotify", url: "https://open.spotify.com/search/running%20playlist" },
                    { label: "YouTube Music", url: "https://music.youtube.com/search?q=running+playlist" },
                    { label: "Deezer", url: "https://www.deezer.com/search/running%20playlist" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                      className="premium-panel flex items-center justify-between rounded-2xl px-4 py-4 text-left text-sm font-black"
                    >
                      {item.label}
                      <ExternalLink size={16} className="text-purple-500" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RunTracking;
