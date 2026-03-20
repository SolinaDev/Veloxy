// Conectando o Firebase para autenticação de usuários e armazenamento de dados

import {initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDyl6iNPKmn7i2MtoOEYKRBhk7e-IoT8Xc",
  authDomain: "veloxy-20b42.firebaseapp.com",
  projectId: "veloxy-20b42"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);