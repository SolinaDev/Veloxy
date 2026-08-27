import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { storage, auth, db } from "@/config/firebase";
import { updateGroupPhoto } from "@/services/database";

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
  const filePath = `avatars/${uid}/avatar_${Date.now()}.${fileExt}`;
  
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

/**
 * Envia a foto de um grupo para o Storage e grava a URL no documento do
 * grupo. Só quem criou o grupo tem permissão de escrita nesse caminho
 * (ver storage.rules), então `creatorUid` deve ser o uid do criador.
 */
export async function uploadGroupAvatar(file: File, groupId: string, creatorUid: string): Promise<string> {
  if (!creatorUid) throw new Error("O usuário precisa estar logado para enviar uma foto");

  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `groups/${groupId}/avatar/${creatorUid}/avatar_${Date.now()}.${fileExt}`;
  const storageRef = ref(storage, filePath);

  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateGroupPhoto(groupId, url);
    return url;
  } catch (error) {
    console.error("Erro ao enviar foto do grupo:", error);
    throw error;
  }
}

/**
 * Envia a imagem de uma publicação do feed de um grupo para o Storage e
 * retorna a URL pública. A gravação no Firestore (documento do post) fica
 * a cargo de quem chama, junto com o restante dos campos da publicação.
 */
export async function uploadGroupPostImage(file: File, groupId: string, userId: string): Promise<string> {
  if (!userId) throw new Error("O usuário precisa estar logado para enviar uma imagem");

  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `groups/${groupId}/posts/${userId}/post_${Date.now()}.${fileExt}`;
  const storageRef = ref(storage, filePath);

  try {
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Erro ao enviar imagem da publicação:", error);
    throw error;
  }
}
