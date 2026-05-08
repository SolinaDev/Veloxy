import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { storage, auth, db } from "@/firebase";

/**
 * Faz upload do arquivo para o Firebase Storage e atualiza os perfis.
 * @param file Arquivo inputado pelo usuário
 * @param uid ID do usuário
 * @returns {string} URL pública da nova foto
 */
export async function uploadAvatar(file: File, uid: string): Promise<string> {
  if (!uid) throw new Error("O usuário precisa estar logado para enviar uma foto");

  // Nome único via Timestamp para quebrar o cache de browser (senão o browser mostra a foto velha)
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `avatars/${uid}_${Date.now()}.${fileExt}`;
  
  const storageRef = ref(storage, filePath);

  try {
    // 1. Faz o upload bruto
    await uploadBytes(storageRef, file);

    // 2. Extraí link seguro
    const url = await getDownloadURL(storageRef);

    // 3. Modifica no Firebase Authentication
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await updateProfile(currentUser, { photoURL: url });
    }

    // 4. Modifica no Firestore (usado para Rankings, Feeds, etc)
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { photoURL: url }, { merge: true });

    return url;
  } catch (error) {
    console.error("Erro interno no serviço de armazenamento (Storage):", error);
    throw error;
  }
}
