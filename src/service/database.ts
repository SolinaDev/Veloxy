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
} from "firebase/firestore";
import { db } from "@/firebase";

export interface ActivityData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  distance: number;
  time: string;
  durationSeconds: number; // Guardar segundos para somatória
  pace: string;
  calories?: number;
  type: string;
  likes?: string[]; // Array de UIDs de quem curtiu
  timestamp?: Timestamp;
}

// Salvar uma nova atividade (corrida)
export const saveActivity = async (data: ActivityData) => {
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      ...data,
      likes: [],
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar atividade:", error);
    throw error;
  }
};

// Escutar atividades em tempo real (Real-time)
export const subscribeToFeed = (callback: (activities: any[]) => void) => {
  const q = query(collection(db, "activities"), orderBy("timestamp", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(activities);
  }, (error) => {
    console.error("Erro no listener do feed:", error);
  });
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

// Buscar estatísticas do usuário
export const getUserStats = async (userId: string) => {
  try {
    const q = query(collection(db, "activities"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    let totalKm = 0;
    let runsCount = 0;
    let totalSeconds = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ActivityData;
      totalKm += Number(data.distance || 0);
      totalSeconds += Number(data.durationSeconds || 0);
      runsCount += 1;
    });

    // Formatar tempo (ex: 4h 12m)
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalKm: totalKm.toFixed(1),
      runsCount,
      totalTime: formattedTime,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { totalKm: "0.0", runsCount: 0, totalTime: "0m" };
  }
}

