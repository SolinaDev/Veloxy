import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

import { auth } from "@/firebase";

import {
  loginComGoogle,
  loginComMicrosoft,
  loginComApple,
} from "@/service/auth";

import { getUserProfile } from "@/service/database";

import { toast } from "sonner";

import logo from "@/assets/LogoNova.png";

import { FcGoogle } from "react-icons/fc";
import { FaApple, FaMicrosoft } from "react-icons/fa";

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

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

      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/user-not-found") {
        toast.error("Usuário não encontrado");
      } else if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        toast.error("Senha incorreta");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Email inválido");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);

      const user = await loginComGoogle();

      if (user?.uid) {
        await getUserProfile(user.uid);
      }

      toast.success("Login com Google realizado!");

      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Login cancelado");
      } else {
        toast.error("Erro ao entrar com Google");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    try {
      setLoading(true);

      const user = await loginComMicrosoft();

      if (user?.uid) {
        await getUserProfile(user.uid);
      }

      toast.success("Login com Microsoft realizado!");

      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Login cancelado");
      } else {
        toast.error("Erro ao entrar com Microsoft");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    try {
      setLoading(true);

      const user = await loginComApple();

      if (user?.uid) {
        await getUserProfile(user.uid);
      }

      toast.success("Login com Apple realizado!");

      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Login cancelado");
      } else {
        toast.error("Erro ao entrar com Apple");
      }
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
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/user-not-found") {
        toast.error("Usuário não encontrado");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Email inválido");
      } else {
        toast.error("Erro ao enviar recuperação");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-10 overflow-hidden relative">
      {/* FUNDO ANIMADO */}
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
          className="absolute top-10 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
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
          className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-xl"
      >
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-10 md:p-12 shadow-2xl"
        >
          {/* LOGO NOVA */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center mb-10"
          >
            <motion.img
              src={logo}
              alt="Logo Veloxy"
              className="w-44 h-44 object-contain mb-6 drop-shadow-2xl"
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

            <h1 className="text-4xl font-bold text-white">
              Bem-vindo
            </h1>

            <p className="text-zinc-400 mt-3 text-lg">
              Faça login para continuar
            </p>
          </motion.div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div variants={itemVariants}>
              <label className="text-base text-zinc-300 mb-2 block font-medium">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />

                <input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-4 pl-12 pr-4 text-white text-base outline-none focus:border-purple-500 transition disabled:opacity-60"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="text-base text-zinc-300 mb-2 block font-medium">
                Senha
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />

                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-4 pl-12 pr-12 text-white text-base outline-none focus:border-purple-500 transition disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  disabled={loading}
                  className="absolute right-4 top-4 text-zinc-400 hover:text-purple-400 transition disabled:opacity-60"
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

            <motion.div
              variants={itemVariants}
              className="flex justify-end"
            >
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-base text-purple-400 hover:text-purple-300 transition disabled:opacity-60"
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
              className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-4 text-white text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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

          {/* CRIAR CONTA */}
          <motion.p
            variants={itemVariants}
            className="text-center text-base text-zinc-400 mt-6"
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

          {/* DIVISOR */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-4 my-8"
          >
            <div className="flex-1 h-px bg-zinc-700" />

            <span className="text-zinc-500 text-base">
              ou continue com
            </span>

            <div className="flex-1 h-px bg-zinc-700" />
          </motion.div>

          {/* LOGIN SOCIAL */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4"
          >
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
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-4 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FcGoogle className="text-3xl" />
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
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-4 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaMicrosoft className="text-3xl text-white" />
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
              className="bg-zinc-800 hover:bg-zinc-700 transition rounded-xl py-4 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaApple className="text-3xl text-white" />
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}