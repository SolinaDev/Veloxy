import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile, User } from "firebase/auth";
import { auth, db } from "@/firebase";
import { useAuth } from "@/hooks/AuthContext";
import { doc, setDoc } from "firebase/firestore";
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
import { getUserStats, getUserProfile, UserProfile } from "@/service/database";
import { getLevelFromXP } from "@/lib/gamification";
import { uploadAvatar } from "@/service/storage";

const achievements = [
  { icon: <Medal size={20} />, name: "Primeiro 5K", date: "Jan 2025" },
  { icon: <Award size={20} />, name: "10K Sub-50", date: "Mar 2025" },
  { icon: <Trophy size={20} />, name: "Meia Maratona", date: "Jul 2025" },
];

/* ===================== EDIT PROFILE MODAL ===================== */
function EditProfileModal({
  open,
  onClose,
  initialData,
  onSuccess,
  user
}: {
  open: boolean;
  onClose: () => void;
  initialData: { bio: string; location: string };
  onSuccess: () => void;
  user: User | null;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(initialData.location);
  const [bio, setBio] = useState(initialData.bio);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("O nome não pode ficar vazio");
      return;
    }
    setSaving(true);
    try {
      if (user) {
        // Atualizar Auth
        await updateProfile(user, { displayName: displayName.trim() });
        
        // Atualizar Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim()
        }, { merge: true });
      }
      toast.success("Perfil atualizado!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Erro ao atualizar perfil");
      console.error(err);
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
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
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
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Localização</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo, SP"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Minha Bio</label>
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
              className="w-full mt-4 bg-purple-600 py-5 rounded-3xl font-black tracking-widest text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50"
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
  const { user } = useAuth();
  
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statsData, setStatsData] = useState<any>(null);

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      const [userStats, userProfile] = await Promise.all([
        getUserStats(user.uid),
        getUserProfile(user.uid)
      ]);
      setStatsData(userStats);
      setProfile(userProfile);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      try {
        const file = e.target.files[0];
        toast.info("Fazendo upload da nova foto...");
        const newUrl = await uploadAvatar(file, user.uid);
        
        // Atualiza a View imediatamente
        setProfile(prev => prev ? { ...prev, photoURL: newUrl } : null);
        toast.success("Avatar atualizado com sucesso! Pode demorar alguns segundos pra atualizar em todas as telas.");
      } catch (err) {
        toast.error("Erro ao enviar foto. Verifique as configurações de Storage do projeto.");
      }
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const displayName = user?.displayName || "Corredor";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  
  // Níveis e Progressão
  const levelInfo = getLevelFromXP(profile?.totalXP || 0);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logout realizado");
      navigate("/login");
    } catch {
      toast.error("Erro ao fazer logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-purple-500" size={40} />
        <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Carregando Perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 safe-top">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-40">
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
          VELOXY PROFILE
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
      <section className="px-6 mt-8 flex flex-col items-center text-center">
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
        >
            <label className="block w-full h-full cursor-pointer relative group overflow-hidden rounded-[2.2rem]">
                {profile?.photoURL || user?.photoURL ? (
                    <img src={profile?.photoURL || user?.photoURL || ""} className="w-full h-full object-cover transition-all group-hover:opacity-40 group-hover:blur-[2px]" alt="avatar" />
                ) : (
                    <span className="text-4xl font-black font-display text-purple-500 w-full h-full flex items-center justify-center transition-all group-hover:opacity-40">{initials}</span>
                )}

                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center">
                    <Camera size={32} className="text-white drop-shadow-md" />
                </div>

                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div className="absolute -bottom-2 left-1/2 -track-x-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest border-2 border-black -translate-x-1/2 shadow-lg whitespace-nowrap z-10">
                LEVEL {levelInfo.currentLevel.toUpperCase()}
            </div>
        </motion.div>

        <h2 className="mt-8 font-display font-black text-3xl italic tracking-tighter uppercase">{displayName}</h2>
        <div className="flex items-center gap-1 mt-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
            <MapPin size={12} className="text-purple-500" />
            {(profile as any)?.location || "São Paulo, SP"}
        </div>
        <p className="mt-6 text-sm text-zinc-400 max-w-xs italic leading-relaxed">
            "{(profile as any)?.bio || 'Apaixonado por corrida e desafios urbanos.'}"
        </p>
      </section>

      {/* Momentum Cards (Stats) */}
      <section className="px-6 mt-10 grid grid-cols-2 gap-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem]"
            >
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total acumulado</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-display">{statsData?.totalKm || "0.0"}</span>
                    <span className="text-xs font-bold text-purple-500 italic">KM</span>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem]"
            >
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">XP Total</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-display">{profile?.totalXP?.toLocaleString("pt-BR") || "0"}</span>
                    <span className="text-xs font-bold text-orange-500 italic uppercase">XP</span>
                </div>
            </motion.div>
      </section>

      {/* Level Progress */}
      <section className="px-6 mt-8">
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Progresso do Nível</h3>
                <span className="text-xs font-black text-purple-500 uppercase">{levelInfo.nextLevel}</span>
            </div>
            <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden p-1 border border-zinc-800">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                />
            </div>
            <p className="mt-3 text-[10px] text-center font-bold text-zinc-600 italic">
              {levelInfo.xpToNext > 0 
                ? `Faltam ${levelInfo.xpToNext.toLocaleString("pt-BR")} XP para se tornar ${levelInfo.nextLevel.toUpperCase()}`
                : "Você atingiu o nível máximo!"}
            </p>
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

      <EditProfileModal 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        initialData={{
          bio: (profile as any)?.bio || "",
          location: (profile as any)?.location || ""
        }}
        onSuccess={fetchProfileData}
        user={user}
      />
    </div>
  );
};

export default Profile;

