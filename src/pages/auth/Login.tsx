import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { loginComGoogle, loginComMicrosoft, loginComApple } from "@/service/auth";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

// ICONES
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaMicrosoft } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        toast.error("Usuário não encontrado");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Senha incorreta");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Email inválido");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "microsoft" | "apple") => {
    setLoading(true);
    try {
      switch (provider) {
        case "google":
          await loginComGoogle();
          break;
        case "microsoft":
          await loginComMicrosoft();
          break;
        case "apple":
          await loginComApple();
          break;
      }
      toast.success("Login realizado com sucesso!");

      // Verifica se é o primeiro login (perfil não completado)
      const loggedUser = auth.currentUser;
      const profileComplete = localStorage.getItem(
        `veloxy_profile_complete_${loggedUser?.uid}`
      );

      if (!profileComplete) {
        navigate("/complete-profile");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.info("Login cancelado");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        toast.error("Já existe uma conta com esse email usando outro provedor");
      } else {
        toast.error(`Erro ao fazer login com ${provider}. Verifique se o provedor está habilitado.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">

      {/* LOGO */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div>
          <img src={logo} alt="Logo" className="w-50 h-48" />
        </div>
      </motion.div>

      {/* FORM */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col gap-4"
      >

        {/* EMAIL */}
        <div className="flex items-center bg-zinc-200 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-purple-500 transition">
          <Mail size={18} className="text-gray-500 mr-2" />
          <input
            type="email"
            placeholder="Email or Username"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* SENHA */}
        <div className="flex items-center bg-zinc-200 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-purple-500 transition">
          <Lock size={18} className="text-gray-500 mr-2" />
          <input
            type="password"
            placeholder="Password"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* REMEMBER + FORGOT */}
        <div className="flex justify-between items-center text-xs text-gray-400">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-purple-500" />
            Remember Me
          </label>

          <span className="text-cyan-400 cursor-pointer hover:underline">
            Forgot password?
          </span>
        </div>

        {/* BOTÃO LOGIN */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleLogin}
          disabled={loading}
          className="mt-2 bg-gradient-to-r from-purple-500 to-purple-700 py-3 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Entrando...
            </>
          ) : (
            "Enter"
          )}
        </motion.button>

        {/* REGISTER */}
        <p className="text-center text-xs text-gray-400">
          To create a new account{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-cyan-400 cursor-pointer hover:underline"
          >
            Click Here
          </span>
        </p>

        {/* DIVISOR */}
        <div className="flex items-center gap-3 my-3 text-gray-500 text-xs">
          <div className="flex-1 h-[1px] bg-gray-700" />
          OR
          <div className="flex-1 h-[1px] bg-gray-700" />
        </div>

        {/* SOCIAL LOGIN (PEQUENO E CENTRALIZADO) */}
        <div className="flex justify-center gap-4">

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle size={18} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => handleSocialLogin("microsoft")}
            disabled={loading}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaMicrosoft size={18} className="text-blue-600" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => handleSocialLogin("apple")}
            disabled={loading}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaApple size={18} className="text-black" />
          </motion.button>

        </div>

      </motion.div>
    </div>
  );
}