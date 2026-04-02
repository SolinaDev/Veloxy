import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (email !== confirmEmail) {
      alert("Emails não coincidem");
      return;
    }

    if (password !== confirmPassword) {
      alert("Senhas não coincidem");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      alert("Erro ao registrar");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">

      {/* LOGO */}
      <div className="mb-10">
        <div>
          <img src="../public/logo.jpg" alt="Logo" className="w-48 h-48 object-cover" />
        </div>
      </div>

      {/* FORM */}
      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* USERNAME */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <User size={18} className="text-gray-500 mr-2" />
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
          <Mail size={18} className="text-gray-500 mr-2" />
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
          <Lock size={18} className="text-gray-500 mr-2" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={18} className="text-gray-500" />
            ) : (
              <Eye size={18} className="text-gray-500" />
            )}
          </button>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="flex items-center bg-zinc-200 rounded-full px-4 py-3">
          <Lock size={18} className="text-gray-500 mr-2" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="bg-transparent outline-none text-black w-full text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? (
              <EyeOff size={18} className="text-gray-500" />
            ) : (
              <Eye size={18} className="text-gray-500" />
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