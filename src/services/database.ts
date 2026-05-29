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
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { calculateXP, getLevelFromXP } from "@/lib/gamification";
import { toDateSafe } from "@/lib/feed-utils";
import type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats } from "@/types";

// Re-exportar types para quem já importava direto daqui
export type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats };

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
export const saveActivity = async (data: ActivityData) => {
  try {
    const xpGained = calculateXP(data.distance, data.durationSeconds);
    const activityData = removeUndefinedFields({
      ...data,
      xpGained,
      likes: [],
      createdAtMs: Date.now(),
      timestamp: serverTimestamp()
    });
    
    const docRef = await addDoc(collection(db, "activities"), activityData);

    // Atualizar o perfil do usuário com o novo XP e KM
    await updateUserXP(data.userId, xpGained, data.distance, data.userName, data.userAvatar);

    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar atividade:", error);
    throw error;
  }
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

    await setDoc(userRef, {
      displayName,
      photoURL,
      totalXP: increment(xpAmount),
      monthlyKm: increment(kmAmount),
      monthlyKmMonth: currentMonth,
      level: currentLevel,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao atualizar XP:", error);
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
    return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
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
export const seedProducts = async () => {
  try {
    const existing = await getDocs(collection(db, "products"));
    if (!existing.empty) return; 

    const initialProducts: Omit<Product, "id">[] = [
      {
        name: "Nike Pegasus 41",
        category: "Tênis",
        price: 899,
        rating: 4.8,
        reviews: 312,
        tag: "MAIS VENDIDO",
        gradient: "from-orange-500/20 to-red-500/10",
        accent: "text-orange-400",
        emoji: "👟",
        externalUrl: "https://www.nike.com.br"
      },
      {
        name: "Garmin Forerunner 255",
        category: "Acessórios",
        price: 2499,
        rating: 4.9,
        reviews: 842,
        tag: "O MELHOR",
        gradient: "from-blue-500/20 to-cyan-500/10",
        accent: "text-blue-400",
        emoji: "⌚",
        externalUrl: "https://www.garmin.com.br"
      },
      {
        name: "Camiseta Veloxy Aero",
        category: "Roupas",
        price: 159,
        rating: 4.7,
        reviews: 56,
        gradient: "from-purple-500/20 to-violet-500/10",
        accent: "text-purple-400",
        emoji: "👕",
        externalUrl: "#"
      },
      {
        name: "Fone Shokz OpenRun",
        category: "Acessórios",
        price: 1199,
        rating: 4.6,
        reviews: 120,
        tag: "OFERTA",
        gradient: "from-zinc-500/20 to-zinc-400/10",
        accent: "text-zinc-400",
        emoji: "🎧",
        externalUrl: "https://shokz.com"
      },
      {
        name: "Adidas Adizero Pro",
        category: "Tênis",
        price: 1299,
        rating: 4.9,
        reviews: 215,
        tag: "ELITE",
        gradient: "from-blue-600/20 to-indigo-500/10",
        accent: "text-indigo-400",
        emoji: "👟",
        externalUrl: "https://www.adidas.com.br"
      },
      {
        name: "Gel Energético (Kit 10)",
        category: "Suplementos",
        price: 99,
        rating: 4.2,
        reviews: 89,
        gradient: "from-green-500/20 to-emerald-500/10",
        accent: "text-green-400",
        emoji: "🧪",
        externalUrl: "#"
      }
    ];

    const promises = initialProducts.map(p => addDoc(collection(db, "products"), p));
    await Promise.all(promises);
    console.log("Produtos semeados com sucesso!");
  } catch (error) {
    console.error("Erro no seeding de produtos:", error);
  }
};

// ─── Events Functions ───────────────────────────────────────────────────────

/**
 * Busca eventos disponíveis, podendo filtrar por cidade
 */
export const getEvents = async (cityFilter?: string): Promise<RunningEvent[]> => {
  try {
    const q = query(collection(db, "events"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RunningEvent));

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
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      participantsIds: arrayUnion(userId),
      participantsCount: increment(1)
    });

    // Também registrar no perfil do usuário para busca rápida
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      enrolledEvents: arrayUnion(eventId)
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao se inscrever no evento:", error);
    throw error;
  }
};

/**
 * Busca eventos onde o usuário está inscrito
 */
export const getUserEvents = async (userId: string): Promise<RunningEvent[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const enrolledIds = userSnap.data().enrolledEvents || [];
    if (enrolledIds.length === 0) return [];

    // Buscar os docs dos ids (em chunks de 10 por limitação do where "in")
    const q = query(collection(db, "events"), where("__name__", "in", enrolledIds.slice(0, 10)));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RunningEvent));
  } catch (error) {
    console.error("Erro ao buscar eventos do usuário:", error);
    return [];
  }
};

/**
 * Seed inicial de eventos — com datas dinâmicas (sempre futuras)
 * Usar apenas para popular o banco pela primeira vez via console.
 */
export const seedEvents = async () => {
  try {
    const existing = await getDocs(collection(db, "events"));
    if (!existing.empty) return;

    // Gerar datas futuras dinamicamente
    const futureDate = (daysFromNow: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      return d;
    };

    const formatSeedDate = (date: Date) => {
      const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
      return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]}`;
    };

    const d1 = futureDate(30);
    const d2 = futureDate(60);
    const d3 = futureDate(90);
    const d4 = futureDate(150);

    const initialEvents: Omit<RunningEvent, "id">[] = [
      {
        title: "Maratona de São Paulo",
        date: formatSeedDate(d1),
        location: "Parque do Ibirapuera",
        city: "São Paulo",
        participantsCount: 1250,
        category: "MARATONA",
        image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=800&auto=format&fit=crop",
        price: "R$ 120",
        timestamp: d1
      },
      {
        title: "Night Run: Edição Verão",
        date: formatSeedDate(d2),
        location: "Marginal Pinheiros",
        city: "São Paulo",
        participantsCount: 450,
        category: "10K / 5K",
        image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
        price: "R$ 85",
        timestamp: d2
      },
      {
        title: "Rio City Half Marathon",
        date: formatSeedDate(d3),
        location: "Aterro do Flamengo",
        city: "Rio de Janeiro",
        participantsCount: 3000,
        category: "21K",
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop",
        price: "R$ 150",
        timestamp: d3
      },
      {
        title: "Floripa Marathon",
        date: formatSeedDate(d4),
        location: "Beira Mar Norte",
        city: "Florianópolis",
        participantsCount: 800,
        category: "MARATONA",
        image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?q=80&w=800&auto=format&fit=crop",
        price: "R$ 110",
        timestamp: d4
      }
    ];

    const promises = initialEvents.map(e => addDoc(collection(db, "events"), e));
    await Promise.all(promises);
    console.log("Eventos semeados com sucesso!");
  } catch (error) {
    console.error("Erro no seeding de eventos:", error);
  }
};
