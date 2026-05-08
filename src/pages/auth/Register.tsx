import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/firebase";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!username.trim()) {
      toast.error("Preencha o nome de usuário");
      return;
    }

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (email !== confirmEmail) {
      toast.error("Emails não coincidem");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 🔥 Salva o username como displayName no perfil do Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: username.trim(),
      });

      toast.success(`Bem-vindo, ${username}! Conta criada com sucesso.`);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        toast.error("Este email já está em uso");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Email inválido");
      } else if (err.code === "auth/weak-password") {
        toast.error("Senha muito fraca. Use pelo menos 6 caracteres");
      } else {
        toast.error("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">

      {/* LOGO */}
      <div className="mb-10">
        <div>
          <img src={logo} alt="Logo" className="w-50 h-48" />
        </div>
      </div>

      {/* FORM */}
      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* USERNAME */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <User size={18} className="text-gray-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Username"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* EMAIL */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <Mail size={18} className="text-gray-500 mr-2 shrink-0" />
          <input
            type="email"
            placeholder="Email"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* CONFIRM EMAIL */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <Mail size={18} className="text-gray-500 mr-2" />
          <input
            type="email"
            placeholder="Confirm Email"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <Lock size={18} className="text-gray-500 mr-2 shrink-0" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-500 hover:text-purple-600 transition-colors px-1"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <Lock size={18} className="text-gray-500 mr-2 shrink-0" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="text-gray-500 hover:text-purple-600 transition-colors px-1"
          >
            {showConfirmPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {/* BOTÃO REGISTER */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleRegister}
          className="mt-4 bg-gradient-to-r from-purple-500 to-purple-700 py-3 rounded-full font-semibold shadow-lg"
        >
          Register
        </motion.button>

        {/* TERMOS */}
        <p className="text-center text-xs text-gray-400 mt-2">
          Ao clicar em registrar você concorda com nossos{" "}
          <span className="text-cyan-400 cursor-pointer">
            Termos de Política e Privacidade
          </span>
        </p>

      </div>
    </div>
  );
}