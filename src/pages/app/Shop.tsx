import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Star,
  Tag,
  Zap,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/AuthContext";
import { getUserStats, getProducts, Product } from "@/service/database";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["Todos", "Tênis", "Roupas", "Acessórios", "Suplementos"];

// ─── Cart Item type ────────────────────────────────────────────────────────────
type CartItem = { product: Product; qty: number };

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={9}
        className={s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"}
      />
    ))}
  </div>
);

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
const CartDrawer = ({
  cart,
  onClose,
  onQty,
  onRemove,
}: {
  onClose: () => void;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) => {
  const [redeeming, setRedeeming] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const handleRedeem = async () => {
    setRedeeming(true);
    // Simular processamento
    await new Promise(r => setTimeout(r, 1500));
    
    const couponCode = `VELOXY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    toast.success(
      <div className="flex flex-col gap-2">
        <p className="font-bold">Oferta Resgatada! 🎉</p>
        <p className="text-xs">Use o cupom <span className="text-purple-500 font-black">{couponCode}</span> no site parceiro.</p>
      </div>,
      { duration: 5000 }
    );
    
    setRedeeming(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-[85vw] max-w-sm bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="font-display font-black text-lg italic text-white">CARRINHO</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 active:scale-95 transition-transform">
            <X size={16} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <ShoppingBag size={48} className="text-zinc-700" />
            <p className="font-black text-zinc-600 uppercase tracking-widest text-xs">Carrinho vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.map(({ product: p, qty }) => (
                <div key={p.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{p.name}</p>
                    <p className="text-purple-400 font-black text-sm">
                      R$ {(p.price * qty).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <button onClick={() => onRemove(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onQty(p.id, -1)} className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{qty}</span>
                      <button onClick={() => onQty(p.id, 1)} className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 pb-20 border-t border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm font-bold">Total</span>
                <span className="font-display font-black text-xl text-purple-400">
                  R$ {total.toLocaleString("pt-BR")}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full py-4 bg-purple-600 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-[0_5px_20px_rgba(147,51,234,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {redeeming ? <><Loader2 size={16} className="animate-spin" /> Processando...</> : "Resgatar Oferta"}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ─── Shop Page ─────────────────────────────────────────────────────────────────
const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [totalKm, setTotalKm] = useState("0.0");

  const userInitials = user?.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Load products from Firestore
  useEffect(() => {
    const loadStore = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar loja:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStore();
  }, []);

  // Load user's real km for the banner
  useEffect(() => {
    if (user) {
      getUserStats(user.uid).then((s) => setTotalKm(s.totalKm));
    }
  }, [user]);

  // How much discount the user earned based on km
  const earnedDiscount = useMemo(() => {
    const km = parseFloat(totalKm);
    if (km >= 100) return 20;
    if (km >= 50) return 15;
    if (km >= 20) return 10;
    if (km >= 5) return 5;
    return 0;
  }, [totalKm]);

  const nextMilestone = useMemo(() => {
    const km = parseFloat(totalKm);
    if (km >= 100) return null;
    if (km >= 50) return { target: 100, discount: 20 };
    if (km >= 20) return { target: 50, discount: 15 };
    if (km >= 5) return { target: 20, discount: 10 };
    return { target: 5, discount: 5 };
  }, [totalKm]);

  const filteredProducts = useMemo(
    () => activeCategory === "Todos" ? products : products.filter((p) => p.category === activeCategory),
    [activeCategory, products]
  );

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`${product.emoji} ${product.name} adicionado!`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.product.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 safe-top">

      {/* ── Header ── */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-md z-40 border-b border-zinc-900/50">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden active:scale-95 transition-transform"
        >
          {user?.photoURL
            ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-purple-500">{userInitials}</span>
          }
        </button>

        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          VELOXY SHOP
        </h1>

        {/* Cart button with real count */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 active:scale-95 transition-transform"
        >
          <ShoppingBag size={20} />
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black text-white"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </header>

      {/* ── Reward Banner (real km data) ── */}
      <section className="px-6 mt-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-[2.5rem] p-6 relative overflow-hidden shadow-[0_0_40px_rgba(147,51,234,0.25)]"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-white fill-white" />
              <span className="text-[9px] font-black tracking-widest uppercase text-white/80">
                RECOMPENSA DE KM
              </span>
            </div>

            {earnedDiscount > 0 ? (
              <>
                <h2 className="font-display text-3xl font-black italic leading-tight mb-1">
                  {earnedDiscount}% OFF
                </h2>
                <p className="text-xs text-purple-100/80 mb-3">
                  Desbloqueado com seus <span className="font-black text-white">{totalKm} km</span> percorridos!
                </p>
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-2 w-fit">
                  <CheckCircle size={14} className="text-green-300 fill-green-300" />
                  <span className="text-[10px] font-black text-white tracking-widest">DESCONTO ATIVO</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-black italic leading-tight mb-1">
                  Corra para <br /><span className="text-purple-200">ganhar desconto!</span>
                </h2>
                {nextMilestone && (
                  <p className="text-xs text-purple-100/80">
                    {nextMilestone.target - parseFloat(totalKm) < 0 ? 0 : (nextMilestone.target - parseFloat(totalKm)).toFixed(1)} km faltam para {nextMilestone.discount}% OFF
                  </p>
                )}
              </>
            )}

            {/* Progress bar to next milestone */}
            {nextMilestone && (
              <div className="mt-4">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((parseFloat(totalKm) / nextMilestone.target) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-white/60 font-bold">{totalKm} km</span>
                  <span className="text-[8px] text-white/60 font-bold">
                    <TrendingUp size={8} className="inline mr-0.5" />
                    {nextMilestone.target} km → {nextMilestone.discount}% OFF
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />
        </motion.div>
      </section>

      {/* ── Category Filter ── */}
      <section className="mt-8 px-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <motion.button
              key={c}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(c)}
              className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest whitespace-nowrap transition-all ${
                activeCategory === c
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              {c.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Products Grid ── */}
      <section className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            {filteredProducts.length} produtos
          </p>
          {earnedDiscount > 0 && (
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
              <Tag size={10} className="text-purple-400" />
              <span className="text-[9px] font-black text-purple-400">{earnedDiscount}% OFF ATIVO</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 gap-4">
            {loading ? (
              // Skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-4 animate-pulse">
                  <div className="aspect-square bg-zinc-800 rounded-[2rem] mb-4" />
                  <div className="h-3 w-12 bg-zinc-800 rounded-full mb-2" />
                  <div className="h-4 w-24 bg-zinc-800 rounded-full mb-3" />
                  <div className="h-8 w-full bg-zinc-800 rounded-xl" />
                </div>
              ))
            ) : filteredProducts.map((p, i) => {
              const inCart = cart.find((c) => c.product.id === p.id);
              const finalPrice = earnedDiscount > 0
                ? Math.round(p.price * (1 - earnedDiscount / 100))
                : p.price;

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-4 group"
                >
                  {/* Product image area */}
                  <div className={`aspect-square bg-gradient-to-br ${p.gradient} rounded-[2rem] relative flex items-center justify-center mb-4 border border-zinc-800/30`}>
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                      {p.emoji}
                    </span>
                    {p.tag && (
                      <span className="absolute top-2 left-2 text-[8px] font-black tracking-tighter bg-purple-600 px-2 py-0.5 rounded-full text-white">
                        {p.tag}
                      </span>
                    )}
                    {inCart && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle size={12} className="text-white fill-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-1 space-y-1">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{p.category}</p>
                    <h4 className="font-display font-black text-sm text-white italic truncate">{p.name}</h4>

                    <div className="flex items-center gap-1.5">
                      <StarRating rating={p.rating} />
                      <span className="text-[8px] text-zinc-600">({p.reviews})</span>
                    </div>

                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <p className={`text-base font-black leading-none ${earnedDiscount > 0 ? "text-green-400" : "text-purple-400"}`}>
                          R$ {finalPrice.toLocaleString("pt-BR")}
                        </p>
                        {(p.originalPrice || earnedDiscount > 0) && (
                          <p className="text-[9px] text-zinc-600 line-through leading-none mt-0.5">
                            R$ {p.price.toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => addToCart(p)}
                        className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(147,51,234,0.4)] active:scale-90 transition-transform"
                      >
                        <ShoppingCart size={15} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </section>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            cart={cart}
            onClose={() => setCartOpen(false)}
            onQty={updateQty}
            onRemove={removeFromCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shop;
