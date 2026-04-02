import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

// Funções de login social
import { loginComGoogle, loginComMicrosoft, loginComApple } from "@/service/auth";

// Ícones
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaMicrosoft } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Login com email/senha
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      navigate("/");
    } catch (err) {
      alert("Erro ao fazer login com email/senha");
      console.error(err);
    }
  };

  // Login com Google
  const handleLoginGoogle = async () => {
    try {
      const user = await loginComGoogle();
      console.log("Usuário Google:", user);
      navigate("/");
    } catch (err) {
      alert("Erro ao fazer login com Google");
      console.error(err);
    }
  };

  // Login com Microsoft
  const handleLoginMicrosoft = async () => {
    try {
      const user = await loginComMicrosoft();
      console.log("Usuário Microsoft:", user);
      navigate("/");
    } catch (err) {
      alert("Erro ao fazer login com Microsoft");
      console.error(err);
    }
  };

  // Login com Apple
  const handleLoginApple = async () => {
    try {
      const user = await loginComApple();
      console.log("Usuário Apple:", user);
      navigate("/");
    } catch (err) {
      alert("Erro ao fazer login com Apple");
      console.error(err);
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
          <img src="../public/logo.jpg" alt="Logo" className="w-48 h-48 object-cover" />
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
          className="mt-2 bg-gradient-to-r from-purple-500 to-purple-700 py-3 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/30 transition-all"
        >
          Enter
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

        {/* SOCIAL LOGIN */}
        <div className="flex justify-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={handleLoginGoogle}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition"
          >
            <FcGoogle size={18} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={handleLoginMicrosoft}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition"
          >
            <FaMicrosoft size={18} className="text-blue-600" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={handleLoginApple}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition"
          >
            <FaApple size={18} className="text-black" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
