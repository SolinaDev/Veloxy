import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, User } from "lucide-react";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/firebase";

const Register = () => {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome || !email || !senha) {
      alert("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      // salva o nome no perfil do Firebase
      await updateProfile(userCredential.user, {
        displayName: nome,
      });

      navigate("/"); // vai para dashboard
    } catch (error: any) {
      console.log(error.code);
      alert("Erro ao criar conta");
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
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Criar Conta 👟
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Comece sua jornada agora
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {/* Nome */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground">Nome</label>
            <div className="flex items-center gap-3 mt-1 bg-muted rounded-xl px-3 py-2">
              <User size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

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

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-lime text-primary-foreground rounded-xl py-3 flex items-center justify-center gap-2 font-semibold shadow-glow"
          >
            {loading ? "Criando..." : "Criar Conta"}
            <ArrowRight size={18} />
          </motion.button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Já tem conta?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-primary font-medium cursor-pointer"
            >
              Entrar
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;