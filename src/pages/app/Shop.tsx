import { motion } from "framer-motion";
import { ShoppingCart, Star, Tag } from "lucide-react";

const products = [
  {
    name: "Nike Pegasus 41",
    category: "Tênis",
    price: "R$ 899",
    originalPrice: "R$ 999",
    discount: "10%",
    rating: 4.8,
    tag: "Popular",
  },
  {
    name: "Camiseta Dry-Fit Pro",
    category: "Roupas",
    price: "R$ 149",
    originalPrice: null,
    discount: null,
    rating: 4.5,
    tag: null,
  },
  {
    name: "Relógio GPS Runner",
    category: "Acessórios",
    price: "R$ 1.299",
    originalPrice: "R$ 1.499",
    discount: "13%",
    rating: 4.9,
    tag: "Recomendado",
  },
  {
    name: "Whey Protein 900g",
    category: "Suplementos",
    price: "R$ 189",
    originalPrice: null,
    discount: null,
    rating: 4.3,
    tag: null,
  },
  {
    name: "Shorts Running Ultra",
    category: "Roupas",
    price: "R$ 119",
    originalPrice: "R$ 159",
    discount: "25%",
    rating: 4.6,
    tag: "Desconto km",
  },
  {
    name: "Meias Compressão Pro",
    category: "Acessórios",
    price: "R$ 69",
    originalPrice: null,
    discount: null,
    rating: 4.4,
    tag: null,
  },
];

const categories = ["Todos", "Tênis", "Roupas", "Acessórios", "Suplementos"];

const Shop = () => {
  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Loja</h1>
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              2
            </span>
          </button>
        </div>
      </div>

      {/* Discount Banner */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-lime rounded-xl p-4 flex items-center gap-3">
          <Tag size={24} className="text-primary-foreground" />
          <div>
            <p className="text-primary-foreground font-display font-bold text-sm">
              Desconto por Performance!
            </p>
            <p className="text-primary-foreground/70 text-xs">
              Seus 98.5km dão 10% extra em toda loja
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((c, i) => (
            <button
              key={c}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {products.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="aspect-square bg-muted relative flex items-center justify-center">
              <span className="text-3xl">👟</span>
              {p.tag && (
                <span className="absolute top-2 left-2 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {p.tag}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs text-muted-foreground">{p.category}</p>
              <h4 className="font-display font-semibold text-sm text-foreground truncate">
                {p.name}
              </h4>
              <div className="flex items-center gap-1 mt-1">
                <Star size={10} className="text-primary fill-primary" />
                <span className="text-[10px] text-muted-foreground">{p.rating}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-display font-bold text-sm text-primary">{p.price}</span>
                {p.originalPrice && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    {p.originalPrice}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
