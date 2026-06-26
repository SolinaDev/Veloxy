import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

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

export async function loginComGooglePopup() {
  await setPersistence(auth, browserLocalPersistence);

  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({
      useCredentialManager: false,
    });
    const credentialData = result.credential;

    if (!credentialData?.idToken && !credentialData?.accessToken) {
      throw new Error("Google nao retornou credenciais para o app.");
    }

    const credential = GoogleAuthProvider.credential(
      credentialData.idToken,
      credentialData.accessToken,
    );
    const webResult = await signInWithCredential(auth, credential);
    await syncGoogleProfilePhoto(webResult.user);

    return webResult.user;
  }

  const result = await signInWithPopup(
    auth,
    createGoogleProvider(),
    browserPopupRedirectResolver,
  );
  await syncGoogleProfilePhoto(result.user);

  return result.user;
}

export async function loginComMicrosoft() {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(
    auth,
    createMicrosoftProvider(),
    browserPopupRedirectResolver,
  );

  return result.user;
}

export async function loginComApple() {
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(
    auth,
    createAppleProvider(),
    browserPopupRedirectResolver,
  );

  return result.user;
}
