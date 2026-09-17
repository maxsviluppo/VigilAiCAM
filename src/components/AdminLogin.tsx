import React, { useState } from "react";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToApp }) => {
  const [email, setEmail] = useState("castromassimo@gmail.com");
  const [password, setPassword] = useState("1974massimo123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenziali SuperAdmin non valide");
      }

      sessionStorage.setItem("vigilai_admin_token", data.token);
      sessionStorage.setItem("vigilai_admin_user", JSON.stringify(data.user));
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#050810] flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.18),transparent_65%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#0a0f1d]/90 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative z-10"
      >
        {/* Top bar with back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
          >
            <ArrowLeft size={14} />
            Torna all'App
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
            Master Console
          </span>
        </div>

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-3 border border-white/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            VIGIL.<span className="text-blue-400">AI</span> SAAS ADMIN
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Accesso riservato SuperAmministratore
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-red-400 text-xs font-medium"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">
              Email SuperAdmin
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
                placeholder="nome@dominio.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 pl-1">
              Password Master
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-all p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer z-10 flex items-center justify-center"
                title={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider py-3.5 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifica credenziali...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Accedi alla Console SaaS</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Sessione protetta con Master Auth Token • VigilAI v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};
