import { motion } from "framer-motion";
import { 
  ShoppingCart, 
  Star, 
  Tag, 
  ChevronRight, 
  Zap,
  ShoppingBag,
  Bell
} from "lucide-react";
import { auth } from "@/firebase";

const products = [
  {
    name: "Nike Pegasus 41",
    category: "Tênis",
    price: "R$ 899",
    originalPrice: "R$ 999",
    rating: 4.8,
    tag: "POPULAR",
    icon: "👟"
  },
  {
    name: "Relógio GPS Pro",
    category: "Acessórios",
    price: "R$ 1.299",
    originalPrice: "R$ 1.499",
    rating: 4.9,
    tag: "NOVO",
    icon: "⌚"
  },
  {
    name: "Camiseta Dry-Fit",
    category: "Roupas",
    price: "R$ 149",
    originalPrice: null,
    rating: 4.5,
    tag: null,
    icon: "👕"
  },
  {
    name: "Whey Protein Pro",
    category: "Suplementos",
    price: "R$ 189",
    originalPrice: null,
    rating: 4.3,
    tag: null,
    icon: "🥤"
  }
];

const categories = ["Todos", "Tênis", "Roupas", "Acessórios", "Suplementos"];

const Shop = () => {
  const user = auth.currentUser;
  const userInitials = user?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-purple-500">{userInitials}</span>
          )}
        </div>
        
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          KINETIC SHOP
        </h1>
        
        <button className="relative w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ShoppingBag size={20} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black">
            2
          </span>
        </button>
      </header>

      {/* Performance Reward Banner */}
      <section className="px-6 mt-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-[2.5rem] p-6 relative overflow-hidden shadow-[0_0_30px_rgba(147,51,234,0.3)]"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="max-w-[70%]">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-white fill-white" />
                <span className="text-[10px] font-black tracking-widest uppercase text-white/80">RECOMPENSA DE KM</span>
              </div>
              <h2 className="font-display text-2xl font-black italic leading-tight mb-2">
                10% OFF EXTRA <br /> <span className="text-purple-200">NA NIKE</span>
              </h2>
              <p className="text-xs text-purple-100/70">Pelo seu recorde de 42.8km esta semana!</p>
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Tag size={32} className="text-white" />
            </div>
          </div>
          {/* Shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
        </motion.div>
      </section>

      {/* Categories Horizontal */}
      <section className="mt-8 px-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map((c, i) => (
            <button
              key={c}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                i === 0
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-6 mt-8 grid grid-cols-2 gap-4">
        {products.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-4 group"
          >
            <div className="aspect-square bg-zinc-900 rounded-[2rem] relative flex items-center justify-center mb-4 transition-colors group-hover:bg-zinc-800/80">
              <span className="text-5xl group-hover:scale-110 transition-transform">{p.icon}</span>
              {p.tag && (
                <span className="absolute top-3 left-3 text-[9px] font-black tracking-tighter bg-purple-600 px-2 py-0.5 rounded-full text-white">
                  {p.tag}
                </span>
              )}
            </div>
            <div className="px-2">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none mb-1">{p.category}</p>
              <h4 className="font-display font-black text-sm text-white italic truncate mb-2">
                {p.name}
              </h4>
              <div className="flex items-center justify-between mt-auto">
                <div>
                    <p className="text-sm font-black text-purple-500 leading-none">{p.price}</p>
                    {p.originalPrice && (
                    <p className="text-[10px] text-zinc-600 line-through leading-none mt-1">
                        {p.originalPrice}
                    </p>
                    )}
                </div>
                <button className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Star size={14} className={p.rating >= 4.5 ? "fill-current" : ""} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* View More Button */}
      <div className="px-6 mt-8">
        <button className="w-full bg-zinc-900 border border-zinc-800 py-4 rounded-3xl text-sm font-black tracking-widest text-zinc-400 flex items-center justify-center gap-2 hover:text-white transition-colors">
          VER MAIS PROMOÇÕES <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Shop;
