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

import { auth } from "@/config/firebase";
import { syncGoogleProfilePhoto } from "@/lib/user-photo";

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return provider;
}

function createMicrosoftProvider() {
  const provider = new OAuthProvider("microsoft.com");

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return provider;
}

function createAppleProvider() {
  const provider = new OAuthProvider("apple.com");

  provider.addScope("email");
  provider.addScope("name");

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return provider;
}

export async function login(email: string, senha: string) {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithEmailAndPassword(auth, email, senha);

  return result.user;
}

export async function loginComGoogleRedirect() {
  await setPersistence(auth, browserLocalPersistence);

  await signInWithRedirect(auth, createGoogleProvider());
}

export async function loginComGooglePopup() {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, createGoogleProvider());
  await syncGoogleProfilePhoto(result.user);

  return result.user;
}

export async function finalizarLoginRedirect() {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await syncGoogleProfilePhoto(result.user);
  }

  return result?.user ?? null;
}

export async function loginComMicrosoft() {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, createMicrosoftProvider());

  return result.user;
}

export async function loginComMicrosoftRedirect() {
  await setPersistence(auth, browserLocalPersistence);

  await signInWithRedirect(auth, createMicrosoftProvider());
}

export async function loginComApple() {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, createAppleProvider());

  return result.user;
}

export async function loginComAppleRedirect() {
  await setPersistence(auth, browserLocalPersistence);

  await signInWithRedirect(auth, createAppleProvider());
}
