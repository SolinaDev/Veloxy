import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "firebase/auth";
import { auth } from "@/firebase";
import { toast } from "sonner";
import {
  Settings,
  ChevronRight,
  MapPin,
  Trophy,
  Flame,
  Calendar,
  Medal,
  Pencil,
  X,
  LogOut,
  Camera,
  User,
  Mail,
  Save,
  Loader2,
  TrendingUp,
  Award,
  Zap
} from "lucide-react";

/* ── mock data (futuro: vir do backend) ── */
const stats = [
  { label: "Total km", value: "847", icon: <MapPin size={16} /> },
  { label: "Corridas", value: "124", icon: <Calendar size={16} /> },
  { label: "Pontos", value: "2,450", icon: <Flame size={16} /> },
  { label: "Ranking", value: "#4", icon: <Trophy size={16} /> },
];

const achievements = [
  { icon: <Medal size={20} />, name: "Primeiro 5K", date: "Jan 2025" },
  { icon: <Award size={20} />, name: "10K Sub-50", date: "Mar 2025" },
  { icon: <Trophy size={20} />, name: "Meia Maratona", date: "Jul 2025" },
];

const levelThresholds = [
  { name: "Iniciante", minKm: 0 },
  { name: "Corredor", minKm: 100 },
  { name: "Avançado", minKm: 500 },
  { name: "Elite", minKm: 1000 },
];

function getUserLevel(totalKm: number) {
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalKm >= levelThresholds[i].minKm) {
      const current = levelThresholds[i];
      const next = levelThresholds[i + 1];
      return {
        name: current.name,
        progress: next
          ? ((totalKm - current.minKm) / (next.minKm - current.minKm)) * 100
          : 100,
        nextLevel: next?.name || null,
        nextKm: next?.minKm || null,
      };
    }
  }
  return { name: "Iniciante", progress: 0, nextLevel: "Corredor", nextKm: 100 };
}

/* ===================== EDIT PROFILE MODAL ===================== */
function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(() => localStorage.getItem(`veloxy_location_${user?.uid}`) || "");
  const [bio, setBio] = useState(() => localStorage.getItem(`veloxy_bio_${user?.uid}`) || "");

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("O nome não pode ficar vazio");
      return;
    }
    setSaving(true);
    try {
      if (user) {
        await updateProfile(user, { displayName: displayName.trim() });
        localStorage.setItem(`veloxy_location_${user.uid}`, location.trim());
        localStorage.setItem(`veloxy_bio_${user.uid}`, bio.trim());
      }
      toast.success("Perfil atualizado!");
      onClose();
    } catch (err) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 transition-all"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 rounded-t-[3rem] p-8 safe-bottom"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-black italic text-purple-500">EDITAR PERFIL</h2>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Nome de Corredor</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                  </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-8 bg-purple-600 py-5 rounded-3xl font-black tracking-widest text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50"
            >
              {saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ===================== PROFILE PAGE ===================== */
const Profile = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [editOpen, setEditOpen] = useState(false);

  const displayName = user?.displayName || "Corredor";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const location = localStorage.getItem(`veloxy_location_${user?.uid}`) || "São Paulo, SP";
  const bio = localStorage.getItem(`veloxy_bio_${user?.uid}`) || "Apaixonado por corrida e desafios urbanos.";

  const totalKm = 847;
  const level = getUserLevel(totalKm);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logout realizado");
      navigate("/login");
    } catch {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40">
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          KINETIC PROFILE
        </h1>
        <div className="flex gap-2">
            <button
                onClick={() => setEditOpen(true)}
                className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400"
            >
                <Pencil size={18} />
            </button>
            <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 mt-8 flex flex-col items-center">
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
        >
            <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-900 border-2 border-purple-500 p-1 flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.2)]">
                {user?.photoURL ? (
                    <img src={user.photoURL} className="w-full h-full rounded-[2.2rem] object-cover" alt="avatar" />
                ) : (
                    <span className="text-4xl font-black font-display text-purple-500">{initials}</span>
                )}
            </div>
            <div className="absolute -bottom-2 left-1/2 -track-x-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest border-2 border-black -translate-x-1/2">
                LEVEL ELITE
            </div>
        </motion.div>

        <h2 className="mt-8 font-display font-black text-3xl italic tracking-tighter">{displayName.toUpperCase()}</h2>
        <div className="flex items-center gap-1 mt-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
            <MapPin size={12} className="text-purple-500" />
            {location}
        </div>
        <p className="mt-6 text-sm text-center text-zinc-400 max-w-xs italic leading-relaxed">
            "{bio}"
        </p>
      </section>

      {/* Momentum Cards (Stats) */}
      <section className="px-6 mt-10 grid grid-cols-2 gap-4">
          {stats.slice(0, 2).map((s, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem]"
            >
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{s.label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-display">{s.value}</span>
                    <span className="text-xs font-bold text-purple-500 italic">{s.label === "Total km" ? "KM" : ""}</span>
                </div>
            </motion.div>
          ))}
      </section>

      {/* Level Progress */}
      <section className="px-6 mt-8">
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black tracking-widest text-zinc-500">PRÓXIMO NÍVEL</h3>
                <span className="text-xs font-black text-purple-500">LENDA • 1000 KM</span>
            </div>
            <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden p-1 border border-zinc-800">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "84%" }}
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                />
            </div>
            <p className="mt-3 text-[10px] text-center font-bold text-zinc-600 italic">Faltam 153km para se tornar uma LENDA</p>
        </div>
      </section>

      {/* Achievements Horizontal */}
      <section className="mt-10">
          <div className="px-6 flex items-center justify-between mb-4">
            <h3 className="font-display font-black text-sm italic tracking-tighter">CONQUISTAS</h3>
            <button className="text-[10px] font-black text-purple-500 italic">VER TODAS</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-6">
              {achievements.map((a, i) => (
                <div key={i} className="min-w-[140px] bg-zinc-900 border border-zinc-800 p-5 rounded-[2rem] flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        {a.icon}
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black leading-tight uppercase">{a.name}</p>
                        <p className="text-[8px] font-bold text-zinc-600 mt-1">{a.date}</p>
                    </div>
                </div>
              ))}
          </div>
      </section>

      {/* Logout Button */}
      <div className="px-6 mt-12 pb-6">
        <button 
            onClick={handleLogout}
            className="w-full bg-zinc-900 border border-zinc-800/50 py-4 rounded-3xl text-[10px] font-black tracking-widest text-zinc-500 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
        >
            <LogOut size={16} />
            SAIR DA CONTA
        </button>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
};

export default Profile;
