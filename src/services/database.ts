import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
  startAfter,
  setDoc,
  getDoc,
  increment,
  writeBatch,
  deleteDoc,
  documentId,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { calculateXP, getLevelFromXP } from "@/lib/gamification";
import { toDateSafe } from "@/lib/feed-utils";
import type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats, RunningGroup, GroupPost, GroupPostComment, GroupMessage } from "@/types";

// Re-exportar types para quem já importava direto daqui
export type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats, RunningGroup, GroupPost, GroupPostComment, GroupMessage };

function removeUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedFields) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, removeUndefinedFields(fieldValue)])
    ) as T;
  }

  return value;
}

function toFirestoreTimestamp(value: FeedActivity["timestamp"]) {
  if (!value) return null;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if ("toDate" in value && typeof value.toDate === "function") return value;
  if ("seconds" in value && typeof value.seconds === "number") {
    return Timestamp.fromMillis(value.seconds * 1000);
  }
  return null;
}

function normalizeActivity(docId: string, data: Record<string, unknown>): FeedActivity {
  return {
    id: docId,
    ...data,
    createdAtMs: typeof data.createdAtMs === "number" ? data.createdAtMs : undefined,
  } as FeedActivity;
}

function formatPace(totalSeconds: number, totalKm: number) {
  if (totalKm <= 0 || totalSeconds <= 0) return "0'00\"";
  const secondsPerKm = Math.round(totalSeconds / totalKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}'${seconds.toString().padStart(2, "0")}"`;
}

function dayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateCurrentStreak(activeDays: Set<string>) {
  if (activeDays.size === 0) return 0;

  const cursor = new Date();
  let key = dayKeyFromDate(cursor);

  if (!activeDays.has(key)) {
    cursor.setDate(cursor.getDate() - 1);
    key = dayKeyFromDate(cursor);
  }

  let streak = 0;
  while (activeDays.has(key)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    key = dayKeyFromDate(cursor);
  }

  return streak;
}

// Salvar uma nova atividade (corrida)
// Retorna { id, xpUpdateFailed }: se a criação da atividade falhar, a
// exceção é relançada (nada foi salvo, seguro tentar de novo). Se só a
// atualização de XP falhar, a atividade já está salva — não relançamos,
// para não fazer o usuário pensar que a corrida inteira se perdeu; o
// chamador decide como avisar sobre o xpUpdateFailed.
export const saveActivity = async (data: ActivityData) => {
  const xpGained = calculateXP(data.distance, data.durationSeconds);
  const activityData = removeUndefinedFields({
    ...data,
    xpGained,
    likes: [],
    createdAtMs: Date.now(),
    timestamp: serverTimestamp()
  });

  let docRef;
  try {
    docRef = await addDoc(collection(db, "activities"), activityData);
  } catch (error) {
    console.error("Erro ao salvar atividade:", error);
    throw error;
  }

  let xpUpdateFailed = false;
  try {
    await updateUserXP(data.userId, xpGained, data.distance, data.userName, data.userAvatar);
  } catch (error) {
    console.error("Corrida salva, mas falhou ao atualizar XP/estatisticas:", error);
    xpUpdateFailed = true;
  }

  // Melhor esforço: nunca bloqueia nem falha o salvamento da corrida.
  await addDistanceToUserGroups(data.userId, data.distance);

  return { id: docRef.id, xpUpdateFailed };
};

// Buscar ou criar perfil do usuário
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { uid: userId, ...userSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
};

// Cria o documento inicial do usuário no Firestore logo após o cadastro.
// Não inclui totalXP/level: a regra validUserCreate só aceita um doc novo
// com totalXP == 0 (ou ausente) e level == 'Iniciante' (ou ausente).
export const createUserProfile = async (
  userId: string,
  data: { displayName?: string | null; photoURL?: string | null; termsVersion?: string }
) => {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      ...(data.termsVersion
        ? { termsVersion: data.termsVersion, termsAcceptedAt: serverTimestamp() }
        : {}),
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );
};

// Atualizar XP e KM do usuário
// Bug 9 Fix: monthlyKm agora inclui reset mensal automático
export const updateUserXP = async (
  userId: string, 
  xpAmount: number, 
  kmAmount: number,
  displayName: string,
  photoURL: string | null
) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    // Garante que o doc de usuário exista antes de incrementar estatísticas
    // (create com totalXP ausente, como exige validUserCreate).
    if (!userSnap.exists()) {
      await createUserProfile(userId, { displayName, photoURL });
    }

    let currentXP = xpAmount;
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-04"

    if (userSnap.exists()) {
      const data = userSnap.data();
      currentXP += (data.totalXP || 0);

      // Reset mensal: se o mês gravado no Firestore é diferente do atual, zera monthlyKm
      const savedMonth = data.monthlyKmMonth || "";
      if (savedMonth !== currentMonth) {
        // Mês mudou: resetar monthlyKm antes de incrementar
        await setDoc(userRef, { monthlyKm: 0, monthlyKmMonth: currentMonth }, { merge: true });
      }
    }

    const { currentLevel } = getLevelFromXP(currentXP);

    // Escrita isolada: só os campos de estatísticas. displayName/photoURL
    // não entram aqui — se divergirem do que já está salvo, misturá-los
    // faria o diff sair do formato aceito por validStatsProgressUpdate e
    // rejeitar a atualização de XP inteira.
    await setDoc(userRef, {
      totalXP: increment(xpAmount),
      monthlyKm: increment(kmAmount),
      monthlyKmMonth: currentMonth,
      level: currentLevel,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao atualizar XP:", error);
    throw error;
  }
};

// Buscar Ranking Global (Top 10 por XP)
export const getGlobalRanking = async (limitCount = 10): Promise<UserProfile[]> => {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("totalXP", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter((profile) => !profile.privateProfile);
  } catch (error) {
    console.error("Erro ao buscar ranking:", error);
    return [];
  }
};

export const deleteUserActivities = async (userId: string) => {
  const q = query(collection(db, "activities"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach((activityDoc) => {
    batch.delete(activityDoc.ref);
  });

  batch.set(
    doc(db, "users", userId),
    {
      totalXP: 0,
      monthlyKm: 0,
      level: "Iniciante",
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  return snapshot.size;
};

export const deleteUserActivity = async (activityId: string, userId: string) => {
  const activityRef = doc(db, "activities", activityId);
  const activitySnap = await getDoc(activityRef);

  if (!activitySnap.exists() || activitySnap.data().userId !== userId) {
    throw new Error("Corrida não encontrada para este usuário.");
  }

  await deleteDoc(activityRef);

  try {
    const remainingSnapshot = await getDocs(
      query(collection(db, "activities"), where("userId", "==", userId))
    );
    const currentMonth = new Date().toISOString().slice(0, 7);

    let totalXP = 0;
    let monthlyKm = 0;

    remainingSnapshot.docs.forEach((activityDoc) => {
      const activity = normalizeActivity(activityDoc.id, activityDoc.data());
      const distance = Number(activity.distance || 0);
      const durationSeconds = Number(activity.durationSeconds || 0);
      const activityXP = Number(activity.xpGained || calculateXP(distance, durationSeconds));
      const activityDate = toDateSafe(activity.timestamp) ?? new Date(activity.createdAtMs || 0);

      totalXP += activityXP;
      if (!Number.isNaN(activityDate.getTime()) && activityDate.toISOString().slice(0, 7) === currentMonth) {
        monthlyKm += distance;
      }
    });

    const { currentLevel } = getLevelFromXP(totalXP);

    await setDoc(
      doc(db, "users", userId),
      {
        totalXP,
        monthlyKm: Number(monthlyKm.toFixed(2)),
        monthlyKmMonth: currentMonth,
        level: currentLevel,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Corrida apagada, mas não foi possível recalcular o perfil agora:", error);
  }
};

// Escutar as N atividades mais recentes em tempo real
export const subscribeToFeed = (
  callback: (activities: FeedActivity[]) => void,
  limitCount = 10
) => {
  const q = query(
    collection(db, "activities"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => normalizeActivity(doc.id, doc.data()));
    callback(activities);
  }, (error) => {
    console.error("Erro no listener do feed:", error);
  });
};

// Buscar atividades mais antigas (paginação cursor-based)
export const loadMoreActivities = async (
  lastTimestamp: FeedActivity["timestamp"],
  limitCount = 10
): Promise<FeedActivity[]> => {
  try {
    const cursor = toFirestoreTimestamp(lastTimestamp);
    if (!cursor) return [];

    const q = query(
      collection(db, "activities"),
      orderBy("timestamp", "desc"),
      startAfter(cursor),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeActivity(d.id, d.data()));
  } catch (error) {
    console.error("Erro ao carregar mais atividades:", error);
    return [];
  }
};

// Curtir/Descurtir uma atividade
export const toggleLike = async (activityId: string, userId: string, isLiked: boolean) => {
  try {
    const activityRef = doc(db, "activities", activityId);
    await updateDoc(activityRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  } catch (error) {
    console.error("Erro ao dar like:", error);
    throw error;
  }
};

// Buscar estatísticas completas do usuário
export const getUserStats = async (userId: string) => {
  try {
    const q = query(
      collection(db, "activities"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const activities = querySnapshot.docs
      .map((docSnap) => normalizeActivity(docSnap.id, docSnap.data()))
      .sort((a, b) => {
        const dateA = toDateSafe(a.timestamp)?.getTime() ?? a.createdAtMs ?? 0;
        const dateB = toDateSafe(b.timestamp)?.getTime() ?? b.createdAtMs ?? 0;
        return dateB - dateA;
      });

    let totalKm = 0;
    let runsCount = 0;
    let totalSeconds = 0;
    let totalCalories = 0;
    let lastActivity: (ActivityData & { id: string }) | null = null;
    let bestActivity: FeedActivity | null = null;
    const activeDays = new Set<string>();

    // Montar mapa dos últimos 7 dias (YYYY-MM-DD -> km)
    const weekMap: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      weekMap[dayKeyFromDate(d)] = 0;
    }

    activities.forEach((activity) => {
      const distance = Number(activity.distance || 0);
      totalKm += distance;
      totalSeconds += Number(activity.durationSeconds || 0);
      totalCalories += Number(activity.calories || 0);
      runsCount += 1;

      // Primeira iteração = mais recente (ordenado desc)
      if (!lastActivity) {
        lastActivity = activity;
      }

      if (!bestActivity || distance > bestActivity.distance) {
        bestActivity = activity;
      }

      // Acumular km no dia correto para o gráfico semanal
      if (activity.timestamp || typeof activity.createdAtMs === "number") {
        const activityDate = toDateSafe(activity.timestamp) ?? new Date(activity.createdAtMs || 0);
        const dateKey = dayKeyFromDate(activityDate);
        activeDays.add(dateKey);
        if (dateKey in weekMap) {
          weekMap[dateKey] += distance;
        }
      }
    });

    // Formatar tempo total (ex: 4h 12m)
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Converter weekMap para array ordenado por dia
    const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const weeklyData = Object.entries(weekMap).map(([dateStr, km]) => {
      const d = new Date(dateStr + "T12:00:00");
      return { day: DAY_LABELS[d.getDay()], km: Number(km.toFixed(2)) };
    });
    const weeklyTotalKm = weeklyData.reduce((sum, day) => sum + day.km, 0);

    return {
      totalKm: totalKm.toFixed(1),
      runsCount,
      totalTime: formattedTime,
      totalCalories: Math.round(totalCalories),
      averagePace: formatPace(totalSeconds, totalKm),
      currentStreak: calculateCurrentStreak(activeDays),
      weeklyTotalKm: Number(weeklyTotalKm.toFixed(2)),
      bestActivity,
      lastActivity,
      weeklyData,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return {
      totalKm: "0.0",
      runsCount: 0,
      totalTime: "0m",
      totalCalories: 0,
      averagePace: "0'00\"",
      currentStreak: 0,
      weeklyTotalKm: 0,
      bestActivity: null,
      lastActivity: null,
      weeklyData: [],
    };
  }
}

// ─── Marketplace Functions ──────────────────────────────────────────────────

/**
 * Busca todos os produtos da loja no Firestore
 */
export const getUserActivities = async (userId: string, limitCount = 10): Promise<FeedActivity[]> => {
  try {
    const q = query(
      collection(db, "activities"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => normalizeActivity(d.id, d.data()))
      .sort((a, b) => {
        const dateA = toDateSafe(a.timestamp)?.getTime() ?? a.createdAtMs ?? 0;
        const dateB = toDateSafe(b.timestamp)?.getTime() ?? b.createdAtMs ?? 0;
        return dateB - dateA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error("Erro ao buscar corridas do usuario:", error);
    return [];
  }
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, "products"), orderBy("category"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
};

/**
 * Cadastra produtos iniciais se a coleção estiver vazia (Seeding)
 */
// Social groups
const FALLBACK_GROUPS: RunningGroup[] = [
  {
    id: "sp-runners",
    name: "Sao Paulo Runners",
    city: "Sao Paulo, SP",
    description: "Treinos urbanos, provas de rua e encontros semanais.",
    tag: "Urbano",
    createdBy: "system",
    creatorName: "Veloxy",
    memberIds: [],
    membersCount: 128,
    weeklyKm: 842,
  },
  {
    id: "5k-iniciantes",
    name: "5K Iniciantes",
    city: "Brasil",
    description: "Comunidade para quem quer criar constancia nos primeiros 5 km.",
    tag: "Comecando",
    createdBy: "system",
    creatorName: "Veloxy",
    memberIds: [],
    membersCount: 94,
    weeklyKm: 318,
  },
  {
    id: "treino-noturno",
    name: "Treino Noturno",
    city: "Online",
    description: "Para quem prefere correr depois do expediente.",
    tag: "Noite",
    createdBy: "system",
    creatorName: "Veloxy",
    memberIds: [],
    membersCount: 76,
    weeklyKm: 454,
  },
];

function normalizeGroup(docId: string, data: Record<string, unknown>): RunningGroup {
  return {
    id: docId,
    name: typeof data.name === "string" ? data.name : "Grupo",
    city: typeof data.city === "string" ? data.city : "Brasil",
    description: typeof data.description === "string" ? data.description : "",
    tag: typeof data.tag === "string" ? data.tag : "Run",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    creatorName: typeof data.creatorName === "string" ? data.creatorName : "Veloxy",
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.filter((id): id is string => typeof id === "string") : [],
    membersCount: typeof data.membersCount === "number" ? data.membersCount : 0,
    weeklyKm: typeof data.weeklyKm === "number" ? data.weeklyKm : 0,
    weeklyKmWeek: typeof data.weeklyKmWeek === "string" ? data.weeklyKmWeek : undefined,
    createdAt: data.createdAt as RunningGroup["createdAt"],
    updatedAt: data.updatedAt as RunningGroup["updatedAt"],
  };
}

export const getGroups = async (): Promise<RunningGroup[]> => {
  try {
    const q = query(collection(db, "groups"), orderBy("membersCount", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((groupDoc) => normalizeGroup(groupDoc.id, groupDoc.data()));
    return groups.length > 0 ? groups : FALLBACK_GROUPS;
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    return FALLBACK_GROUPS;
  }
};

// Identificador de semana ISO (ex: "2026-W07") usado para saber quando
// zerar o km semanal de um grupo.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Soma a distância de uma corrida ao km semanal de cada grupo real (não
// fallback/demo) do qual o usuário participa, resetando automaticamente
// quando a semana muda. É "melhor esforço": nunca lança erro para quem
// chamou, pois a corrida em si já foi salva com sucesso a essa altura.
export const addDistanceToUserGroups = async (userId: string, distanceKm: number): Promise<void> => {
  if (!(distanceKm > 0)) return;

  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return;

    const joinedGroupIds: string[] = Array.isArray(userSnap.data().joinedGroupIds)
      ? userSnap.data().joinedGroupIds
      : [];
    const realGroupIds = joinedGroupIds.filter(
      (groupId) => !FALLBACK_GROUPS.some((group) => group.id === groupId)
    );
    if (realGroupIds.length === 0) return;

    const currentWeek = isoWeekKey(new Date());

    await Promise.all(realGroupIds.map(async (groupId) => {
      try {
        await runTransaction(db, async (transaction) => {
          const groupRef = doc(db, "groups", groupId);
          const groupSnap = await transaction.get(groupRef);
          if (!groupSnap.exists()) return;

          const data = groupSnap.data();
          const sameWeek = data.weeklyKmWeek === currentWeek;
          const previousKm = sameWeek && typeof data.weeklyKm === "number" ? data.weeklyKm : 0;
          const nextWeeklyKm = Math.min(Number((previousKm + distanceKm).toFixed(2)), 100000);

          transaction.update(groupRef, {
            weeklyKm: nextWeeklyKm,
            weeklyKmWeek: currentWeek,
            updatedAt: serverTimestamp(),
          });
        });
      } catch (error) {
        console.warn(`Nao foi possivel atualizar weeklyKm do grupo ${groupId}:`, error);
      }
    }));
  } catch (error) {
    console.warn("Nao foi possivel atualizar weeklyKm dos grupos do usuario:", error);
  }
};

//Função de Criar Grupo. #Socia>Grupos#

export const createGroup = async ({
  name,
  city,
  description,
  tag,
  userId,
  userName,
}: {
  name: string;
  city: string;
  description: string;
  tag: string;
  userId: string;
  userName: string;
}) => {
  const groupRef = doc(collection(db, "groups"));
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    transaction.set(groupRef, removeUndefinedFields({
      name: name.trim(),
      city: city.trim() || "Brasil",
      description: description.trim(),
      tag: tag.trim() || "Run",
      createdBy: userId,
      creatorName: userName,
      memberIds: [userId],
      membersCount: 1,
      weeklyKm: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    transaction.set(userRef, { joinedGroupIds: arrayUnion(groupRef.id) }, { merge: true });
  });

  return groupRef.id;
};

// joinGroup/leaveGroup gravam no documento do grupo e no perfil do usuário
// dentro de uma única transação: se uma das duas escritas falhar, a outra
// também não é aplicada, evitando que memberIds e joinedGroupIds fiquem
// dessincronizados por uma falha parcial (rede caindo entre as duas chamadas).
export const joinGroup = async (groupId: string, userId: string) => {
  if (FALLBACK_GROUPS.some((group) => group.id === groupId)) {
    await setDoc(doc(db, "users", userId), { joinedGroupIds: arrayUnion(groupId) }, { merge: true });
    return true;
  }

  const groupRef = doc(db, "groups", groupId);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    transaction.update(groupRef, {
      memberIds: arrayUnion(userId),
      membersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    transaction.set(userRef, { joinedGroupIds: arrayUnion(groupId) }, { merge: true });
  });

  return true;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  if (FALLBACK_GROUPS.some((group) => group.id === groupId)) {
    await setDoc(doc(db, "users", userId), { joinedGroupIds: arrayRemove(groupId) }, { merge: true });
    return true;
  }

  const groupRef = doc(db, "groups", groupId);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    transaction.update(groupRef, {
      memberIds: arrayRemove(userId),
      membersCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    transaction.set(userRef, { joinedGroupIds: arrayRemove(groupId) }, { merge: true });
  });

  return true;
};

export const getGroupActivities = async (group: RunningGroup, limitCount = 12): Promise<FeedActivity[]> => {
  const memberIds = group.memberIds.slice(0, 30);
  if (memberIds.length === 0) return [];

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 10) chunks.push(memberIds.slice(i, i + 10));

    const snapshots = await Promise.all(
      chunks.map((chunk) => getDocs(query(collection(db, "activities"), where("userId", "in", chunk))))
    );

    return snapshots
      .flatMap((snapshot) => snapshot.docs.map((activityDoc) => normalizeActivity(activityDoc.id, activityDoc.data())))
      .sort((a, b) => {
        const dateA = toDateSafe(a.timestamp)?.getTime() ?? a.createdAtMs ?? 0;
        const dateB = toDateSafe(b.timestamp)?.getTime() ?? b.createdAtMs ?? 0;
        return dateB - dateA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error("Erro ao buscar feed do grupo:", error);
    return [];
  }
};

export const getGroupLeaderboard = async (group: RunningGroup): Promise<UserProfile[]> => {
  const memberIds = group.memberIds.slice(0, 30);
  if (memberIds.length === 0) return [];

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 10) chunks.push(memberIds.slice(i, i + 10));

    const snapshots = await Promise.all(
      chunks.map((chunk) => getDocs(query(collection(db, "users"), where(documentId(), "in", chunk))))
    );

    return snapshots
      .flatMap((snapshot) => snapshot.docs.map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() } as UserProfile)))
      .sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
  } catch (error) {
    console.error("Erro ao buscar ranking do grupo:", error);
    return [];
  }
};

// Busca um único grupo pelo ID (usado pela tela dedicada /grupo/:id, que
// precisa carregar o grupo direto a partir da URL, sem depender de uma
// lista já carregada em memória).
export const getGroupById = async (groupId: string): Promise<RunningGroup | null> => {
  const fallback = FALLBACK_GROUPS.find((group) => group.id === groupId);
  if (fallback) return fallback;

  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return normalizeGroup(snap.id, snap.data());
};

// Grava a foto do grupo já enviada ao Storage. Restrita pelas regras do
// Firestore a quem criou o grupo (createdBy).
export const updateGroupPhoto = async (groupId: string, photoURL: string): Promise<void> => {
  await setDoc(
    doc(db, "groups", groupId),
    { photoURL, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

function normalizeGroupPost(docId: string, data: Record<string, unknown>): GroupPost {
  return {
    id: docId,
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName: typeof data.authorName === "string" ? data.authorName : "Corredor",
    authorPhoto: typeof data.authorPhoto === "string" ? data.authorPhoto : null,
    text: typeof data.text === "string" ? data.text : "",
    imageURL: typeof data.imageURL === "string" ? data.imageURL : null,
    likes: Array.isArray(data.likes) ? data.likes.filter((id): id is string => typeof id === "string") : [],
    commentsCount: typeof data.commentsCount === "number" ? data.commentsCount : 0,
    createdAt: data.createdAt as GroupPost["createdAt"],
  };
}

// Feed do grupo em tempo real (últimas publicações primeiro).
export const subscribeToGroupPosts = (
  groupId: string,
  callback: (posts: GroupPost[]) => void,
  limitCount = 30
) => {
  const q = query(
    collection(db, "groups", groupId, "posts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((postDoc) => normalizeGroupPost(postDoc.id, postDoc.data())));
  }, (error) => {
    console.error("Erro no listener do feed do grupo:", error);
  });
};

export const createGroupPost = async ({
  groupId,
  authorId,
  authorName,
  authorPhoto,
  text,
  imageURL,
}: {
  groupId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  imageURL?: string | null;
}) => {
  const docRef = await addDoc(collection(db, "groups", groupId, "posts"), removeUndefinedFields({
    authorId,
    authorName,
    authorPhoto,
    text: text.trim(),
    imageURL: imageURL || undefined,
    likes: [],
    commentsCount: 0,
    createdAt: serverTimestamp(),
  }));
  return docRef.id;
};

export const toggleGroupPostLike = async (groupId: string, postId: string, userId: string, isLiked: boolean) => {
  const postRef = doc(db, "groups", groupId, "posts", postId);
  await updateDoc(postRef, {
    likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
};

function normalizeGroupPostComment(docId: string, data: Record<string, unknown>): GroupPostComment {
  return {
    id: docId,
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName: typeof data.authorName === "string" ? data.authorName : "Corredor",
    authorPhoto: typeof data.authorPhoto === "string" ? data.authorPhoto : null,
    text: typeof data.text === "string" ? data.text : "",
    createdAt: data.createdAt as GroupPostComment["createdAt"],
  };
}

// Comentários de uma publicação, em tempo real (ordem cronológica).
export const subscribeToGroupPostComments = (
  groupId: string,
  postId: string,
  callback: (comments: GroupPostComment[]) => void
) => {
  const q = query(
    collection(db, "groups", groupId, "posts", postId, "comments"),
    orderBy("createdAt", "asc"),
    limit(200)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((commentDoc) => normalizeGroupPostComment(commentDoc.id, commentDoc.data())));
  }, (error) => {
    console.error("Erro no listener de comentarios do post:", error);
  });
};

// Cria o comentário e incrementa o contador da publicação em uma única
// transação, para o contador nunca ficar dessincronizado por falha parcial.
export const addGroupPostComment = async (
  groupId: string,
  postId: string,
  { authorId, authorName, authorPhoto, text }: { authorId: string; authorName: string; authorPhoto: string | null; text: string }
) => {
  const postRef = doc(db, "groups", groupId, "posts", postId);
  const commentRef = doc(collection(db, "groups", groupId, "posts", postId, "comments"));

  await runTransaction(db, async (transaction) => {
    transaction.set(commentRef, removeUndefinedFields({
      authorId,
      authorName,
      authorPhoto,
      text: text.trim(),
      createdAt: serverTimestamp(),
    }));
    transaction.update(postRef, { commentsCount: increment(1) });
  });

  return commentRef.id;
};

function normalizeGroupMessage(docId: string, data: Record<string, unknown>): GroupMessage {
  return {
    id: docId,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    senderName: typeof data.senderName === "string" ? data.senderName : "Corredor",
    senderPhoto: typeof data.senderPhoto === "string" ? data.senderPhoto : null,
    text: typeof data.text === "string" ? data.text : "",
    createdAt: data.createdAt as GroupMessage["createdAt"],
  };
}

// Chat do grupo em tempo real (últimas mensagens, ordem cronológica).
export const subscribeToGroupMessages = (
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  limitCount = 100
) => {
  const q = query(
    collection(db, "groups", groupId, "messages"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((messageDoc) => normalizeGroupMessage(messageDoc.id, messageDoc.data()));
    callback(messages.reverse());
  }, (error) => {
    console.error("Erro no listener do chat do grupo:", error);
  });
};

export const sendGroupMessage = async ({
  groupId,
  senderId,
  senderName,
  senderPhoto,
  text,
}: {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
}) => {
  await addDoc(collection(db, "groups", groupId, "messages"), removeUndefinedFields({
    senderId,
    senderName,
    senderPhoto,
    text: text.trim(),
    createdAt: serverTimestamp(),
  }));
};

// ─── Events Functions ───────────────────────────────────────────────────────

/**
 * Busca eventos disponíveis, podendo filtrar por cidade
 */
const getFallbackEvents = (): RunningEvent[] => {
  const futureDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  };

  const formatEventDate = (date: Date) => {
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]}`;
  };

  const dates = [futureDate(24), futureDate(52), futureDate(87)];

  return [
    {
      id: "local-sao-paulo-night-run",
      title: "Veloxy Night Run",
      date: formatEventDate(dates[0]),
      location: "Parque do Ibirapuera",
      city: "Sao Paulo",
      participantsCount: 420,
      participantsIds: [],
      category: "5K / 10K",
      distanceOptions: ["5K", "10K"],
      image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=900&auto=format&fit=crop",
      price: "R$ 89",
      officialUrl: "https://www.ticketsports.com.br/",
      source: "Exemplo Veloxy",
      sourceUrl: "https://www.ticketsports.com.br/",
      sourceType: "demo",
      verified: false,
      status: "unknown",
      lat: -23.5874,
      lng: -46.6576,
      timestamp: dates[0],
    },
    {
      id: "local-rio-half",
      title: "Rio City Half",
      date: formatEventDate(dates[1]),
      location: "Aterro do Flamengo",
      city: "Rio de Janeiro",
      participantsCount: 1280,
      participantsIds: [],
      category: "21K",
      distanceOptions: ["21K"],
      image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900&auto=format&fit=crop",
      price: "R$ 140",
      officialUrl: "https://www.ticketsports.com.br/",
      source: "Exemplo Veloxy",
      sourceUrl: "https://www.ticketsports.com.br/",
      sourceType: "demo",
      verified: false,
      status: "unknown",
      lat: -22.9339,
      lng: -43.1706,
      timestamp: dates[1],
    },
    {
      id: "local-floripa-marathon",
      title: "Floripa Marathon",
      date: formatEventDate(dates[2]),
      location: "Beira Mar Norte",
      city: "Florianopolis",
      participantsCount: 860,
      participantsIds: [],
      category: "42K",
      distanceOptions: ["42K"],
      image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?q=80&w=900&auto=format&fit=crop",
      price: "R$ 160",
      officialUrl: "https://www.ticketsports.com.br/",
      source: "Exemplo Veloxy",
      sourceUrl: "https://www.ticketsports.com.br/",
      sourceType: "demo",
      verified: false,
      status: "unknown",
      lat: -27.5904,
      lng: -48.5480,
      timestamp: dates[2],
    },
  ];
};

const normalizeEvent = (id: string, data: Partial<RunningEvent>): RunningEvent => {
  const category = data.category || "Corrida";
  return {
    id,
    title: data.title || "Corrida oficial",
    date: data.date || "",
    location: data.location || "Local a confirmar",
    city: data.city || "Brasil",
    state: data.state,
    country: data.country || "BR",
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    participantsCount: Number(data.participantsCount || 0),
    participantsIds: Array.isArray(data.participantsIds) ? data.participantsIds : [],
    category,
    distanceOptions: Array.isArray(data.distanceOptions) && data.distanceOptions.length > 0 ? data.distanceOptions : category.split("/").map((item) => item.trim()).filter(Boolean),
    image: data.image || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=900&auto=format&fit=crop",
    price: data.price || "Ver no site oficial",
    officialUrl: data.officialUrl || data.sourceUrl || "",
    source: data.source || "Fonte oficial",
    sourceUrl: data.sourceUrl || data.officialUrl || "",
    sourceType: data.sourceType || "manual",
    verified: Boolean(data.verified),
    status: data.status || "unknown",
    lastSyncedAt: data.lastSyncedAt,
    timestamp: data.timestamp || new Date(),
  };
};

export const getEvents = async (cityFilter?: string): Promise<RunningEvent[]> => {
  try {
    const q = query(collection(db, "events"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    let events = snapshot.docs.map(doc => normalizeEvent(doc.id, doc.data() as Partial<RunningEvent>));

    if (events.length === 0) {
      events = getFallbackEvents();
    }

    if (cityFilter) {
      const normalizedCity = cityFilter.toLowerCase().split(",")[0].trim();
      // Ordenar: Primeiro os da mesma cidade, depois os outros
      events = events.sort((a, b) => {
        const aMatch = a.city.toLowerCase().includes(normalizedCity);
        const bMatch = b.city.toLowerCase().includes(normalizedCity);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }

    return events;
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return [];
  }
};

/**
 * Inscreve o usuário em um evento
 */
export const joinEvent = async (eventId: string, userId: string) => {
  try {
    const userRef = doc(db, "users", userId);

    if (eventId.startsWith("local-")) {
      await setDoc(userRef, { enrolledEvents: arrayUnion(eventId) }, { merge: true });
      return true;
    }

    // Grava o evento e o perfil do usuário juntos: se uma escrita falhar,
    // a outra também não é aplicada (evita participantsIds e enrolledEvents
    // ficarem dessincronizados por falha parcial).
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      transaction.update(eventRef, {
        participantsIds: arrayUnion(userId),
        participantsCount: increment(1),
      });
      transaction.set(userRef, { enrolledEvents: arrayUnion(eventId) }, { merge: true });
    });

    return true;
  } catch (error) {
    console.error("Erro ao se inscrever no evento:", error);
    throw error;
  }
};

