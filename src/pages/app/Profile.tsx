import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile, User } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
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
  Mail,
  Save,
  Loader2,
  TrendingUp,
  Award,
  Zap,
  Moon,
  Sun,
  Bell,
  Shield,
  Ruler,
  Smartphone,
  HelpCircle,
  Lock,
  Trash2,
} from "lucide-react";
import { deleteUserActivities, getUserStats, getUserProfile, UserProfile, UserStats } from "@/services/database";
import { getLevelFromXP } from "@/lib/gamification";
import { uploadAvatar } from "@/services/storage";

const achievements = [
  { icon: <Medal size={20} />, name: "Primeiro 5K", date: "Jan 2025" },
  { icon: <Award size={20} />, name: "10K Sub-50", date: "Mar 2025" },
  { icon: <Trophy size={20} />, name: "Meia Maratona", date: "Jul 2025" },
];

type Theme = "dark" | "light";

type SettingsState = {
  privateProfile: boolean;
  runReminders: boolean;
  autoPause: boolean;
  units: "km" | "mi";
};

const SETTINGS_STORAGE_KEY = "veloxy-settings";
const THEME_STORAGE_KEY = "veloxy-theme";

const defaultSettings: SettingsState = {
  privateProfile: false,
  runReminders: true,
  autoPause: true,
  units: "km",
};

const getStoredTheme = (): Theme => {
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

const playThemeTransition = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.remove("theme-transitioning", "theme-to-light", "theme-to-dark");
  window.requestAnimationFrame(() => {
    root.classList.add("theme-transitioning");
    window.setTimeout(() => {
      root.classList.remove("theme-transitioning", "theme-to-light", "theme-to-dark");
    }, 440);
  });
};

const getStoredSettings = (): SettingsState => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

function SettingsRow({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.6rem] premium-panel p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="settings-title text-sm font-black text-white">{title}</p>
          <p className="settings-muted text-[10px] text-zinc-500 leading-snug mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`h-7 w-12 rounded-full p-1 transition-colors ${checked ? "bg-purple-600" : "bg-zinc-800"}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
  user,
  onActivitiesDeleted,
}: {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  user: User | null;
  onActivitiesDeleted: () => void;
}) {
  const [settings, setSettings] = useState<SettingsState>(getStoredSettings);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingRuns, setDeletingRuns] = useState(false);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteRuns = async () => {
    if (!user) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      toast.warning("Toque novamente para confirmar a exclusão das corridas.");
      return;
    }

    setDeletingRuns(true);
    try {
      const deletedCount = await deleteUserActivities(user.uid);
      toast.success(`${deletedCount} corrida${deletedCount === 1 ? "" : "s"} apagada${deletedCount === 1 ? "" : "s"}.`);
      setConfirmDelete(false);
      onActivitiesDeleted();
    } catch (error) {
      console.error("Erro ao apagar corridas:", error);
      toast.error("Não foi possível apagar as corridas.");
    } finally {
      setDeletingRuns(false);
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="w-full max-w-lg max-h-[82svh] overflow-hidden rounded-[2rem] premium-surface p-5 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Veloxy</p>
                <h2 className="font-display text-2xl font-black italic text-purple-500">CONFIGURAÇÕES</h2>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[calc(82svh-7rem)] overflow-y-auto no-scrollbar space-y-3 pb-1">
              <SettingsRow icon={theme === "light" ? <Sun size={18} /> : <Moon size={18} />} title="Tema do app" description="Escolha como o Veloxy aparece na tela.">
                <div className="relative flex rounded-2xl bg-black/50 border border-zinc-800 p-1">
                  {(["dark", "light"] as Theme[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => onThemeChange(option)}
                      className={`relative px-3 py-2 rounded-xl text-[10px] font-black uppercase transition ${
                        theme === option ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {theme === option && (
                        <motion.span
                          layoutId="theme-switch-pill"
                          className="absolute inset-0 rounded-xl bg-purple-600 shadow-[0_0_16px_rgba(147,51,234,0.45)]"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <motion.span
                        className="relative z-10"
                        animate={{ scale: theme === option ? 1.03 : 1 }}
                        transition={{ duration: 0.18 }}
                      >
                        {option === "dark" ? "Dark" : "Light"}
                      </motion.span>
                    </button>
                  ))}
                </div>
              </SettingsRow>

              <SettingsRow icon={<Shield size={18} />} title="Perfil privado" description="Oculta seu perfil de buscas públicas futuras.">
                <ToggleSwitch checked={settings.privateProfile} onChange={(value) => updateSetting("privateProfile", value)} />
              </SettingsRow>

              <SettingsRow icon={<Bell size={18} />} title="Lembretes de treino" description="Receber alertas para manter a sequência.">
                <ToggleSwitch checked={settings.runReminders} onChange={(value) => updateSetting("runReminders", value)} />
              </SettingsRow>

              <SettingsRow icon={<Smartphone size={18} />} title="Pausa automática" description="Pausar corrida quando o movimento parar.">
                <ToggleSwitch checked={settings.autoPause} onChange={(value) => updateSetting("autoPause", value)} />
              </SettingsRow>

              <SettingsRow icon={<Ruler size={18} />} title="Unidade de distância" description="Define a unidade preferida para corridas.">
                <div className="flex rounded-2xl bg-black/50 border border-zinc-800 p-1">
                  {(["km", "mi"] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => updateSetting("units", unit)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition ${
                        settings.units === unit ? "bg-purple-600 text-white" : "text-zinc-500"
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </SettingsRow>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button className="rounded-[1.6rem] premium-panel p-4 text-left">
                  <HelpCircle size={18} className="text-purple-500 mb-3" />
                  <p className="settings-title text-xs font-black text-white">Ajuda</p>
                  <p className="settings-muted text-[10px] text-zinc-500 mt-1">FAQ e suporte</p>
                </button>
                <button className="rounded-[1.6rem] premium-panel p-4 text-left">
                  <Lock size={18} className="text-purple-500 mb-3" />
                  <p className="settings-title text-xs font-black text-white">Privacidade</p>
                  <p className="settings-muted text-[10px] text-zinc-500 mt-1">Dados e segurança</p>
                </button>
              </div>

              <div className="pt-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                  Zona de risco
                </p>
                <button
                  onClick={handleDeleteRuns}
                  disabled={deletingRuns}
                  className={`settings-danger-action w-full rounded-[1.6rem] border p-4 text-left transition disabled:opacity-60 ${
                    confirmDelete
                      ? "border-red-500/60 bg-red-500/10 text-red-400"
                      : "border-zinc-800 bg-black/40 text-zinc-400 premium-panel"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                      {deletingRuns ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </div>
                    <div>
                      <p className="settings-danger-title text-sm font-black">
                        {confirmDelete ? "Confirmar exclusão" : "Apagar minhas corridas"}
                      </p>
                      <p className="settings-muted text-[10px] text-zinc-500 mt-0.5">
                        Remove atividades salvas e zera km/XP do perfil.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

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
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="w-full max-w-lg max-h-[82svh] overflow-hidden rounded-[2rem] premium-surface p-6 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-black italic text-purple-500">EDITAR PERFIL</h2>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 max-h-[calc(82svh-9rem)] overflow-y-auto no-scrollbar pb-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Nome de Corredor</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full premium-panel rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Localização</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo, SP"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full premium-panel rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Minha Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full premium-panel rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
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
          </div>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statsData, setStatsData] = useState<UserStats | null>(null);

  const fetchProfileData = useCallback(async () => {
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
  }, [user]);

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
  }, [fetchProfileData]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = useCallback((nextTheme: Theme) => {
    if (nextTheme === theme) return;
    playThemeTransition(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

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
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-2xl border-b border-zinc-900/60 shadow-[0_16px_34px_rgba(0,0,0,0.28)] z-40">
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500 drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]">
          VELOXY PROFILE
        </h1>
        <div className="flex gap-2">
            <button
                onClick={() => setEditOpen(true)}
                className="w-10 h-10 rounded-full premium-panel flex items-center justify-center text-zinc-400 active:scale-95 transition-transform"
            >
                <Pencil size={18} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 rounded-full premium-panel flex items-center justify-center text-zinc-400 active:scale-95 transition-transform"
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 mt-8 flex flex-col items-center text-center">
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-[2.4rem] bg-gradient-to-br from-purple-500/30 via-transparent to-zinc-800 p-1 shadow-[0_0_45px_rgba(147,51,234,0.22)] animate-soft-glow"
        >
            <label className="block w-32 h-32 cursor-pointer relative group overflow-hidden rounded-[2.2rem] premium-panel">
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
            <div className="absolute -bottom-2 left-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest border-2 border-black -translate-x-1/2 shadow-[0_0_18px_rgba(147,51,234,0.5)] whitespace-nowrap z-10">
                LEVEL {levelInfo.currentLevel.toUpperCase()}
            </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="mt-8 font-display font-black text-3xl italic tracking-tighter uppercase drop-shadow-[0_0_18px_rgba(168,85,247,0.22)]"
        >
          {displayName}
        </motion.h2>
        <div className="mt-3 flex items-center gap-1.5 rounded-full premium-panel px-3 py-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <MapPin size={12} className="text-purple-500" />
            {profile?.location || "São Paulo, SP"}
        </div>
        <p className="mt-6 text-sm text-zinc-400 max-w-xs italic leading-relaxed">
            {profile?.bio || "Apaixonado por corrida e desafios urbanos."}
        </p>
      </section>

      {/* Momentum Cards (Stats) */}
      <section className="px-6 mt-10 grid grid-cols-2 gap-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                className="premium-surface premium-line p-6 rounded-[2.5rem] relative overflow-hidden"
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
                whileHover={{ y: -3 }}
                className="premium-surface premium-line p-6 rounded-[2.5rem] relative overflow-hidden"
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
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="premium-surface premium-line rounded-[2.5rem] p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Progresso do Nível</h3>
                <span className="text-xs font-black text-purple-500 uppercase">{levelInfo.nextLevel}</span>
            </div>
            <div className="w-full h-4 bg-zinc-950/80 rounded-full overflow-hidden p-1 border border-zinc-800 shadow-inner">
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
        </motion.div>
      </section>

      {/* Achievements Horizontal */}
      <section className="mt-10">
          <div className="px-6 flex items-center justify-between mb-4">
            <h3 className="font-display font-black text-sm italic tracking-tighter">CONQUISTAS</h3>
            <button className="text-[10px] font-black text-purple-500 italic">VER TODAS</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-6">
              {achievements.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="min-w-[140px] premium-panel p-5 rounded-[2rem] flex flex-col items-center gap-3"
                >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-500 shadow-[0_0_18px_rgba(147,51,234,0.14)]">
                        {a.icon}
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black leading-tight uppercase">{a.name}</p>
                        <p className="text-[8px] font-bold text-zinc-600 mt-1">{a.date}</p>
                    </div>
                </motion.div>
              ))}
          </div>
      </section>

      {/* Logout Button */}
      <div className="px-6 mt-12 pb-6">
        <button 
            onClick={handleLogout}
            className="w-full premium-panel py-4 rounded-3xl text-[10px] font-black tracking-widest text-zinc-500 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
        >
            <LogOut size={16} />
            SAIR DA CONTA
        </button>
      </div>

      <EditProfileModal 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        initialData={{
          bio: profile?.bio || "",
          location: profile?.location || ""
        }}
        onSuccess={fetchProfileData}
        user={user}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        user={user}
        onActivitiesDeleted={fetchProfileData}
      />
    </div>
  );
};

export default Profile;
