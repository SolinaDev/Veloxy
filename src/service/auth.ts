// src/service/auth.ts

import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { auth } from "../firebase";

// Login com email e senha
export async function login(email: string, senha: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, senha);
    return result.user;
  } catch (error) {
    console.error("Erro no login com email/senha:", error);
    throw error;
  }
}

// Login com Google
export async function loginComGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erro no login Google:", error);
    throw error;
  }
}

// Login com Microsoft
export async function loginComMicrosoft() {
  try {
    const provider = new OAuthProvider("microsoft.com");
    provider.setCustomParameters({ tenant: "consumers" }); // apenas contas pessoais (Outlook, Hotmail)
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erro no login Microsoft:", error);
    throw error;
  }
}

// Login com Apple
export async function loginComApple() {
  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erro no login Apple:", error);
    throw error;
  }
}
