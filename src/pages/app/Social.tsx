import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  Loader2,
  MapPin,
  Plus,
  Rss,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import Feed from "@/pages/app/Feed";
import Events from "@/pages/app/Events";
import {
  createMigratedGroup,
  getMigratedGlobalRanking,
  getMigratedGroupFeed,
  getMigratedGroupLeaderboard,
  getMigratedGroups,
  getMigratedUserProfile,
  joinMigratedGroup,
  leaveMigratedGroup,
} from "@/services/migration-data";
import type { FeedActivity, RunningGroup, UserProfile } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import SafeAvatar from "@/components/SafeAvatar";
import { getBestUserPhotoURL } from "@/lib/user-photo";
import { toast } from "sonner";
import { formatCardDate } from "@/lib/feed-utils";

type SocialTab = "feed" | "leaderboard" | "groups" | "events";

const RANKING_STEP = 100;
const RANKING_CAP = 500;

const socialTabs: Array<{ id: SocialTab; label: string; icon: typeof Rss }> = [
  { id: "feed", label: "Feed", icon: Rss },
  { id: "leaderboard", label: "Ranking", icon: Trophy },
  { id: "groups", label: "Grupos", icon: Users },
  { id: "events", label: "Eventos", icon: Calendar },
];

type GroupForm = {
  name: string;
  city: string;
  description: string;
  tag: string;
};

const EMPTY_GROUP_FORM: GroupForm = {
  name: "",
  city: "",
  description: "",
  tag: "",
};

function GroupCreateModal({
  open,
  onClose,
  onCreate,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (form: GroupForm) => void;
  creating: boolean;
}) {
  const [form, setForm] = useState<GroupForm>(EMPTY_GROUP_FORM);

  useEffect(() => {
    if (open) setForm(EMPTY_GROUP_FORM);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-lg rounded-[2rem] premium-surface p-5 pointer-events-auto"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Comunidade</p>
                  <h2 className="font-display text-2xl font-black italic text-purple-500">CRIAR GRUPO</h2>
                </div>
                <button onClick={onClose} className="h-10 w-10 rounded-full premium-panel flex items-center justify-center text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { key: "name", label: "Nome", placeholder: "Ex: Longao de domingo" },
                  { key: "city", label: "Cidade", placeholder: "Ex: Sao Paulo, SP" },
                  { key: "tag", label: "Tag", placeholder: "Ex: 10K" },
                ].map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{field.label}</span>
                    <input
                      value={form[field.key as keyof GroupForm]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full rounded-2xl premium-panel px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Descricao</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Conte o objetivo do grupo"
                    rows={3}
                    className="w-full resize-none rounded-2xl premium-panel px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </label>
              </div>

              <button
                onClick={() => onCreate(form)}
                disabled={creating}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-3xl bg-purple-600 py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Criar comunidade
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Social() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [rankingLimit, setRankingLimit] = useState(RANKING_STEP);
  const [ranking, setRanking] = useState<UserProfile[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [groups, setGroups] = useState<RunningGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupFeed, setGroupFeed] = useState<FeedActivity[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<UserProfile[]>([]);
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const displayName = user?.displayName || "Corredor";
  const userPhotoURL = getBestUserPhotoURL(user);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setGroupsLoading(true);
    try {
      const [profile, groupList] = await Promise.all([
        getMigratedUserProfile(user.uid),
        getMigratedGroups(),
      ]);
      const joined = profile?.joinedGroupIds || [];
      setJoinedGroups(joined);
      setGroups(groupList);
      setSelectedGroupId((current) => current || joined[0] || groupList[0]?.id || null);
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "groups") loadGroups();
  }, [activeTab, loadGroups]);

  useEffect(() => {
    if (activeTab !== "leaderboard") return;
    let cancelled = false;

    const loadRanking = async () => {
      setRankingLoading(true);
      try {
        const data = await getMigratedGlobalRanking(rankingLimit);
        if (!cancelled) setRanking(data);
      } finally {
        if (!cancelled) setRankingLoading(false);
      }
    };

    loadRanking();
    return () => {
      cancelled = true;
    };
  }, [activeTab, rankingLimit]);

  useEffect(() => {
    if (activeTab !== "groups" || !selectedGroup) return;
    let cancelled = false;

    const loadDetails = async () => {
      setGroupDetailsLoading(true);
      try {
        const [feed, leaderboard] = await Promise.all([
          getMigratedGroupFeed(selectedGroup),
          getMigratedGroupLeaderboard(selectedGroup),
        ]);
        if (!cancelled) {
          setGroupFeed(feed);
          setGroupLeaderboard(leaderboard);
        }
      } finally {
        if (!cancelled) setGroupDetailsLoading(false);
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedGroup]);

  const userPosition = useMemo(() => {
    if (!user) return null;
    const index = ranking.findIndex((item) => item.uid === user.uid);
    return index >= 0 ? index + 1 : null;
  }, [ranking, user]);

  const handleToggleGroup = async (group: RunningGroup) => {
    if (!user) return;
    const joined = joinedGroups.includes(group.id);

    try {
      if (joined) {
        await leaveMigratedGroup(group.id, user.uid);
        setJoinedGroups((prev) => prev.filter((id) => id !== group.id));
        toast.success("Voce saiu do grupo.");
      } else {
        await joinMigratedGroup(group.id, user.uid);
        setJoinedGroups((prev) => [...prev, group.id]);
        toast.success("Voce entrou no grupo.");
      }
      await loadGroups();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast.error("Nao foi possivel atualizar o grupo.");
    }
  };

  const handleCreateGroup = async (form: GroupForm) => {
    if (!user) return;
    if (form.name.trim().length < 3) {
      toast.error("O nome do grupo precisa ter pelo menos 3 letras.");
      return;
    }

    setCreatingGroup(true);
    try {
      const group = await createMigratedGroup({
        ...form,
        createdBy: user.uid,
        creatorName: displayName,
      });
      setCreateOpen(false);
      setSelectedGroupId(typeof group === "string" ? group : group.id);
      toast.success("Comunidade criada.");
      await loadGroups();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error("Nao foi possivel criar a comunidade.");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="app-shell pb-28 safe-top">
      <header className="app-header sticky top-0 z-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SafeAvatar src={userPhotoURL} name={displayName} alt="Perfil" className="h-11 w-11 rounded-full border border-purple-500/30 bg-zinc-900" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-600">Veloxy</p>
              <h1 className="font-display text-2xl font-black italic tracking-tighter text-purple-500">SOCIAL</h1>
            </div>
          </div>

          <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-300">Ranking</p>
            <p className="text-xs font-black">{userPosition ? `#${userPosition}` : "--"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {socialTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[9px] font-black uppercase transition ${
                activeTab === tab.id ? "nav-action" : "premium-panel text-zinc-500"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="px-5 pt-6"
        >
          {activeTab === "feed" && <Feed embedded />}
          {activeTab === "leaderboard" && (
            <section>
              <div className="hero-card mb-5 rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-300">Leaderboard</p>
                    <h2 className="mt-1 font-display text-3xl font-black italic">Top corredores</h2>
                  </div>
                  <Trophy size={28} className="text-purple-400" />
                </div>
              </div>

              <div className="space-y-3">
                {rankingLoading && ranking.length === 0 ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="rounded-[2rem] premium-panel p-10 text-center">
                    <Trophy className="mx-auto text-zinc-700" size={36} />
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Ranking vazio por enquanto</p>
                  </div>
                ) : (
                  ranking.map((athlete, index) => (
                    <AthleteRow key={athlete.uid} athlete={athlete} index={index} active={athlete.uid === user?.uid} />
                  ))
                )}
              </div>

              {ranking.length > 0 && rankingLimit < RANKING_CAP && (
                <button
                  onClick={() => setRankingLimit((value) => Math.min(value + RANKING_STEP, RANKING_CAP))}
                  disabled={rankingLoading}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl premium-panel py-4 text-xs font-black uppercase tracking-widest text-zinc-300 disabled:opacity-60"
                >
                  {rankingLoading ? <Loader2 size={14} className="animate-spin text-purple-500" /> : <ChevronDown size={14} className="text-purple-500" />}
                  Ver mais
                </button>
              )}
            </section>
          )}

          {activeTab === "groups" && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Comunidades</p>
                  <h2 className="mt-1 font-display text-3xl font-black italic">Grupos reais</h2>
                </div>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="hero-icon flex h-11 w-11 items-center justify-center rounded-2xl"
                  aria-label="Criar grupo"
                >
                  <Plus size={18} />
                </button>
              </div>

              {groupsLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="animate-spin text-purple-500" size={32} />
                </div>
              ) : (
                <>
                  <div className="mb-5 flex gap-3 overflow-x-auto no-scrollbar">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`min-w-[180px] rounded-[1.5rem] p-4 text-left transition ${
                          selectedGroupId === group.id ? "border border-purple-500/50 bg-purple-500/15" : "premium-panel"
                        }`}
                      >
                        <p className="truncate font-display text-lg font-black italic">{group.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                          <MapPin size={10} className="text-purple-500" />
                          {group.city}
                        </p>
                        <p className="mt-3 text-[10px] font-black text-purple-400">{group.membersCount + (joinedGroups.includes(group.id) && !group.memberIds.includes(user?.uid || "") ? 1 : 0)} membros</p>
                      </button>
                    ))}
                  </div>

                  {selectedGroup && (
                    <div className="space-y-5">
                      <div className="rounded-[2rem] premium-panel p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 inline-flex rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-[9px] font-black uppercase text-purple-300">
                              {selectedGroup.tag}
                            </div>
                            <h3 className="font-display text-2xl font-black italic">{selectedGroup.name}</h3>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{selectedGroup.description || "Grupo de corrida no Veloxy."}</p>
                          </div>
                          <Users size={28} className="text-purple-500" />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl premium-panel p-3">
                            <p className="font-display text-2xl font-black italic">{selectedGroup.membersCount}</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">membros</p>
                          </div>
                          <div className="rounded-2xl premium-panel p-3">
                            <p className="font-display text-2xl font-black italic">{selectedGroup.weeklyKm.toFixed(0)}</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">km semanais</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleGroup(selectedGroup)}
                          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition ${
                            joinedGroups.includes(selectedGroup.id) ? "border border-green-500/30 bg-green-500/10 text-green-400" : "bg-purple-600 text-white"
                          }`}
                        >
                          <Zap size={14} />
                          {joinedGroups.includes(selectedGroup.id) ? "Sair do grupo" : "Entrar no grupo"}
                        </button>
                      </div>

                      <div className="rounded-[2rem] premium-panel p-5">
                        <h4 className="font-display text-lg font-black italic">Ranking do grupo</h4>
                        <div className="mt-4 space-y-3">
                          {groupDetailsLoading ? (
                            <Loader2 className="mx-auto animate-spin text-purple-500" size={24} />
                          ) : groupLeaderboard.length === 0 ? (
                            <p className="py-5 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">Entre no grupo para iniciar o ranking</p>
                          ) : (
                            groupLeaderboard.slice(0, 5).map((athlete, index) => <AthleteRow key={athlete.uid} athlete={athlete} index={index} active={athlete.uid === user?.uid} compact />)
                          )}
                        </div>
                      </div>

                      <div className="rounded-[2rem] premium-panel p-5">
                        <h4 className="font-display text-lg font-black italic">Feed do grupo</h4>
                        <div className="mt-4 space-y-3">
                          {groupDetailsLoading ? (
                            <Loader2 className="mx-auto animate-spin text-purple-500" size={24} />
                          ) : groupFeed.length === 0 ? (
                            <p className="py-5 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">Sem corridas recentes neste grupo</p>
                          ) : (
                            groupFeed.map((activity) => (
                              <div key={activity.id} className="rounded-2xl premium-panel p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black">{activity.userName}</p>
                                    <p className="text-[10px] text-zinc-500">{formatCardDate(activity.timestamp, activity.createdAtMs)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-display text-xl font-black italic text-purple-400">{activity.distance.toFixed(2)}</p>
                                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">km</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === "events" && <Events embedded />}
        </motion.main>
      </AnimatePresence>

      <GroupCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateGroup} creating={creatingGroup} />
    </div>
  );
}

function AthleteRow({
  athlete,
  index,
  active,
  compact = false,
}: {
  athlete: UserProfile;
  index: number;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-[1.5rem] ${compact ? "p-3 premium-panel" : "p-4"} ${active ? "border border-purple-500/35 bg-purple-500/10" : "premium-panel"}`}>
      <div className="w-8 text-center font-display text-xl font-black italic text-purple-400">{index + 1}</div>
      <SafeAvatar src={athlete.photoURL} name={athlete.displayName || "Atleta"} className="h-11 w-11 rounded-2xl bg-zinc-900" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{athlete.displayName || "Atleta"}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{athlete.level || "Iniciante"}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-black italic">{(athlete.totalXP || 0).toLocaleString("pt-BR")}</p>
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-purple-400">XP</p>
      </div>
    </div>
  );
}
