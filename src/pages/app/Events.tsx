import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, ChevronRight, Bell, Tag, Clock, Loader2, CheckCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { 
  getEvents, 
  getUserEvents, 
  joinEvent, 
  getUserProfile,
  RunningEvent 
} from "@/service/database";
import { toast } from "sonner";

const categories = ["Próximos", "Inscrito", "Passados"];

const Events = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<RunningEvent[]>([]);
    const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Próximos");
    const [userCity, setUserCity] = useState("");

    const userInitials = user?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                
                // Pegar cidade do perfil
                const profile = await getUserProfile(user.uid);
                const city = profile?.location || "";
                setUserCity(city);
                setEnrolledIds((profile as any)?.enrolledEvents || []);

                // Buscar todos os eventos ordenados/filtrados por cidade
                const allEvents = await getEvents(city);
                setEvents(allEvents);
            } catch (error) {
                console.error("Erro ao carregar eventos:", error);
                toast.error("Não foi possível carregar os eventos.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const handleJoin = async (eventId: string) => {
        if (!user) return;
        if (enrolledIds.includes(eventId)) {
            toast.info("Você já está inscrito neste evento!");
            return;
        }

        try {
            await joinEvent(eventId, user.uid);
            setEnrolledIds(prev => [...prev, eventId]);
            toast.success("Inscrição realizada com sucesso! 🏃‍♂️");
        } catch (error) {
            toast.error("Erro ao realizar inscrição.");
        }
    };

    const filteredEvents = useMemo(() => {
        if (activeTab === "Inscrito") {
            return events.filter(e => enrolledIds.includes(e.id));
        }
        if (activeTab === "Passados") {
            return events.filter(e => new Date(e.timestamp?.seconds * 1000) < new Date());
        }
        return events; // Próximos
    }, [events, activeTab, enrolledIds]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-purple-500" size={40} />
                <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Buscando Corridas...</p>
            </div>
        );
    }

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-900/50">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-purple-500">{userInitials}</span>
          )}
        </div>
        
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          VELOXY EVENTS
        </h1>
        
        <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
          <Calendar size={18} />
        </button>
      </header>

      {/* Categories Horizontal */}
      <section className="mt-8 px-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveTab(c)}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                activeTab === c
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Event Banner */}
      <section className="px-6 mt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative h-64 rounded-[3rem] overflow-hidden border border-zinc-800/50 cursor-pointer shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
              <img src={events[0].image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="featured" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="bg-purple-600 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-purple-600/30">EM BREVE</div>
                      <div className="bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">Geral</div>
                  </div>
                  <h2 className="font-display font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none">{events[0].title}</h2>
                  <div className="flex items-center gap-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-purple-500" /> {events[0].date}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={12} className="text-purple-500" /> SÃO PAULO</span>
                  </div>
              </div>
          </motion.div>
      </section>

      {/* All Events List */}
      <section className="mt-12 px-6 pb-10 space-y-8">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-black text-sm italic tracking-tighter uppercase">Todas as Corridas</h3>
            <span className="text-[10px] font-black text-zinc-500 tracking-widest">3 DISPONÍVEIS</span>
        </div>

        {!filteredEvents.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <Calendar size={48} className="text-zinc-800" />
                <p className="font-black text-zinc-600 uppercase tracking-widest text-xs">
                    Nenhum evento encontrado nesta categoria
                </p>
            </div>
        ) : filteredEvents.map((event, i) => {
          const isInscrito = enrolledIds.includes(event.id);
          const isLocal = userCity && event.city.toLowerCase().includes(userCity.split(",")[0].toLowerCase().trim());

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-zinc-900/40 border rounded-[2.5rem] p-5 flex flex-col gap-6 transition-all ${
                isLocal ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_30px_rgba(147,51,234,0.05)]" : "border-zinc-800/50"
              }`}
            >
               <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-[2rem] overflow-hidden border border-zinc-800 relative flex-shrink-0">
                      <img src={event.image} className="w-full h-full object-cover" alt="event" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                          <Tag size={12} className="text-purple-500" />
                      </div>
                      {isLocal && (
                        <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-[7px] font-black text-center py-0.5">PERTO DE VOCÊ</div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-display font-black text-lg italic tracking-tighter uppercase truncate leading-tight mb-1">{event.title}</h4>
                      <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold tracking-widest uppercase leading-none">
                              <Clock size={10} className="text-purple-500" /> {event.date} • 07:00 AM
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold tracking-widest uppercase leading-none mt-1">
                              <MapPin size={10} className="text-purple-500" /> {event.location}
                          </div>
                      </div>
                  </div>
               </div>
  
               <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                  <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Inscrição</p>
                          <p className="text-sm font-black text-purple-500 italic uppercase leading-none">{event.price}</p>
                      </div>
                      <div className="w-[1px] h-6 bg-zinc-800/50" />
                      <div className="flex flex-col">
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Inscritos</p>
                          <div className="flex items-center gap-1 leading-none">
                              <Users size={10} className="text-zinc-500" />
                              <span className="text-[10px] font-black text-white">{event.participantsCount}</span>
                          </div>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => handleJoin(event.id)}
                    disabled={isInscrito}
                    className={`h-12 px-6 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isInscrito 
                        ? "bg-green-500/20 border border-green-500/30 text-green-500" 
                        : "bg-purple-600 text-white border border-purple-500 shadow-purple-600/20 hover:scale-105 active:scale-95"
                    }`}
                  >
                        {isInscrito ? (
                            <><CheckCircle size={16} /> <span className="text-[10px] font-black tracking-widest uppercase">Inscrito</span></>
                        ) : (
                            <><span className="text-[10px] font-black tracking-widest uppercase">Inscrever</span> <ChevronRight size={16} strokeWidth={3} /></>
                        )}
                  </button>
               </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
};

export default Events;
