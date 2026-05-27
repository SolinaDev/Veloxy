import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { auth } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";

import {
  finalizarLoginRedirect,
  loginComApple,
  loginComAppleRedirect,
  loginComGooglePopup,
  loginComGoogleRedirect,
  loginComMicrosoft,
  loginComMicrosoftRedirect,
} from "@/services/auth";

import { toast } from "sonner";

import logo from "@/assets/LogoNova-login.png";

import { FcGoogle } from "react-icons/fc";
import { FaApple, FaMicrosoft } from "react-icons/fa";

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
    },
  },
};

function getAuthErrorCode(error: unknown) {
  return error instanceof FirebaseError ? error.code : undefined;
}

function getAuthErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);

  if (code === "auth/popup-closed-by-user") {
    return "Login cancelado.";
  }

  if (code === "auth/popup-blocked") {
    return "Popup bloqueado. O login com Google está usando redirecionamento.";
  }

  if (code === "auth/unauthorized-domain") {
    return "Domínio localhost não autorizado no Firebase.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Esse provedor de login não está ativado no Firebase.";
  }

  if (code === "auth/network-request-failed") {
    return "Erro de rede. Desative Brave Shields/AdBlock para localhost.";
  }

  if (code === "auth/user-not-found") {
    return "Usuário não encontrado.";
  }

  if (
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Email ou senha incorretos.";
  }

  if (code === "auth/invalid-email") {
    return "Email inválido.";
  }

  return `Erro ao fazer login: ${code || "erro desconhecido"}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificandoRedirect, setVerificandoRedirect] = useState(true);

  const shouldUseRedirectFallback = (error: unknown) => {
    const code = getAuthErrorCode(error);
    return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
  };

  useEffect(() => {
    async function verificarRetornoOAuth() {
      try {
        const redirectUser = await finalizarLoginRedirect();

        if (redirectUser) {
          toast.success("Login realizado!");
          navigate("/feed", { replace: true });
          return;
        }
      } catch (error: unknown) {
        console.error("Erro no retorno do login social:", error);
        toast.error(getAuthErrorMessage(error));
      } finally {
        setVerificandoRedirect(false);
      }
    }

    verificarRetornoOAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/feed", { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email || !senha) {
      toast.error("Preencha email e senha");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, senha);

      toast.success("Login realizado com sucesso!");

      navigate("/feed", { replace: true });
    } catch (error: unknown) {
      console.error("Erro completo no login:", error);
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);

      await loginComGooglePopup();

      toast.success("Login com Google realizado!");
      navigate("/feed", { replace: true });
    } catch (error: unknown) {
      if (shouldUseRedirectFallback(error)) {
        await loginComGoogleRedirect();
        return;
      }

      console.error("Erro completo Google:", error);
      toast.error(getAuthErrorMessage(error));
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    try {
      setLoading(true);

      await loginComMicrosoft();

      toast.success("Login com Microsoft realizado!");

      navigate("/feed", { replace: true });
    } catch (error: unknown) {
      if (shouldUseRedirectFallback(error)) {
        await loginComMicrosoftRedirect();
        return;
      }

      console.error("Erro completo Microsoft:", error);
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    try {
      setLoading(true);

      await loginComApple();

      toast.success("Login com Apple realizado!");

      navigate("/feed", { replace: true });
    } catch (error: unknown) {
      if (shouldUseRedirectFallback(error)) {
        await loginComAppleRedirect();
        return;
      }

      console.error("Erro completo Apple:", error);
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      toast.error("Digite seu email primeiro");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      toast.success("Email de recuperação enviado!");
    } catch (error: unknown) {
      console.error("Erro ao recuperar senha:", error);
      toast.error(getAuthErrorMessage(error));
    }
  }

  if (verificandoRedirect || authLoading) {
    return (
      <div className="h-[100svh] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />

          <p className="text-zinc-400 text-sm">Verificando login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100svh] flex items-center justify-center bg-black px-4 py-3 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-10 left-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-10 right-10 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[390px]"
      >
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl"
        >
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center mb-5"
          >
            <motion.img
              src={logo}
              alt="Logo Veloxy"
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain mb-3 drop-shadow-2xl"
              whileHover={{
                scale: 1.06,
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 16,
              }}
            />

            <h1 className="text-3xl font-bold text-white">Bem-vindo</h1>

            <p className="text-zinc-400 mt-2 text-sm">
              Faça login para continuar
            </p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="text-sm text-zinc-300 mb-2 block font-medium">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />

                <input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-purple-500 transition disabled:opacity-60"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="text-sm text-zinc-300 mb-2 block font-medium">
                Senha
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />

                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-11 pr-11 text-white text-sm outline-none focus:border-purple-500 transition disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  disabled={loading}
                  className="absolute right-4 top-3.5 text-zinc-400 hover:text-purple-400 transition disabled:opacity-60"
                >
                  <AnimatePresence mode="wait">
                    {mostrarSenha ? (
                      <motion.div
                        key="eyeoff"
                        initial={{
                          opacity: 0,
                          rotate: -90,
                          scale: 0.8,
                        }}
                        animate={{
                          opacity: 1,
                          rotate: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          rotate: 90,
                          scale: 0.8,
                        }}
                        transition={{
                          duration: 0.2,
                        }}
                      >
                        <EyeOff className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="eye"
                        initial={{
                          opacity: 0,
                          rotate: -90,
                          scale: 0.8,
                        }}
                        animate={{
                          opacity: 1,
                          rotate: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          rotate: 90,
                          scale: 0.8,
                        }}
                        transition={{
                          duration: 0.2,
                        }}
                      >
                        <Eye className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-sm text-purple-400 hover:text-purple-300 transition disabled:opacity-60"
              >
                Esqueci minha senha
              </button>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={
                !loading
                  ? {
                      scale: 1.02,
                    }
                  : {}
              }
              whileTap={
                !loading
                  ? {
                      scale: 0.98,
                    }
                  : {}
              }
              disabled={loading}
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </motion.button>
          </form>

          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-zinc-400 mt-4"
          >
            Não tem uma conta?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-purple-400 hover:text-purple-300 font-semibold transition"
            >
              Criar conta
            </button>
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-4 my-4"
          >
            <div className="flex-1 h-px bg-zinc-700" />

            <span className="text-zinc-500 text-sm">ou continue com</span>

            <div className="flex-1 h-px bg-zinc-700" />
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{
                scale: 0.95,
              }}
              onClick={handleGoogleLogin}
              disabled={loading}
              type="button"
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FcGoogle className="text-2xl" />
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{
                scale: 0.95,
              }}
              onClick={handleMicrosoftLogin}
              disabled={loading}
              type="button"
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaMicrosoft className="text-2xl text-white" />
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{
                scale: 0.95,
              }}
              onClick={handleAppleLogin}
              disabled={loading}
              type="button"
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaApple className="text-2xl text-white" />
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
