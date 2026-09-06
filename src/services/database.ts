import { doc, arrayUnion, arrayRemove, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { api, ApiError } from "@/services/apiClient";
import { toDateSafe } from "@/lib/feed-utils";
import type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats, RunningGroup, GroupPost, GroupPostComment, GroupMessage, PetSpecies, PetAccessorySlot } from "@/types";

// Re-exportar types para quem já importava direto daqui
export type { UserProfile, ActivityData, FeedActivity, Product, RunningEvent, UserStats, RunningGroup, GroupPost, GroupPostComment, GroupMessage };

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
// Fase 1 da migração: activities, XP/petCoins e weeklyKm dos grupos do
// usuário agora são tudo tratado dentro de POST /activities no backend
// próprio (ver backend/app/routers/activities.py) — não precisa mais de uma
// segunda chamada para atualizar os grupos depois de salvar a corrida.
export const saveActivity = async (data: ActivityData) => {
  return api.post<{ id: string; xpUpdateFailed: boolean }>("/activities", data);
};

// Buscar perfil do usuário — Fase 1: os campos principais (XP, nível, pet)
// agora vêm do backend próprio (Postgres). joinedGroupIds/enrolledEvents são
// a união de grupos/eventos reais (Postgres) com os de demonstração
// (Firestore, nunca tiveram linha real no Postgres).
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const profile = await api.get<UserProfile>(`/users/${userId}`);

    const [realGroupIds, realEventIds, legacyIds] = await Promise.all([
      api.get<string[]>(`/groups/joined/${userId}`).catch((groupsError) => {
        console.warn("Nao foi possivel buscar grupos reais do usuario:", groupsError);
        return [] as string[];
      }),
      api.get<string[]>(`/events/enrolled/${userId}`).catch((eventsError) => {
        console.warn("Nao foi possivel buscar eventos reais do usuario:", eventsError);
        return [] as string[];
      }),
      (async () => {
        try {
          const legacySnap = await getDoc(doc(db, "users", userId));
          if (!legacySnap.exists()) return { joinedGroupIds: [] as string[], enrolledEvents: [] as string[] };
          const legacy = legacySnap.data();
          return {
            joinedGroupIds: Array.isArray(legacy.joinedGroupIds) ? legacy.joinedGroupIds : [],
            enrolledEvents: Array.isArray(legacy.enrolledEvents) ? legacy.enrolledEvents : [],
          };
        } catch (legacyError) {
          console.warn("Nao foi possivel ler joinedGroupIds/enrolledEvents do Firestore:", legacyError);
          return { joinedGroupIds: [] as string[], enrolledEvents: [] as string[] };
        }
      })(),
    ]);

    profile.joinedGroupIds = [...new Set([...realGroupIds, ...legacyIds.joinedGroupIds])];
    profile.enrolledEvents = [...new Set([...realEventIds, ...legacyIds.enrolledEvents])];

    return profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
};

// Cria/atualiza o perfil do usuário logo após o cadastro. Nunca envia
// totalXP/level — o backend controla esses campos (POST /activities), evitando
// que um create malformado zere ou sobrescreva estatísticas existentes.
export const createUserProfile = async (
  userId: string,
  data: { displayName?: string | null; photoURL?: string | null; termsVersion?: string }
) => {
  await api.put(`/users/${userId}`, data);
};

// Buscar Ranking Global (Top 10 por XP) — Fase 1: backend próprio.
export const getGlobalRanking = async (limitCount = 10): Promise<UserProfile[]> => {
  try {
    return await api.get<UserProfile[]>(`/users/ranking/global?limit=${limitCount}`);
  } catch (error) {
    console.error("Erro ao buscar ranking:", error);
    return [];
  }
};

export const deleteUserActivities = async (userId: string): Promise<number> => {
  const { deleted_count: deletedCount } = await api.delete<{ deleted_count: number }>(
    `/activities/user/${userId}/all`
  );
  return deletedCount;
};

export const deleteUserActivity = async (activityId: string, userId: string) => {
  try {
    await api.delete(`/activities/${activityId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Corrida não encontrada para este usuário.");
    }
    throw error;
  }
  void userId; // mantido na assinatura por compatibilidade com os chamadores existentes
};

// Feed de atividades — Fase 1: sem onSnapshot ainda (real-time via WebSocket
// é a Fase 2 do plano de migração). Por enquanto, poll simples a cada 15s.
// Interface mantida igual (retorna uma função de "unsubscribe") para não
// exigir mudanças nos componentes que já consomem isso.
export const subscribeToFeed = (
  callback: (activities: FeedActivity[]) => void,
  limitCount = 10
) => {
  let cancelled = false;

  const fetchFeed = async () => {
    try {
      const activities = await api.get<FeedActivity[]>(`/activities/feed?limit=${limitCount}`);
      if (!cancelled) callback(activities);
    } catch (error) {
      console.error("Erro ao buscar feed:", error);
    }
  };

  fetchFeed();
  const intervalId = setInterval(fetchFeed, 15_000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

// Buscar atividades mais antigas (paginação cursor-based pelo id numérico)
export const loadMoreActivities = async (
  lastId: FeedActivity["id"],
  limitCount = 10
): Promise<FeedActivity[]> => {
  try {
    return await api.get<FeedActivity[]>(`/activities/feed?limit=${limitCount}&before_id=${lastId}`);
  } catch (error) {
    console.error("Erro ao carregar mais atividades:", error);
    return [];
  }
};

// Curtir/Descurtir uma atividade
export const toggleLike = async (activityId: string, userId: string, isLiked: boolean) => {
  try {
    await api.post(`/activities/${activityId}/like`, { isLiked });
  } catch (error) {
    console.error("Erro ao dar like:", error);
    throw error;
  }
  void userId; // mantido na assinatura: quem curte é sempre o usuario autenticado no backend
};

// Buscar estatísticas completas do usuário — Fase 1: activities vem do
// backend próprio. limit=100000 pede "todas" (backend não tem endpoint
// dedicado de contagem ainda; volume de corridas por usuário é pequeno).
export const getUserStats = async (userId: string) => {
  try {
    const rawActivities = await api.get<FeedActivity[]>(`/activities/user/${userId}?limit=100000`);
    const activities = rawActivities
      .map((activity) => normalizeActivity(activity.id, activity))
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
    let hasHourLongRun = false;
    let hasSub10kRun = false;
    let dawnRunsCount = 0;
    let nightRunsCount = 0;
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

      const durationSeconds = Number(activity.durationSeconds || 0);
      if (durationSeconds >= 3600) hasHourLongRun = true;
      if (distance >= 10 && durationSeconds > 0 && durationSeconds <= 3600) hasSub10kRun = true;

      // Acumular km no dia correto para o gráfico semanal
      if (activity.timestamp || typeof activity.createdAtMs === "number") {
        const activityDate = toDateSafe(activity.timestamp) ?? new Date(activity.createdAtMs || 0);
        const dateKey = dayKeyFromDate(activityDate);
        activeDays.add(dateKey);
        if (dateKey in weekMap) {
          weekMap[dateKey] += distance;
        }

        // Amanhecer: 4h-7h. Noite: 20h-4h. Usado pelas conquistas "10 amanheceres"/"10 noites".
        const hour = activityDate.getHours();
        if (hour >= 4 && hour < 7) dawnRunsCount += 1;
        else if (hour >= 20 || hour < 4) nightRunsCount += 1;
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
      hasHourLongRun,
      hasSub10kRun,
      dawnRunsCount,
      nightRunsCount,
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
      hasHourLongRun: false,
      hasSub10kRun: false,
      dawnRunsCount: 0,
      nightRunsCount: 0,
    };
  }
}

// ─── Marketplace Functions ──────────────────────────────────────────────────

/**
 * Busca todos os produtos da loja no Firestore
 */
export const getUserActivities = async (userId: string, limitCount = 10): Promise<FeedActivity[]> => {
  try {
    const activities = await api.get<FeedActivity[]>(`/activities/user/${userId}?limit=${limitCount}`);
    return activities.map((activity) => normalizeActivity(activity.id, activity));
  } catch (error) {
    console.error("Erro ao buscar corridas do usuario:", error);
    return [];
  }
};

// Fase 1: products migrou para o backend próprio (catálogo somente leitura,
// cadastrado fora do app — sem endpoint de escrita, mesma regra de antes).
export const getProducts = async (): Promise<Product[]> => {
  try {
    return await api.get<Product[]>("/products");
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

// Fase 1: grupos migraram para o backend próprio. Se a API não retornar
// nenhum grupo real ainda, mantém os grupos de demonstração (mesmo
// comportamento de quando o Firestore estava vazio).
export const getGroups = async (): Promise<RunningGroup[]> => {
  try {
    const groups = await api.get<RunningGroup[]>("/groups");
    return groups.length > 0 ? groups : FALLBACK_GROUPS;
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    return FALLBACK_GROUPS;
  }
};

// Criar grupo: userId/userName não são mais enviados — o backend usa o
// usuário autenticado (token) como criador e busca o nome no perfil já
// migrado, evitando que o client possa se declarar como outra pessoa.
export const createGroup = async ({
  name,
  city,
  description,
  tag,
}: {
  name: string;
  city: string;
  description: string;
  tag: string;
  userId: string;
  userName: string;
}) => {
  const group = await api.post<RunningGroup>("/groups", { name, city, description, tag });
  return group.id;
};

// joinGroup/leaveGroup: grupos de demonstração continuam gravando
// joinedGroupIds no Firestore (não têm linha real no Postgres); grupos
// reais vão direto para /groups/{id}/join|leave, que já cuida de
// membro+contador numa única transação no backend.
export const joinGroup = async (groupId: string, userId: string) => {
  if (FALLBACK_GROUPS.some((group) => group.id === groupId)) {
    await setDoc(doc(db, "users", userId), { joinedGroupIds: arrayUnion(groupId) }, { merge: true });
    return true;
  }

  await api.post(`/groups/${groupId}/join`);
  return true;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  if (FALLBACK_GROUPS.some((group) => group.id === groupId)) {
    await setDoc(doc(db, "users", userId), { joinedGroupIds: arrayRemove(groupId) }, { merge: true });
    return true;
  }

  await api.post(`/groups/${groupId}/leave`);
  return true;
};

// Fase 1: activities agora vive no backend próprio, não mais no Firestore —
// mesmo com grupos ainda não migrados, essa busca precisa ir na API nova.
export const getGroupActivities = async (group: RunningGroup, limitCount = 12): Promise<FeedActivity[]> => {
  const memberIds = group.memberIds.slice(0, 30);
  if (memberIds.length === 0) return [];

  try {
    const rawActivities = await api.get<FeedActivity[]>(
      `/activities/by-users?user_ids=${memberIds.join(",")}&limit=${limitCount}`
    );
    return rawActivities.map((activity) => normalizeActivity(activity.id, activity));
  } catch (error) {
    console.error("Erro ao buscar feed do grupo:", error);
    return [];
  }
};

// Fase 1: perfis agora vivem no backend próprio, não mais no Firestore —
// mesmo com grupos ainda não migrados, essa busca precisa ir na API nova.
export const getGroupLeaderboard = async (group: RunningGroup): Promise<UserProfile[]> => {
  const memberIds = group.memberIds.slice(0, 30);
  if (memberIds.length === 0) return [];

  try {
    const profiles = await api.get<UserProfile[]>(`/users/by-ids?ids=${memberIds.join(",")}`);
    return profiles.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
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

  try {
    return await api.get<RunningGroup>(`/groups/${groupId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

// Grava a foto do grupo já enviada ao Storage. Backend restringe a troca a
// quem criou o grupo (mesma regra que existia em firestore.rules).
export const updateGroupPhoto = async (groupId: string, photoURL: string): Promise<void> => {
  await api.put(`/groups/${groupId}/photo`, { photoURL });
};

// Feed do grupo — Fase 1: sem onSnapshot ainda (mesma decisão do feed geral
// de atividades: polling a cada 15s até a Fase 2 trazer WebSocket).
export const subscribeToGroupPosts = (
  groupId: string,
  callback: (posts: GroupPost[]) => void,
  limitCount = 30
) => {
  let cancelled = false;
  const fetchPosts = async () => {
    try {
      const posts = await api.get<GroupPost[]>(`/groups/${groupId}/posts?limit=${limitCount}`);
      if (!cancelled) callback(posts);
    } catch (error) {
      console.error("Erro ao buscar feed do grupo:", error);
    }
  };
  fetchPosts();
  const intervalId = setInterval(fetchPosts, 15_000);
  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

// authorId/authorName/authorPhoto não são mais enviados — o backend usa o
// usuário autenticado e busca nome/foto atuais no perfil (evita que o
// client se declare como outro autor, o que o Firestore antigo permitia).
export const createGroupPost = async ({
  groupId,
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
  const post = await api.post<GroupPost>(`/groups/${groupId}/posts`, { text, imageURL });
  return post.id;
};

export const toggleGroupPostLike = async (groupId: string, postId: string, userId: string, isLiked: boolean) => {
  await api.post(`/groups/${groupId}/posts/${postId}/like`, { isLiked });
  void userId; // mantido na assinatura: quem curte é sempre o usuario autenticado no backend
};

// Comentários de uma publicação — mesmo esquema de polling do feed do grupo.
export const subscribeToGroupPostComments = (
  groupId: string,
  postId: string,
  callback: (comments: GroupPostComment[]) => void
) => {
  let cancelled = false;
  const fetchComments = async () => {
    try {
      const comments = await api.get<GroupPostComment[]>(`/groups/${groupId}/posts/${postId}/comments`);
      if (!cancelled) callback(comments);
    } catch (error) {
      console.error("Erro ao buscar comentarios do post:", error);
    }
  };
  fetchComments();
  const intervalId = setInterval(fetchComments, 15_000);
  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

export const addGroupPostComment = async (
  groupId: string,
  postId: string,
  { text }: { authorId: string; authorName: string; authorPhoto: string | null; text: string }
) => {
  const comment = await api.post<GroupPostComment>(`/groups/${groupId}/posts/${postId}/comments`, { text });
  return comment.id;
};

// Chat do grupo — mesmo esquema de polling.
export const subscribeToGroupMessages = (
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  limitCount = 100
) => {
  let cancelled = false;
  const fetchMessages = async () => {
    try {
      const messages = await api.get<GroupMessage[]>(`/groups/${groupId}/messages?limit=${limitCount}`);
      if (!cancelled) callback(messages);
    } catch (error) {
      console.error("Erro ao buscar mensagens do grupo:", error);
    }
  };
  fetchMessages();
  const intervalId = setInterval(fetchMessages, 15_000);
  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

export const sendGroupMessage = async ({
  groupId,
  text,
}: {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
}) => {
  await api.post(`/groups/${groupId}/messages`, { text });
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

// Preenche defaults amigáveis para campos que o backend pode devolver vazios
// (image/price/etc não são obrigatórios no schema — eventos podem ser
// cadastrados sem essas informações). Mesma lógica que existia no
// normalizeEvent do Firestore, só que aplicada sobre a resposta já tipada
// da API em vez de dados brutos de documento.
const applyEventDefaults = (event: RunningEvent): RunningEvent => {
  const category = event.category || "Corrida";
  return {
    ...event,
    title: event.title || "Corrida oficial",
    location: event.location || "Local a confirmar",
    city: event.city || "Brasil",
    country: event.country || "BR",
    distanceOptions:
      event.distanceOptions && event.distanceOptions.length > 0
        ? event.distanceOptions
        : category.split("/").map((item) => item.trim()).filter(Boolean),
    image: event.image || "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=900&auto=format&fit=crop",
    price: event.price || "Ver no site oficial",
    officialUrl: event.officialUrl || event.sourceUrl || "",
    source: event.source || "Fonte oficial",
    sourceUrl: event.sourceUrl || event.officialUrl || "",
    sourceType: event.sourceType || "manual",
    status: event.status || "unknown",
  };
};

// Fase 1: eventos migraram para o backend próprio. Sem endpoint de criação
// (igual ao Firestore antes: eventos são cadastrados fora do app) — se a API
// não retornar nenhum, caem os eventos de demonstração locais.
export const getEvents = async (cityFilter?: string): Promise<RunningEvent[]> => {
  try {
    const rawEvents = await api.get<RunningEvent[]>("/events");
    let events = rawEvents.length > 0 ? rawEvents.map(applyEventDefaults) : getFallbackEvents();

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

// Inscreve o usuário em um evento. Eventos locais/demo (prefixo "local-",
// nunca têm linha real no Postgres) continuam gravando enrolledEvents no
// Firestore; eventos reais vão direto para /events/{id}/join.
export const joinEvent = async (eventId: string, userId: string) => {
  try {
    if (eventId.startsWith("local-")) {
      await setDoc(doc(db, "users", userId), { enrolledEvents: arrayUnion(eventId) }, { merge: true });
      return true;
    }

    await api.post(`/events/${eventId}/join`);
    return true;
  } catch (error) {
    console.error("Erro ao se inscrever no evento:", error);
    throw error;
  }
};

// ─── Pet ────────────────────────────────────────────────────────────────────
// Fase 1: pet* já fazia parte do schema Postgres desde a Fase 0 (mesmos
// campos do perfil migrado) — essas ações vão direto na API própria.
// addPetCoins não existe mais como função separada: o backend credita
// RunCoins dentro do próprio POST /activities (ver backend/app/routers/activities.py).

// Escolha do pet: só pode ser feita uma vez (o backend recusa com 409 se o
// usuário já tiver um petSpecies salvo).
export const choosePet = async (userId: string, species: PetSpecies, name: string): Promise<void> => {
  await api.post(`/users/${userId}/pet/choose`, { species, name: name.trim() });
};

// Compra um acessório da loja: debita o preço e adiciona o id à lista de
// desbloqueados. Atômico no backend (commit único por request).
export const purchasePetAccessory = async (userId: string, accessoryId: string, price: number): Promise<void> => {
  try {
    await api.post(`/users/${userId}/pet/purchase`, { accessoryId, price });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      throw new Error("RunCoins insuficientes.");
    }
    throw error;
  }
};

// accessoryId === null desequipa o slot.
export const equipPetAccessory = async (userId: string, slot: PetAccessorySlot, accessoryId: string | null): Promise<void> => {
  await api.put(`/users/${userId}/pet/equip`, { slot, accessoryId });
};

