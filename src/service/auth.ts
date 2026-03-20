// função para realizar o login do usuário usando email e senha com Firebase Authentication

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export const login = async (email: string, senha: string) => {
  return await signInWithEmailAndPassword(auth, email, senha);
};