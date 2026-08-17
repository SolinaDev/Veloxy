import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, X, Loader2, KeyRound } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { auth } from "@/config/firebase";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

function getResetErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Digite um email válido.";

      case "auth/missing-email":
        return "Digite seu email.";

      case "auth/too-many-requests":
        return "Muitas tentativas. Aguarde um pouco e tente novamente.";

      case "auth/network-request-failed":
        return "Erro de conexão. Verifique sua internet.";

      case "auth/operation-not-allowed":
        return "Recuperação de senha não está disponível no momento.";

      default:
        return `Não foi possível enviar o email. (${error.code})`;
    }
  }

  return "Não foi possível enviar o email. Tente novamente.";
}

export default function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
    }
  }, [open, initialEmail]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const emailLimpo = email.trim();

    if (!emailLimpo) {
      toast.error("Digite seu email.");
      return;
    }

    try {
      setLoading(true);

      // Deixa o email enviado pelo Firebase em português
      auth.languageCode = "pt-BR";

      await sendPasswordResetEmail(auth, emailLimpo);

      toast.success(
        "Email de recuperação enviado! Verifique sua caixa de entrada.",
      );

      onClose();
    } catch (error: unknown) {
      console.error("Erro ao recuperar senha:", error);

      toast.error(getResetErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 20,
            }}
            transition={{
              duration: 0.2,
            }}
            className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            {/* Fechar */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="absolute right-5 top-5 text-zinc-500 transition hover:text-white disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Ícone */}
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
              <KeyRound className="h-6 w-6 text-purple-400" />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-white">
              Recuperar senha
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Digite o email da sua conta e enviaremos um link para você
              criar uma nova senha.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu email"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    className="w-full rounded-xl border border-input bg-secondary py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-purple-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <motion.button
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </motion.button>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="w-full py-1 text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}