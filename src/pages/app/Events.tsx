import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ChevronRight, Star } from "lucide-react";

const events = [
  {
    title: "Corrida Noturna SP",
    date: "15 Mar 2026",
    location: "Parque Ibirapuera, São Paulo",
    distance: "10km",
    participants: 2340,
    price: "R$ 89",
    featured: true,
  },
  {
    title: "Meia Maratona RJ",
    date: "22 Mar 2026",
    location: "Aterro do Flamengo, Rio de Janeiro",
    distance: "21km",
    participants: 5100,
    price: "R$ 150",
    featured: false,
  },
  {
    title: "Trail Run Serra",
    date: "05 Abr 2026",
    location: "Serra da Cantareira, SP",
    distance: "15km",
    participants: 800,
    price: "R$ 120",
    featured: false,
  },
  {
    title: "Maratona de Curitiba",
    date: "19 Abr 2026",
    location: "Centro, Curitiba",
    distance: "42km",
    participants: 3200,
    price: "R$ 200",
    featured: false,
  },
];

const Events = () => {
  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Eventos</h1>
        <p className="text-muted-foreground text-sm mt-1">Corridas perto de você</p>
      </div>

      {/* Featured */}
      <div className="px-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-primary/30 rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={10} />
            Destaque
          </div>
          <h3 className="font-display font-bold text-lg text-foreground mb-1">
            {events[0].title}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
            <Calendar size={12} />
            {events[0].date}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
            <MapPin size={12} />
            {events[0].location}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {events[0].distance}
              </span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                <Users size={10} />
                {events[0].participants.toLocaleString()}
              </span>
            </div>
            <span className="font-display font-bold text-primary">{events[0].price}</span>
          </div>
        </motion.div>
      </div>

      {/* List */}
      <div className="px-5">
        <h2 className="font-display font-semibold text-foreground mb-3">Próximos Eventos</h2>
        <div className="space-y-3">
          {events.slice(1).map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-foreground">
                  {e.date.split(" ")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {e.date.split(" ")[1]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-sm text-foreground truncate">
                  {e.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{e.location}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-primary font-medium">{e.distance}</span>
                  <span className="text-[10px] text-muted-foreground">{e.price}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Events;
