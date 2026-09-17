import React, { useState, useEffect } from "react";
import {
  Users,
  CreditCard,
  Cpu,
  Settings,
  Activity,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Camera,
  Layers,
  Sparkles,
  Server,
  Wifi,
  Save,
  Check,
  Mail,
  Send,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminConsoleProps {
  onLogout: () => void;
  onBackToApp: () => void;
}

interface Tenant {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt?: string;
  isBlocked: boolean;
  camerasCount: number;
  plan: string;
  priceMonthly: number;
  status: string;
  expiresAt: string;
  maxCameras: number;
  maxRaspberry: number;
  paymentMethod: string;
  companyName?: string;
  vatNumber?: string;
  notes?: string;
}

interface FleetDevice {
  id: string;
  name: string;
  location: string;
  assignedTo: string;
  ip: string;
  hostname: string;
  status: "online" | "offline";
  version: string;
  isPi: boolean;
  temperature: string;
  cpuLoad: string;
  ramUsage: string;
  screenAttached: string;
  lastPing: string;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onLogout, onBackToApp }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "tenants" | "billing" | "fleet" | "config">("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [fleet, setFleet] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked" | "expired">("all");

  // Modal editing tenant
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Stripe & Billing state
  const [plansList, setPlansList] = useState([
    {
      id: "starter",
      name: "Starter HACCP",
      price: 49,
      camerasLimit: 2,
      raspberryLimit: 1,
      support: "Email",
      features: ["Rilevamento DPI & Igiene", "Log HACCP su Cloud", "Alert Email"]
    },
    {
      id: "business",
      name: "Business Pro AI",
      price: 99,
      camerasLimit: 6,
      raspberryLimit: 2,
      support: "Prioritario 24/7",
      features: ["Tutti i moduli AI attivi", "Telegram Bot dedicato", "Sensori Temp Bluetooth", "Backup Automatico"]
    },
    {
      id: "enterprise",
      name: "Enterprise Multi-Store",
      price: 249,
      camerasLimit: 20,
      raspberryLimit: 5,
      support: "Dedicato con SLA",
      features: ["Hardware Raspberry incluso", "Personalizzazione Modelli AI", "Multi-Punto Vendita"]
    }
  ]);

  // Master config state
  const [masterConfig, setMasterConfig] = useState({
    smtpUser: "allarme.vigilai@gmail.com",
    smtpPass: "••••••••••••",
    telegramBotToken: "",
    broadcastMessage: ""
  });
  const [broadcastSent, setBroadcastSent] = useState(false);

  const adminToken = sessionStorage.getItem("vigilai_admin_token") || "vigilai-admin-Max1974-123Max456";

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        headers: { "x-admin-token": adminToken }
      });
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
      }
    } catch (e) {
      console.error("Errore fetch tenants:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/admin/fleet", {
        headers: { "x-admin-token": adminToken }
      });
      const data = await res.json();
      if (data.success) {
        setFleet(data.fleet || []);
      }
    } catch (e) {
      console.error("Errore fetch fleet:", e);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchFleet();
  }, []);

  // Actions on tenants
  const handleToggleBlock = async (tenant: Tenant) => {
    const newBlockedState = !tenant.isBlocked;
    try {
      const res = await fetch(`/api/admin/user/${tenant.id}/toggle-block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken
        },
        body: JSON.stringify({ blocked: newBlockedState })
      });
      const data = await res.json();
      if (data.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, isBlocked: newBlockedState } : t))
        );
      }
    } catch (e) {
      console.error("Errore toggle block:", e);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare definitivamente questo account? L'azione non è reversibile.")) return;
    try {
      const res = await fetch(`/api/admin/user/${tenantId}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken }
      });
      const data = await res.json();
      if (data.success) {
        setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      }
    } catch (e) {
      console.error("Errore delete user:", e);
    }
  };

  const handleSaveTenantPlan = async () => {
    if (!editingTenant) return;
    setSavingPlan(true);
    try {
      const res = await fetch("/api/admin/tenant/update-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken
        },
        body: JSON.stringify({
          userId: editingTenant.id,
          plan: editingTenant.plan,
          priceMonthly: editingTenant.priceMonthly,
          expiresAt: editingTenant.expiresAt,
          maxCameras: editingTenant.maxCameras,
          maxRaspberry: editingTenant.maxRaspberry,
          paymentMethod: editingTenant.paymentMethod,
          companyName: editingTenant.companyName,
          vatNumber: editingTenant.vatNumber,
          notes: editingTenant.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === editingTenant.id ? { ...editingTenant } : t))
        );
        setEditingTenant(null);
      }
    } catch (e) {
      console.error("Errore salvataggio piano:", e);
    } finally {
      setSavingPlan(false);
    }
  };

  // Calculations for overview KPIs
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => !t.isBlocked).length;
  const totalMRR = tenants
    .filter((t) => !t.isBlocked)
    .reduce((acc, t) => acc + (t.priceMonthly || 49), 0);
  const totalCameras = tenants.reduce((acc, t) => acc + (t.camerasCount || 0), 0);
  const onlineDevices = fleet.filter((d) => d.status === "online").length;

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.companyName && t.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === "active") return !t.isBlocked;
    if (filterStatus === "blocked") return t.isBlocked;
    if (filterStatus === "expired") {
      return t.expiresAt && new Date(t.expiresAt) < new Date();
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#080d1a]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/20">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white">
                VIGIL.<span className="text-blue-400">AI</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                SaaS Master Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Amministrazione Piattaforma & Clienti • v2.0
            </p>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTenants}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
            title="Aggiorna dati"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : ""} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>

          <button
            type="button"
            onClick={onBackToApp}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Torna all'App</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="bg-[#090e1f] border-b border-white/5 px-4 sm:px-8 py-2 overflow-x-auto flex gap-1.5 custom-scrollbar">
        {[
          { id: "overview", label: "Panoramica SaaS", icon: <TrendingUp size={15} /> },
          { id: "tenants", label: `Clienti & Account (${totalTenants})`, icon: <Users size={15} /> },
          { id: "billing", label: "Piani & Pagamenti", icon: <CreditCard size={15} /> },
          { id: "fleet", label: `Raspberry Fleet (${fleet.length})`, icon: <Cpu size={15} /> },
          { id: "config", label: "Master Config", icon: <Settings size={15} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[#0a1024] border border-blue-500/20 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Entrate Ricorrenti (MRR)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <DollarSign size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mt-2">€ {totalMRR}</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Da {activeTenants} abbonamenti attivi
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0a1024] border border-green-500/20 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">
                    Clienti / Aziende
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                    <Users size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mt-2">{totalTenants}</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {activeTenants} attivi • {totalTenants - activeTenants} bloccati/in prova
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0a1024] border border-purple-500/20 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Telecamere AI Collegate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Camera size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mt-2">{totalCameras}</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Flussi RTSP monitorati da Gemini
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0a1024] border border-amber-500/20 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Raspberry Pi Fleet
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Cpu size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mt-2">
                  {onlineDevices} / {fleet.length}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Dispositivi edge operativi
                </p>
              </div>
            </div>

            {/* Quick Actions & Platform Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0a0f20] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Activity size={16} className="text-blue-400" />
                    Stato Piattaforma VigilAI
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    Sistemi Operativi
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-white">Supabase Cloud Database & Auth</p>
                        <p className="text-[10px] text-slate-400 font-medium">Tabelle RLS attive e connesse</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-green-400">ONLINE</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-white">Servizio Notifiche Email (SMTP Gmail)</p>
                        <p className="text-[10px] text-slate-400 font-medium">allarme.vigilai@gmail.com configurato</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-green-400">ATTIVO</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-white">Motore Visione Artificiale (Gemini AI)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Analisi fotogrammi e alert real-time</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-400">PRONTO</span>
                  </div>
                </div>
              </div>

              {/* Quick links card */}
              <div className="p-6 rounded-3xl bg-[#0a0f20] border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-white mb-2">
                    Azioni Rapide Admin
                  </h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Gestisci in tempo reale i clienti, crea link di pagamento o visualizza il simulatore touch.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("tenants")}
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white flex items-center justify-between transition-all"
                  >
                    <span>Gestione Clienti</span>
                    <ChevronRight size={16} className="text-slate-500" />
                  </button>

                  <a
                    href="/simulator"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white flex items-center justify-between transition-all"
                  >
                    <span>Apri Simulatore 3.5" (480x320)</span>
                    <ExternalLink size={14} className="text-slate-500" />
                  </a>

                  <a
                    href="/setup-wizard"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-white flex items-center justify-between transition-all"
                  >
                    <span>Setup Wizard Raspberry</span>
                    <ExternalLink size={14} className="text-slate-500" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TENANTS & ACCOUNTS */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a0f20] p-3 sm:p-4 rounded-2xl border border-white/5">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cerca cliente per email o ragione sociale..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(["all", "active", "blocked", "expired"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      filterStatus === status
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white bg-white/5"
                    }`}
                  >
                    {status === "all"
                      ? "Tutti"
                      : status === "active"
                      ? "Attivi"
                      : status === "blocked"
                      ? "Bloccati"
                      : "Scaduti"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-[#0a0f20] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4">Cliente / Email</th>
                      <th className="py-3.5 px-4">Piano</th>
                      <th className="py-3.5 px-4">Stato</th>
                      <th className="py-3.5 px-4">Telecamere</th>
                      <th className="py-3.5 px-4">Scadenza</th>
                      <th className="py-3.5 px-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
                          Nessun cliente trovato con i filtri correnti.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-white text-xs">{tenant.companyName || tenant.email}</p>
                              <p className="text-[11px] text-slate-400">{tenant.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {tenant.plan || "Starter"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {tenant.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                <XCircle size={12} /> Bloccato
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                <CheckCircle2 size={12} /> Attivo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-300">
                            {tenant.camerasCount} / {tenant.maxCameras || 4}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium">
                            {tenant.expiresAt || "31/12/2026"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit plan modal trigger */}
                              <button
                                type="button"
                                onClick={() => setEditingTenant(tenant)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                                title="Modifica Piano & Scadenza"
                              >
                                <Edit3 size={14} />
                              </button>

                              {/* Toggle block/unblock */}
                              <button
                                type="button"
                                onClick={() => handleToggleBlock(tenant)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  tenant.isBlocked
                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                    : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                }`}
                                title={tenant.isBlocked ? "Sblocca utente" : "Blocca utente"}
                              >
                                {tenant.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                title="Elimina definitivamente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BILLING & PLANS */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Configurazione Piani SaaS VigilAI
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Definisci prezzi, limiti di telecamere e funzionalità per ciascun livello di abbonamento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plansList.map((plan) => (
                <div
                  key={plan.id}
                  className="p-6 rounded-3xl bg-[#0a0f20] border border-white/10 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                        {plan.id}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{plan.support}</span>
                    </div>

                    <h4 className="text-xl font-black text-white">{plan.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">€ {plan.price}</span>
                      <span className="text-xs text-slate-400 font-medium">/ mese</span>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Max Telecamere AI:</span>
                        <span className="font-bold text-white">{plan.camerasLimit}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Max Raspberry Box:</span>
                        <span className="font-bold text-white">{plan.raspberryLimit}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <Check size={14} className="text-green-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Link di pagamento Stripe generato per ${plan.name}`)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard size={14} />
                    <span>Crea Link Pagamento</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RASPBERRY FLEET MONITORING */}
        {activeTab === "fleet" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Server size={18} className="text-blue-400" />
                  Monitoraggio Box Fisici Raspberry Pi
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Telemetria in tempo reale dei microcomputer installati presso i clienti.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchFleet}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Aggiorna Ping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fleet.map((device) => (
                <div
                  key={device.id}
                  className="p-6 rounded-3xl bg-[#0a0f20] border border-white/10 space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{device.name}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                          <Radio size={10} className="animate-pulse" /> {device.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{device.location}</p>
                    </div>

                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {device.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">IP Locale</span>
                      <span className="text-xs font-mono font-bold text-white">{device.ip}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">CPU Temp</span>
                      <span className="text-xs font-bold text-amber-400">{device.temperature}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Carico CPU</span>
                      <span className="text-xs font-bold text-white">{device.cpuLoad}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Schermo</span>
                      <span className="text-[11px] font-bold text-white truncate">{device.screenAttached}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
                    <span>RAM: {device.ramUsage}</span>
                    <span className="text-[11px]">Ultimo segnale: {new Date(device.lastPing).toLocaleTimeString("it-IT")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MASTER CONFIG */}
        {activeTab === "config" && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Impostazioni Master del Sistema
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Credenziali globali per invio notifiche e allerta centralizzata.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0a0f20] border border-white/10 space-y-4 shadow-xl">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email SMTP Globale Notifiche
                </label>
                <input
                  type="email"
                  value={masterConfig.smtpUser}
                  onChange={(e) => setMasterConfig({ ...masterConfig, smtpUser: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Token Telegram Master Bot
                </label>
                <input
                  type="text"
                  placeholder="Inserisci token bot per comunicazioni di servizio..."
                  value={masterConfig.telegramBotToken}
                  onChange={(e) => setMasterConfig({ ...masterConfig, telegramBotToken: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert("Impostazioni salvate nel file .env")}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>Salva Configurazioni Master</span>
                </button>
              </div>
            </div>

            {/* Broadcast announcement */}
            <div className="p-6 rounded-3xl bg-[#0a0f20] border border-white/10 space-y-4 shadow-xl">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Send size={15} className="text-blue-400" />
                Invia Comunicazione a Tutti i Clienti
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                Invia una notifica popup o email contemporaneamente a tutti gli account attivi (es. manutenzione programmata, nuovo aggiornamento OTA).
              </p>

              <textarea
                rows={3}
                placeholder="Scrivi il messaggio da inviare..."
                value={masterConfig.broadcastMessage}
                onChange={(e) => setMasterConfig({ ...masterConfig, broadcastMessage: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />

              <button
                type="button"
                onClick={() => {
                  setBroadcastSent(true);
                  setTimeout(() => setBroadcastSent(false), 3000);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
              >
                {broadcastSent ? <Check size={14} /> : <Send size={14} />}
                <span>{broadcastSent ? "Messaggio Inviato!" : "Invia Annuncio"}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDIT TENANT PLAN */}
      <AnimatePresence>
        {editingTenant && (
          <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1022] border border-white/15 rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h4 className="text-base font-black text-white">Modifica Piano & Scadenza</h4>
                  <p className="text-xs text-slate-400">{editingTenant.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Piano Assegnato
                  </label>
                  <select
                    value={editingTenant.plan}
                    onChange={(e) => setEditingTenant({ ...editingTenant, plan: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="Starter" className="bg-[#0b1022]">Starter (€49/mese - 2 Cam)</option>
                    <option value="Business" className="bg-[#0b1022]">Business Pro (€99/mese - 6 Cam)</option>
                    <option value="Enterprise" className="bg-[#0b1022]">Enterprise (€249/mese - 20 Cam)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Prezzo Mensile (€)
                    </label>
                    <input
                      type="number"
                      value={editingTenant.priceMonthly}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, priceMonthly: Number(e.target.value) })
                      }
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Data Scadenza Licenza
                    </label>
                    <input
                      type="date"
                      value={editingTenant.expiresAt}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, expiresAt: e.target.value })
                      }
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Max Telecamere
                    </label>
                    <input
                      type="number"
                      value={editingTenant.maxCameras}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, maxCameras: Number(e.target.value) })
                      }
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Metodo Pagamento
                    </label>
                    <select
                      value={editingTenant.paymentMethod}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, paymentMethod: e.target.value })
                      }
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      <option value="Bonifico / Manuale" className="bg-[#0b1022]">Bonifico / Manuale</option>
                      <option value="Stripe Carta di Credito" className="bg-[#0b1022]">Stripe Carta</option>
                      <option value="Contanti / Annuale" className="bg-[#0b1022]">Contanti / Annuale</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Nome Attività / Ragione Sociale
                  </label>
                  <input
                    type="text"
                    value={editingTenant.companyName || ""}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, companyName: e.target.value })
                    }
                    placeholder="es. Ristorante Pizzeria Belvedere"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={handleSaveTenantPlan}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/30 flex items-center gap-1.5"
                >
                  {savingPlan ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Salva Modifiche</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
