// src/firebase.ts
// ─── Firebase Configuration ─────────────────────────────────────────────────
// Todas as variáveis vêm do .env.local (Vite). Sem fallbacks hardcoded.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ── Validação obrigatória das variáveis de ambiente ──
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
] as const;

for (const key of requiredEnvVars) {
  if (!import.meta.env[key]) {
    console.error(
      `⚠️ Variável de ambiente ${key} não definida. Verifique seu .env.local`
    );
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── Firestore com persistência offline (API moderna v10+) ──
// Substitui o deprecated `enableIndexedDbPersistence`
// Suporta múltiplas abas automaticamente (sem crash de `failed-precondition`)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);