import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ChevronRight, Bell, Tag, Clock } from "lucide-react";
import { auth } from "@/firebase";

const events = [
  {
    id: 1,
    title: "Maratona de São Paulo 2025",
    date: "15 JUN",
    location: "Parque do Ibirapuera",
    participants: 1250,
    category: "MARATONA",
    image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=800&auto=format&fit=crop",
    price: "R$ 120"
  },
  {
    id: 2,
    title: "Night Run: Edição Verão",
    date: "22 MAR",
    location: "Marginal Pinheiros",
    participants: 450,
    category: "10K / 5K",
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
    price: "R$ 85"
  },
  {
    id: 3,
    title: "Eco Trail: Serra do Mar",
    date: "08 ABR",
    location: "Trilha da Mantiqueira",
    participants: 120,
    category: "TRAIL RUN",
    image: "https://images.unsplash.com/photo-1541625602330-2277a1cd13a1?q=80&w=800&auto=format&fit=crop",
    price: "GRATUITO"
  }
];

const categories = ["Próximos", "Inscrito", "Passados", "Clubes"];

const Events = () => {
    const user = auth.currentUser;
    const userInitials = user?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

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
          {categories.map((c, i) => (
            <button
              key={c}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                i === 0
                  ? "bg-white text-black"
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

        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-5 flex flex-col gap-6"
          >
             <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border border-zinc-800 relative flex-shrink-0">
                    <img src={event.image} className="w-full h-full object-cover" alt="event" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                        <Tag size={12} className="text-purple-500" />
                    </div>
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
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Vagas</p>
                        <div className="flex items-center gap-1 leading-none">
                            <Users size={10} className="text-zinc-500" />
                            <span className="text-[10px] font-black text-white">{event.participants}</span>
                        </div>
                    </div>
                </div>
                
                <button className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-500 hover:bg-purple-600 hover:text-white transition-all shadow-lg">
                    <ChevronRight size={20} strokeWidth={3} />
                </button>
             </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default Events;
