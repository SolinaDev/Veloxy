import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";

import { auth } from "@/config/firebase";
import logo from "@/assets/LogoNova-login.png";

// Substitui a pagina padrao (branca, sem estilo) que o Firebase abre a
// partir do link do email — tanto para "confirmar email" (verifyEmail)
// quanto para "redefinir senha" (resetPassword). Precisa que o console do
// Firebase (Authentication > Templates > editar template > URL de acao)
// aponte para https://<seu-dominio>/auth/action em vez do dominio padrao
// *.firebaseapp.com.
type Status = "loading" | "resetForm" | "resetDone" | "verified" | "error";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-background px-4 py-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[440px] bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 text-center"
      >
        <img src={logo} alt="Logo Veloxy" className="w-20 h-20 object-contain mx-auto mb-4" />
        {children}
      </motion.div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/expired-action-code":
        return "Esse link expirou. Peça um novo email.";
      case "auth/invalid-action-code":
        return "Esse link já foi usado ou é inválido. Peça um novo email.";
      case "auth/weak-password":
        return "Escolha uma senha com pelo menos 6 caracteres.";
      case "auth/user-disabled":
        return "Essa conta foi desativada.";
      default:
        return `Não foi possível concluir a operação. (${error.code})`;
    }
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setErrorMessage("Link inválido ou incompleto.");
      setStatus("error");
      return;
    }

    if (mode === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(() => setStatus("verified"))
        .catch((error) => {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        });
      return;
    }

    if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((verifiedEmail) => {
          setEmail(verifiedEmail);
          setStatus("resetForm");
        })
        .catch((error) => {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        });
      return;
    }

    setErrorMessage("Esse tipo de link não é suportado.");
    setStatus("error");
  }, [mode, oobCode]);

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!oobCode) return;

    if (newPassword.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("resetDone");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-sm text-zinc-400">Validando link...</p>
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="text-red-400" size={26} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Não foi possível continuar</h1>
        <p className="text-sm text-zinc-400 mb-6">{errorMessage}</p>
        <Link
          to="/login"
          className="block w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 text-white text-sm font-semibold"
        >
          Voltar para o login
        </Link>
      </Shell>
    );
  }

  if (status === "verified") {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-400" size={26} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Email confirmado!</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Sua conta foi verificada. Volte ao app para continuar.
        </p>
        <Link
          to="/"
          className="block w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 text-white text-sm font-semibold"
        >
          Ir para o Veloxy
        </Link>
      </Shell>
    );
  }

  if (status === "resetDone") {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-400" size={26} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Senha alterada!</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Sua senha foi redefinida com sucesso. Já pode entrar com a nova senha.
        </p>
        <Link
          to="/login"
          className="block w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 text-white text-sm font-semibold"
        >
          Ir para o login
        </Link>
      </Shell>
    );
  }

  // resetForm
  return (
    <Shell>
      <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="text-purple-400" size={26} />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Redefinir senha</h1>
      <p className="text-sm text-zinc-400 mb-1">Criando nova senha para</p>
      <p className="text-sm text-purple-400 font-semibold mb-6 break-all">{email}</p>

      <form onSubmit={handleResetSubmit} className="space-y-3 text-left">
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoFocus
            disabled={submitting}
            className="w-full bg-secondary border border-input rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500 transition disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            disabled={submitting}
            className="w-full bg-secondary border border-input rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500 transition disabled:opacity-60"
          />
        </div>

        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </Shell>
  );
}
