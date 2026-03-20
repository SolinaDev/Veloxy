import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, senha);

      navigate("/"); // rota principal do seu app
    } catch (error) {
      alert("Email ou senha inválidos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Título */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Bem-vindo 👟
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Faça login para continuar sua jornada
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {/* Email */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex items-center gap-3 mt-1 bg-muted rounded-xl px-3 py-2">
              <Mail size={18} className="text-muted-foreground" />
              <input
                type="email"
                placeholder="seuemail@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground">Senha</label>
            <div className="flex items-center gap-3 mt-1 bg-muted rounded-xl px-3 py-2">
              <Lock size={18} className="text-muted-foreground" />
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

          {/* Botão */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-lime text-primary-foreground rounded-xl py-3 flex items-center justify-center gap-2 font-semibold shadow-glow"
          >
            {loading ? "Entrando..." : "Entrar"}
            <ArrowRight size={18} />
          </motion.button>

          {/* Criar conta */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Não tem conta?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-primary font-medium cursor-pointer"
            >
              Criar agora
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;