import {
  browserLocalPersistence,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";

import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import { auth } from "@/config/firebase";
import { syncGoogleProfilePhoto } from "@/lib/user-photo";
import { createUserProfile } from "@/services/database";

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return provider;
}

export async function login(email: string, senha: string) {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithEmailAndPassword(
    auth,
    email,
    senha,
  );

  return result.user;
}

export async function loginComGooglePopup() {
  await setPersistence(auth, browserLocalPersistence);

  // APP ANDROID / CAPACITOR
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({
      useCredentialManager: false,
    });

    const credentialData = result.credential;

    if (!credentialData?.idToken && !credentialData?.accessToken) {
      throw new Error(
        "Google nao retornou credenciais para o app.",
      );
    }

    const credential = GoogleAuthProvider.credential(
      credentialData.idToken,
      credentialData.accessToken,
    );

    const webResult = await signInWithCredential(
      auth,
      credential,
    );

    await syncGoogleProfilePhoto(webResult.user);
    await ensureUserProfile(webResult.user);

    return webResult.user;
  }

  // NAVEGADOR / WEB
  const result = await signInWithPopup(
    auth,
    createGoogleProvider(),
  );

  await syncGoogleProfilePhoto(result.user);
  await ensureUserProfile(result.user);

  return result.user;
}

// Login com Google nunca passava pelo cadastro (createUserProfile só era
// chamado em Register.tsx), então a primeira corrida de uma conta Google
// quebrava no backend (activities.user_id é FK de users.uid). Best-effort:
// nunca bloqueia o login se o backend estiver fora do ar.
async function ensureUserProfile(user: { uid: string; displayName: string | null; photoURL: string | null }) {
  try {
    await createUserProfile(user.uid, {
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  } catch (error) {
    console.warn("Nao foi possivel garantir o perfil apos login com Google:", error);
  }
}