import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

import { auth } from "@/firebase";

export async function login(email: string, senha: string) {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithEmailAndPassword(auth, email, senha);

  return result.user;
}

export async function loginComGoogleRedirect() {
  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  await signInWithRedirect(auth, provider);
}

export async function finalizarLoginGoogleRedirect() {
  const result = await getRedirectResult(auth);

  return result?.user ?? null;
}

export async function loginComMicrosoft() {
  await setPersistence(auth, browserLocalPersistence);

  const provider = new OAuthProvider("microsoft.com");

  provider.setCustomParameters({
    tenant: "consumers",
    prompt: "select_account",
  });

  const result = await signInWithPopup(auth, provider);

  return result.user;
}

export async function loginComApple() {
  await setPersistence(auth, browserLocalPersistence);

  const provider = new OAuthProvider("apple.com");

  provider.addScope("email");
  provider.addScope("name");

  provider.setCustomParameters({
    prompt: "select_account",
  });

  const result = await signInWithPopup(auth, provider);

  return result.user;
}