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
  Loader2,
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
import { deleteUserActivities, getUserActivities, getUserStats, getUserProfile, UserProfile, UserStats } from "@/services/database";
import type { FeedActivity } from "@/types";
import { getLevelFromXP } from "@/lib/gamification";
import { getGooglePhotoURL } from "@/lib/user-photo";
import { toDateSafe } from "@/lib/feed-utils";

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

function formatRunHistoryDate(activity: FeedActivity) {
  const date = toDateSafe(activity.timestamp) ?? (
    typeof activity.createdAtMs === "number" ? new Date(activity.createdAtMs) : null
  );
  if (!date) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

function getRealAchievements(stats: UserStats | null) {
  const runsCount = stats?.runsCount || 0;
  const totalKm = Number(stats?.totalKm || 0);
  const bestDistance = stats?.bestActivity?.distance || 0;
  const streak = stats?.currentStreak || 0;

  return [
    {
      icon: <Medal size={20} />,
      name: "Primeira corrida",
      detail: runsCount > 0 ? "Conquistado" : "Salve sua primeira corrida",
      unlocked: runsCount > 0,
    },
    {
      icon: <Award size={20} />,
      name: "5K completo",
      detail: bestDistance >= 5 ? `${bestDistance.toFixed(1)} km melhor corrida` : `${bestDistance.toFixed(1)}/5 km`,
      unlocked: bestDistance >= 5,
    },
    {
      icon: <Trophy size={20} />,
      name: "25 km acumulados",
      detail: totalKm >= 25 ? `${totalKm.toFixed(1)} km totais` : `${totalKm.toFixed(1)}/25 km`,
      unlocked: totalKm >= 25,
    },
    {
      icon: <Flame size={20} />,
      name: "Sequencia 3 dias",
      detail: streak >= 3 ? `${streak} dias ativos` : `${streak}/3 dias`,
      unlocked: streak >= 3,
    },
  ];
}

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
  privateProfile,
  onPrivacyChange,
}: {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  user: User | null;
  onActivitiesDeleted: () => void;
  privateProfile: boolean;
  onPrivacyChange: (value: boolean) => Promise<void>;
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

  useEffect(() => {
    setSettings((prev) => ({ ...prev, privateProfile }));
  }, [privateProfile]);

  const updatePrivacy = async (value: boolean) => {
    updateSetting("privateProfile", value);
    await onPrivacyChange(value);
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

              <SettingsRow icon={<Shield size={18} />} title="Perfil privado" description="Oculta seu perfil dos rankings públicos.">
                <ToggleSwitch checked={settings.privateProfile} onChange={updatePrivacy} />
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
  initialData: { bio: string; location: string; photoURL: string; weeklyGoalKm: number };
  onSuccess: () => void;
  user: User | null;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(initialData.location);
  const [bio, setBio] = useState(initialData.bio);
  const [photoURL, setPhotoURL] = useState(initialData.photoURL);
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(initialData.weeklyGoalKm.toString());

  useEffect(() => {
    if (!open) return;
    setDisplayName(user?.displayName || "");
    setLocation(initialData.location);
    setBio(initialData.bio);
    setPhotoURL(initialData.photoURL);
    setWeeklyGoalKm(initialData.weeklyGoalKm.toString());
  }, [open, initialData, user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("O nome não pode ficar vazio");
      return;
    }
    setSaving(true);
    try {
      if (user) {
        const normalizedPhoto = photoURL.trim();
        const goalValue = Number(weeklyGoalKm);
        // Atualizar Auth
        await updateProfile(user, {
          displayName: displayName.trim(),
          photoURL: normalizedPhoto || null,
        });
        
        // Atualizar Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          displayName: displayName.trim(),
          photoURL: normalizedPhoto || null,
          bio: bio.trim(),
          location: location.trim(),
          weeklyGoalKm: Number.isFinite(goalValue) ? Math.max(0, Math.min(goalValue, 500)) : 10,
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
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Foto do perfil</label>
                      <button
                        type="button"
                        onClick={() => setPhotoURL(getGooglePhotoURL(user) || "")}
                        className="text-[9px] font-black uppercase tracking-widest text-purple-400"
                      >
                        Usar Google
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="Cole uma URL de imagem"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      className="w-full premium-panel rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Meta semanal (km)</label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="0.5"
                      value={weeklyGoalKm}
                      onChange={(e) => setWeeklyGoalKm(e.target.value)}
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
  const [confirmProfileDelete, setConfirmProfileDelete] = useState(false);
  const [profileDeletingRuns, setProfileDeletingRuns] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statsData, setStatsData] = useState<UserStats | null>(null);
  const [runHistory, setRunHistory] = useState<FeedActivity[]>([]);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const [userStats, userProfile, history] = await Promise.all([
        getUserStats(user.uid),
        getUserProfile(user.uid),
        getUserActivities(user.uid, 20)
      ]);
      setStatsData(userStats);
      setProfile(userProfile);
      setRunHistory(history);
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
  const weeklyGoalKm = profile?.weeklyGoalKm ?? 10;
  const weeklyKm = statsData?.weeklyTotalKm ?? 0;
  const weeklyProgress = weeklyGoalKm > 0 ? Math.min((weeklyKm / weeklyGoalKm) * 100, 100) : 0;
  const realAchievements = getRealAchievements(statsData);

  const handlePrivacyChange = async (value: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { privateProfile: value }, { merge: true });
      setProfile((prev) => prev ? { ...prev, privateProfile: value } : prev);
      toast.success(value ? "Perfil privado ativado." : "Perfil público ativado.");
    } catch (error) {
      console.error("Erro ao atualizar privacidade:", error);
      toast.error("Não foi possível atualizar a privacidade.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logout realizado");
      navigate("/login");
    } catch {
      toast.error("Erro ao fazer logout");
    }
  };

  const handleDeleteRunsFromProfile = async () => {
    if (!user) return;

    if (!confirmProfileDelete) {
      setConfirmProfileDelete(true);
      toast.warning("Toque novamente para confirmar a exclusão das corridas.");
      return;
    }

    setProfileDeletingRuns(true);
    try {
      const deletedCount = await deleteUserActivities(user.uid);
      toast.success(`${deletedCount} corrida${deletedCount === 1 ? "" : "s"} apagada${deletedCount === 1 ? "" : "s"}.`);
      setConfirmProfileDelete(false);
      await fetchProfileData();
    } catch (error) {
      console.error("Erro ao apagar corridas:", error);
      toast.error("Não foi possível apagar as corridas.");
    } finally {
      setProfileDeletingRuns(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-purple-500" size={40} />
        <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Carregando Perfil...</p>
      </div>
    );
  }

  return (
    <div className="app-shell pb-24 safe-top">
      {/* Header */}
      <header className="app-header px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="font-display font-black text-2xl tracking-tighter italic text-purple-500">
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
            className="relative rounded-[2.4rem] border border-purple-500/20 bg-purple-500/10 p-1 shadow-card"
        >
            <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="block w-32 h-32 cursor-pointer relative group overflow-hidden rounded-[2.2rem] premium-panel"
            >
                {profile?.photoURL || user?.photoURL ? (
                    <img src={profile?.photoURL || user?.photoURL || ""} className="w-full h-full object-cover transition-all group-hover:opacity-40 group-hover:blur-[2px]" alt="avatar" />
                ) : (
                    <span className="text-4xl font-black font-display text-purple-500 w-full h-full flex items-center justify-center transition-all group-hover:opacity-40">{initials}</span>
                )}

                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center">
                    <Camera size={32} className="text-white drop-shadow-md" />
                </div>
            </button>
            <div className="absolute -bottom-2 left-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest border-2 border-background -translate-x-1/2 shadow-card whitespace-nowrap z-10 text-white">
                LEVEL {levelInfo.currentLevel.toUpperCase()}
            </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="mt-8 font-display font-black text-3xl italic tracking-tighter uppercase"
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

      <section className="px-6 mt-6">
        <div className="premium-surface premium-line rounded-[2.2rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Meta semanal</p>
              <h3 className="mt-1 font-display text-2xl font-black italic">
                {weeklyKm.toFixed(1)} / {weeklyGoalKm.toFixed(1)} km
              </h3>
            </div>
            <Zap size={22} className="text-purple-500" />
          </div>
          <div className="h-3 rounded-full bg-zinc-950/80 p-1 border border-zinc-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weeklyProgress}%` }}
              className="h-full rounded-full bg-purple-500"
            />
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="mt-4 text-[10px] font-black uppercase tracking-widest text-purple-400"
          >
            Ajustar meta
          </button>
        </div>
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
              {realAchievements.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`min-w-[150px] premium-panel p-5 rounded-[2rem] flex flex-col items-center gap-3 ${a.unlocked ? "" : "opacity-45"}`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-500 shadow-[0_0_18px_rgba(147,51,234,0.14)]">
                        {a.icon}
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black leading-tight uppercase">{a.name}</p>
                        <p className="text-[8px] font-bold text-zinc-600 mt-1">{a.detail}</p>
                    </div>
                </motion.div>
              ))}
          </div>
      </section>

      <section className="px-6 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-sm italic tracking-tighter">HISTÓRICO</h3>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            {runHistory.length} corridas
          </span>
        </div>
        <div className="space-y-3">
          {runHistory.length === 0 ? (
            <div className="rounded-[2rem] premium-panel p-8 text-center">
              <Calendar size={32} className="mx-auto text-zinc-700" />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Nenhuma corrida no histórico</p>
            </div>
          ) : (
            runHistory.map((run) => (
              <div key={run.id} className="premium-panel rounded-[1.5rem] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{formatRunHistoryDate(run)}</p>
                    <p className="mt-1 font-display text-lg font-black italic">Corrida</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-black italic text-purple-400">{run.distance.toFixed(2)}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">km</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3">
                  <div>
                    <p className="text-xs font-black">{run.pace}</p>
                    <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-600">ritmo</p>
                  </div>
                  <div>
                    <p className="text-xs font-black">{run.time}</p>
                    <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-600">tempo</p>
                  </div>
                  <div>
                    <p className="text-xs font-black">{run.calories ?? 0}</p>
                    <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-600">kcal</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Logout Button */}
      <div className="px-6 mt-12 pb-6">
        <button
            onClick={handleDeleteRunsFromProfile}
            disabled={profileDeletingRuns}
            className={`w-full mb-3 premium-panel py-4 rounded-3xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
              confirmProfileDelete
                ? "text-red-400 border-red-500/40 bg-red-500/10"
                : "text-zinc-500 hover:text-red-500 hover:border-red-500/30"
            }`}
        >
            {profileDeletingRuns ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {confirmProfileDelete ? "CONFIRMAR EXCLUSÃO DAS CORRIDAS" : "APAGAR MINHAS CORRIDAS"}
        </button>
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
          location: profile?.location || "",
          photoURL: profile?.photoURL || user?.photoURL || "",
          weeklyGoalKm: profile?.weeklyGoalKm ?? 10,
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
        privateProfile={Boolean(profile?.privateProfile)}
        onPrivacyChange={handlePrivacyChange}
      />
    </div>
  );
};

export default Profile;
