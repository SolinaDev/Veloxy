import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { updateProfile } from "firebase/auth";
import { db } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { User, MapPin, Pencil, Loader2, ChevronRight, Camera } from "lucide-react";
import logo from "@/assets/LogoNova-login.png";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [username, setUsername] = useState(user?.displayName || "");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");

  const handleComplete = async () => {
    if (!username.trim()) {
      toast.error("Escolha um nome de corredor");
      return;
    }

    setSaving(true);
    try {
      if (user) {
        const normalizedPhoto = photoURL.trim();
        await updateProfile(user, {
          displayName: username.trim(),
          photoURL: normalizedPhoto || null,
        });

        // Salvar dados do perfil no Firestore (não mais em localStorage)
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          displayName: username.trim(),
          photoURL: normalizedPhoto || null,
          location: location.trim(),
          bio: bio.trim(),
          onboarded: true,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
      toast.success(`Bem-vindo ao Veloxy, ${username}! 🏃‍♂️`);
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (user) {
      // Marcar como onboarded no Firestore mesmo pulando
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        onboarded: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">
      {/* Logo pequena */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <img src={logo} alt="Veloxy" className="w-24 h-20 object-contain" />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Quase lá! 🎉
        </h1>
        <p className="text-gray-400 text-sm max-w-xs">
          Complete seu perfil para personalizar sua experiência no Veloxy
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-4"
      >
        {/* Avatar preview */}
        <div className="flex justify-center mb-2">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center ring-2 ring-purple-500/30 ring-offset-2 ring-offset-black relative overflow-hidden shadow-lg">
            {photoURL ? (
               <img src={photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
               <span className="text-3xl font-display font-bold text-white z-10">
                 {username ? username.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
               </span>
            )}
            
            <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${photoURL ? 'opacity-0' : 'opacity-100'}`}>
               <Camera size={24} className="text-white opacity-90" />
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
            <User size={12} />
            Nome de Corredor *
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Escolha seu nome ou apelido"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
            <MapPin size={12} />
            Localização (opcional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: São Paulo, SP"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Camera size={12} />
              Foto por URL
            </label>
            <button
              type="button"
              onClick={() => setPhotoURL(user?.photoURL || "")}
              className="text-[10px] font-bold text-purple-400"
            >
              usar Google
            </button>
          </div>
          <input
            type="url"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
            <Pencil size={12} />
            Bio (opcional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre você como corredor..."
            rows={2}
            maxLength={150}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition resize-none"
          />
          <p className="text-[10px] text-gray-600 text-right mt-0.5">
            {bio.length}/150
          </p>
        </div>

        {/* Complete Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleComplete}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-700 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Começar a correr
              <ChevronRight size={18} />
            </>
          )}
        </motion.button>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
        >
          Pular por agora
        </button>
      </motion.div>
    </div>
  );
}
