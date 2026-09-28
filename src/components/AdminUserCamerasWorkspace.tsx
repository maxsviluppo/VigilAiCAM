import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import {
  ArrowLeft,
  Bell,
  Check,
  Cpu,
  Layers,
  Loader2,
  Monitor,
  Power,
  RefreshCw,
  Save,
  Timer,
  Video,
  Wifi,
  X,
  Mail,
  Plus,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Building,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Sliders,
  CheckCircle2,
  Settings2,
  Sparkles
} from "lucide-react";
import type { Camera, TriggerSchedule, ZoneType } from "../types";
import { DEFAULT_TRIGGERS } from "../constants/defaultTriggers";
import { getTriggerScheduleBadgeText } from "../utils/cameraNetwork";

export interface AdminManagedUser {
  id: string;
  email: string;
  companyName?: string;
  plan?: string;
  isBlocked?: boolean;
  camerasCount?: number;
  maxCameras?: number;
  expiresAt?: string;
  createdAt?: string;
}

export interface AdminUserEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  description: string;
  threatLevel: "high" | "medium" | "low";
  screenshot: string | null;
  createdAt: string;
}

interface AdminUserCamerasWorkspaceProps {
  user: AdminManagedUser;
  adminToken: string;
  onBack: () => void;
}

interface ScheduleModalState {
  cameraId: string;
  cameraName: string;
  triggerId?: string;
  triggerLabel?: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  applyToAll: boolean;
}

interface LiveCameraStatus {
  online: boolean;
  checking: boolean;
  responseTimeMs?: number;
  message?: string;
}

const SCHEDULE_PRESETS: { id: string; label: string; schedule: TriggerSchedule }[] = [
  { id: "allDay", label: "24h (Sempre Attivo)", schedule: { allDay: true } },
  {
    id: "mattina",
    label: "Mattina (08:00 - 14:00)",
    schedule: { allDay: false, presetName: "mattina", startTime: "08:00", endTime: "14:00" },
  },
  {
    id: "pomeriggio",
    label: "Pomeriggio (14:00 - 20:00)",
    schedule: { allDay: false, presetName: "pomeriggio", startTime: "14:00", endTime: "20:00" },
  },
  {
    id: "notte",
    label: "Notte (22:00 - 06:00)",
    schedule: { allDay: false, presetName: "notte", startTime: "22:00", endTime: "06:00" },
  },
];

function cloneCameras(list: Camera[]): Camera[] {
  return list.map((c) => ({
    ...c,
    enabledTriggers: [...(c.enabledTriggers || [])],
    triggerSchedules: { ...(c.triggerSchedules || {}) },
    zones: (c.zones || []).map((z) => ({ ...z, points: [...(z.points || [])] })),
  }));
}

async function persistCamera(
  userId: string,
  camera: Camera,
  adminToken: string
): Promise<Camera> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-admin-token": adminToken,
  };
  const body = JSON.stringify({ camera });
  let res = await fetch(`/api/admin/user/${userId}/cameras/${camera.id}`, {
    method: "PUT",
    headers,
    body,
  });
  if (res.status === 404) {
    res = await fetch(`/api/admin/user/${userId}/cameras`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ cameraId: camera.id, camera }),
    });
  }
  const data = await res.json().catch(() => null);
  if (!data?.success) throw new Error(data?.error || `Errore salvataggio (${res.status})`);
  return data.camera as Camera;
}

export const AdminUserCamerasWorkspace: React.FC<AdminUserCamerasWorkspaceProps> = ({
  user,
  adminToken,
  onBack,
}) => {
  // ─── Telecamere State ───
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [savingCamId, setSavingCamId] = useState<string | null>(null);
  const [savedCamId, setSavedCamId] = useState<string | null>(null);
  const [showNetworkDetails, setShowNetworkDetails] = useState<Record<string, boolean>>({});

  // ─── Live Camera Status Check ───
  const [liveCamStatus, setLiveCamStatus] = useState<Record<string, LiveCameraStatus>>({});

  // ─── Overview & Allarmi State ───
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [savingEmails, setSavingEmails] = useState(false);
  const [savedEmailsSuccess, setSavedEmailsSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [recentEvents, setRecentEvents] = useState<AdminUserEvent[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // ─── Modali ───
  const [previewScreenshot, setPreviewScreenshot] = useState<AdminUserEvent | null>(null);
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState | null>(null);

  const companyName = user.companyName || user.email.split("@")[0].toUpperCase();

  // ─── Live Check Connettività Telecamera ───
  const checkCamLive = useCallback(async (cam: Camera) => {
    setLiveCamStatus((prev) => ({
      ...prev,
      [cam.id]: { online: prev[cam.id]?.online ?? (cam.status === "online"), checking: true },
    }));

    try {
      const res = await fetch("/api/cameras/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: cam.ip,
          port: cam.port,
          url: cam.url,
          rtspPath: cam.rtspPath,
          type: cam.type,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setLiveCamStatus((prev) => ({
          ...prev,
          [cam.id]: {
            online: !!data.online,
            checking: false,
            responseTimeMs: data.responseTimeMs,
            message: data.message || data.error,
          },
        }));
        // Allinea lo stato locale della camera
        if (data.online && cam.status !== "online") {
          updateCam(cam.id, { status: "online" });
        } else if (!data.online && cam.status !== "offline") {
          updateCam(cam.id, { status: "offline" });
        }
      } else {
        setLiveCamStatus((prev) => ({
          ...prev,
          [cam.id]: { online: false, checking: false, message: data?.error || "Non raggiungibile" },
        }));
      }
    } catch (e: any) {
      setLiveCamStatus((prev) => ({
        ...prev,
        [cam.id]: { online: false, checking: false, message: e.message },
      }));
    }
  }, []);

  // ─── Caricamento Dati Overview (Email + Ultimi 5 Eventi) ───
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`/api/admin/user/${user.id}/overview`, {
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        if (Array.isArray(data.user?.notificationEmails)) {
          setNotificationEmails(data.user.notificationEmails);
        } else if (user.email) {
          setNotificationEmails([user.email]);
        }
        if (Array.isArray(data.events)) {
          setRecentEvents(data.events);
        }
      }
    } catch (e: any) {
      console.warn("Impossibile caricare overview utente:", e.message);
    } finally {
      setLoadingOverview(false);
    }
  }, [adminToken, user.id, user.email]);

  // ─── Caricamento Telecamere ───
  const loadCameras = useCallback(async () => {
    setLoadingCameras(true);
    setCameraError("");
    try {
      const res = await fetch(`/api/admin/user/${user.id}/cameras`, {
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) throw new Error(data?.error || "Impossibile caricare le telecamere");
      const list = cloneCameras(data.cameras || []);
      setCameras(list);
      // Esegui live check per ciascuna telecamera
      list.forEach((c) => checkCamLive(c));
    } catch (e: any) {
      setCameraError(e.message || "Errore di rete");
      setCameras([]);
    } finally {
      setLoadingCameras(false);
    }
  }, [adminToken, user.id, checkCamLive]);

  useEffect(() => {
    loadOverview();
    loadCameras();
  }, [loadOverview, loadCameras]);

  // ─── Modifica Veloce Camera ───
  const updateCam = (cameraId: string, patch: Partial<Camera>) => {
    setCameras((prev) => prev.map((c) => (c.id === cameraId ? { ...c, ...patch } : c)));
  };

  const handleSaveCamera = async (cam: Camera) => {
    setSavingCamId(cam.id);
    setSavedCamId(null);
    try {
      // Se il live test è attivo, assicura che il campo status corrisponda
      const isLiveOnline = liveCamStatus[cam.id]?.online;
      const camToSave: Camera = {
        ...cam,
        status: isLiveOnline ? "online" : (cam.status || "offline"),
      };
      const saved = await persistCamera(user.id, camToSave, adminToken);
      setCameras((prev) => prev.map((c) => (c.id === cam.id ? saved : c)));
      setSavedCamId(cam.id);
      setTimeout(() => setSavedCamId((id) => (id === cam.id ? null : id)), 3000);
    } catch (e: any) {
      setCameraError(e.message || "Salvataggio fallito");
    } finally {
      setSavingCamId(null);
    }
  };

  // ─── Gestione Modale Orario Personalizzato ───
  const openScheduleModal = (cam: Camera, trigger?: { id: string; label: string }) => {
    const currentSched = trigger ? cam.triggerSchedules?.[trigger.id] : undefined;
    setScheduleModal({
      cameraId: cam.id,
      cameraName: cam.name || "Camera",
      triggerId: trigger?.id,
      triggerLabel: trigger?.label,
      allDay: currentSched ? !!currentSched.allDay : false,
      startTime: currentSched?.startTime || "08:00",
      endTime: currentSched?.endTime || "18:00",
      applyToAll: !trigger,
    });
  };

  const handleApplyScheduleModal = () => {
    if (!scheduleModal) return;
    const { cameraId, triggerId, allDay, startTime, endTime, applyToAll } = scheduleModal;

    let newSchedule: TriggerSchedule;
    if (allDay) {
      newSchedule = { allDay: true };
    } else {
      const matchPreset = SCHEDULE_PRESETS.find(
        (p) => !p.schedule.allDay && p.schedule.startTime === startTime && p.schedule.endTime === endTime
      );
      newSchedule = {
        allDay: false,
        startTime: startTime || "08:00",
        endTime: endTime || "18:00",
        presetName: matchPreset ? (matchPreset.schedule.presetName as any) : undefined,
      };
    }

    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== cameraId) return c;
        const schedules = { ...(c.triggerSchedules || {}) };
        if (applyToAll || !triggerId) {
          (c.enabledTriggers || []).forEach((tId) => {
            schedules[tId] = { ...newSchedule };
          });
        } else {
          schedules[triggerId] = { ...newSchedule };
        }
        return { ...c, triggerSchedules: schedules };
      })
    );

    setScheduleModal(null);
  };

  // ─── Gestione Email Notifica Allarmi ───
  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;
    if (!clean.includes("@") || !clean.includes(".")) {
      setEmailError("Inserisci un indirizzo email valido.");
      return;
    }
    if (notificationEmails.includes(clean)) {
      setEmailError("Email già presente nell'elenco.");
      return;
    }
    setNotificationEmails([...notificationEmails, clean]);
    setNewEmailInput("");
    setEmailError("");
  };

  const handleRemoveEmail = (target: string) => {
    setNotificationEmails(notificationEmails.filter((m) => m !== target));
  };

  const handleSaveEmails = async () => {
    setSavingEmails(true);
    setEmailError("");
    setSavedEmailsSuccess(false);
    try {
      const res = await fetch(`/api/admin/user/${user.id}/notification-emails`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ emails: notificationEmails }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) {
        throw new Error(data?.error || "Errore durante il salvataggio delle email");
      }
      setNotificationEmails(data.notificationEmails || notificationEmails);
      setSavedEmailsSuccess(true);
      setTimeout(() => setSavedEmailsSuccess(false), 3000);
    } catch (err: any) {
      setEmailError(err.message || "Errore di connessione");
    } finally {
      setSavingEmails(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050810] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ─── HEADER SCHEDA UTENTE ─── */}
      <header className="shrink-0 border-b border-white/10 bg-[#080d1a]/95 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Torna all'elenco clienti"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Elenco Utenti</span>
          </button>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Building size={18} className="text-blue-400" />
                {companyName}
              </span>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Piano {user.plan || "Starter"}
              </span>

              {user.isBlocked ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Bloccato
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Account Attivo
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                <Mail size={12} className="text-slate-500" />
                {user.email}
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400">
                Telecamere: <b className="text-white">{cameras.length}</b>/{user.maxCameras || 4}
              </span>
              {user.expiresAt && (
                <>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-[11px] text-slate-400">
                    Scadenza: <b className="text-slate-300">{user.expiresAt}</b>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadOverview();
              loadCameras();
            }}
            disabled={loadingCameras || loadingOverview}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2 text-slate-300 hover:text-white transition-all"
            title="Aggiorna tutti i dati"
          >
            <RefreshCw size={14} className={loadingCameras || loadingOverview ? "animate-spin text-blue-400" : ""} />
            <span className="hidden sm:inline">Aggiorna Scheda</span>
          </button>
        </div>
      </header>

      {/* ─── CORPO PRINCIPALE ─── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto space-y-8">
        {/* Notifica errori globali */}
        {cameraError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start justify-between gap-3">
            <span>{cameraError}</span>
            <button type="button" onClick={() => setCameraError("")} className="text-red-300 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════
            SEZIONE 1 (IN ALTO): TELECAMERE CONFIGURATE & TRIGGER AI
            ═══════════════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Video size={20} className="text-blue-400" />
                Telecamere Configurate nel Profilo ({cameras.length})
              </h2>
              <p className="text-xs text-slate-400">
                Rilevamento stato live connessione, trigger AI, fasce orarie e frequenza di scansione.
              </p>
            </div>
          </div>

          {loadingCameras && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Caricamento telecamere profilo...
              </p>
            </div>
          )}

          {!loadingCameras && cameras.length === 0 && (
            <div className="text-center py-20 rounded-3xl border border-white/5 bg-[#0a0f20]/50 p-8">
              <Video size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Nessuna telecamera presente in questo profilo</p>
              <p className="text-xs text-slate-500 mt-1">
                L&apos;utente può aggiungere nuove telecamere dalla propria dashboard o wizard di installazione.
              </p>
            </div>
          )}

          {!loadingCameras && cameras.length > 0 && (
            <div className="space-y-6">
              {cameras.map((cam, index) => {
                const isSaving = savingCamId === cam.id;
                const isSaved = savedCamId === cam.id;
                const showNet = !!showNetworkDetails[cam.id];
                const activeTriggersCount = (cam.enabledTriggers || []).length;
                const liveInfo = liveCamStatus[cam.id];

                return (
                  <motion.article
                    key={cam.id}
                    layout
                    className="rounded-3xl border border-white/10 bg-[#0a0f20] shadow-2xl overflow-hidden transition-all"
                  >
                    {/* TOP BAR DELLA TELECAMERA */}
                    <div className="p-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-black text-blue-400 shrink-0">
                          CAM {index + 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={cam.name || ""}
                              onChange={(e) => updateCam(cam.id, { name: e.target.value })}
                              placeholder="Nome Telecamera (es. Sala, Ingresso)"
                              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 text-sm font-black text-white focus:outline-none focus:border-blue-500 max-w-[220px]"
                            />

                            <input
                              type="text"
                              value={cam.location || ""}
                              onChange={(e) => updateCam(cam.id, { location: e.target.value })}
                              placeholder="Posizione (es. Cucina)"
                              className="bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500 max-w-[160px]"
                            />

                            {/* BADGE STATO LIVE CONNETIVITÀ */}
                            <div className="flex items-center gap-1.5">
                              {liveInfo?.checking ? (
                                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin text-blue-400" />
                                  Verifica Connessione...
                                </span>
                              ) : liveInfo?.online ? (
                                <span
                                  className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                  title={liveInfo.message || "Telecamera online e connessa"}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Online {liveInfo.responseTimeMs !== undefined ? `(${liveInfo.responseTimeMs}ms)` : ""}
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"
                                  title={liveInfo?.message || "Telecamera non raggiungibile sulla rete"}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  Non Raggiungibile
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => checkCamLive(cam)}
                                disabled={liveInfo?.checking}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                title="Ricontrolla connettività live della telecamera"
                              >
                                <RefreshCw size={11} className={liveInfo?.checking ? "animate-spin text-blue-400" : ""} />
                              </button>
                            </div>

                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                              {cam.type || "onvif"}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 font-mono">
                            {cam.ip ? `IP: ${cam.ip}` : ""} {cam.port ? `:${cam.port}` : ""}{" "}
                            {cam.rtspPath ? `(${cam.rtspPath})` : ""}
                          </p>
                        </div>
                      </div>

                      {/* FAST FREQUENCY STEPPER, ORARIO GLOBALE CAM & QUICK SAVE */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Frequenza Analisi */}
                        <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                            <Timer size={12} className="text-blue-400" /> Analisi AI:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCam(cam.id, {
                                analysisInterval: Math.max(2, (cam.analysisInterval ?? 5) - 1),
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center text-xs"
                          >
                            −
                          </button>
                          <span className="text-xs font-mono font-black text-blue-400 w-8 text-center">
                            {cam.analysisInterval ?? 5}s
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCam(cam.id, {
                                analysisInterval: Math.min(60, (cam.analysisInterval ?? 5) + 1),
                              })
                            }
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Modale Orari Fascia per tutta la telecamera */}
                        <button
                          type="button"
                          onClick={() => openScheduleModal(cam)}
                          className="px-3 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-all shadow-sm"
                          title="Apri modale per impostare orario a tutti i trigger"
                        >
                          <Clock size={13} className="text-amber-400" />
                          <span>Orari Cam</span>
                        </button>

                        {/* Salva Camera */}
                        <button
                          type="button"
                          onClick={() => handleSaveCamera(cam)}
                          disabled={isSaving}
                          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
                            isSaved
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30"
                          } disabled:opacity-50`}
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isSaved ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                          <span>{isSaved ? "Salvato!" : "Salva Camera"}</span>
                        </button>
                      </div>
                    </div>

                    {/* TRIGGER GRID CON ICONE, FASCE ORARIE E MODALE ORARIO */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <Bell size={14} className="text-amber-400" />
                          <span>Trigger Rilevamento Attivi ({activeTriggersCount} / {DEFAULT_TRIGGERS.length})</span>
                          <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
                            — Clicca per attivare/disattivare, seleziona la fascia o personalizza l&apos;orario
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setShowNetworkDetails((prev) => ({ ...prev, [cam.id]: !showNet }))
                          }
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Wifi size={12} />
                          <span>{showNet ? "Nascondi Rete RTSP" : "Dettagli Rete RTSP"}</span>
                          {showNet ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {/* GRID DEI TRIGGER */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                        {DEFAULT_TRIGGERS.map((trigger) => {
                          const isActive = (cam.enabledTriggers || []).includes(trigger.id);
                          const sched = cam.triggerSchedules?.[trigger.id];
                          const LucideIcon = (Lucide as any)[trigger.icon_name] || Lucide.AlertTriangle;

                          // Determina valore selettore
                          const isCustomTime =
                            !sched?.allDay &&
                            sched?.startTime &&
                            sched?.endTime &&
                            !(
                              (sched.startTime === "08:00" && sched.endTime === "14:00") ||
                              (sched.startTime === "14:00" && sched.endTime === "20:00") ||
                              (sched.startTime === "22:00" && sched.endTime === "06:00")
                            );

                          const currentSelectValue = sched?.allDay
                            ? "allDay"
                            : isCustomTime
                            ? "custom"
                            : sched?.presetName ||
                              (sched?.startTime === "08:00" && sched?.endTime === "14:00"
                                ? "mattina"
                                : sched?.startTime === "14:00" && sched?.endTime === "20:00"
                                ? "pomeriggio"
                                : sched?.startTime === "22:00" && sched?.endTime === "06:00"
                                ? "notte"
                                : "allDay");

                          const scheduleBadge = isActive ? getTriggerScheduleBadgeText(sched) : null;

                          return (
                            <div
                              key={trigger.id}
                              className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                                isActive
                                  ? "bg-blue-600/[0.12] border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                  : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
                              }`}
                            >
                              {/* Trigger Header / Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isActive) {
                                    updateCam(cam.id, {
                                      enabledTriggers: (cam.enabledTriggers || []).filter((t) => t !== trigger.id),
                                    });
                                  } else {
                                    const existing = cam.triggerSchedules?.[trigger.id] || { allDay: true };
                                    updateCam(cam.id, {
                                      enabledTriggers: [...(cam.enabledTriggers || []), trigger.id],
                                      triggerSchedules: {
                                        ...(cam.triggerSchedules || {}),
                                        [trigger.id]: existing,
                                      },
                                    });
                                  }
                                }}
                                className="w-full flex flex-col items-center gap-1.5 text-center group cursor-pointer"
                                title={`${trigger.label}: ${trigger.description}`}
                              >
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                                    isActive
                                      ? "bg-blue-600/30 text-blue-300 border border-blue-400/40 shadow-sm"
                                      : "bg-white/5 text-slate-500 border border-white/5 group-hover:text-slate-300"
                                  }`}
                                >
                                  <LucideIcon size={20} className={isActive ? trigger.color_class : ""} />
                                </div>
                                <span className="text-[10px] font-black uppercase text-white truncate max-w-full">
                                  {trigger.label}
                                </span>
                              </button>

                              {/* Status Tag & Badge Orario */}
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                    isActive
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-white/5 text-slate-500"
                                  }`}
                                >
                                  {isActive ? "● ATTIVO" : "DISATTIVO"}
                                </span>
                                {scheduleBadge && (
                                  <span className="text-[7.5px] font-bold text-amber-300/90 font-mono">
                                    {scheduleBadge}
                                  </span>
                                )}
                              </div>

                              {/* Fascia Oraria Dropdown + Pulsante Modale Orario */}
                              {isActive ? (
                                <div className="flex items-center gap-1">
                                  <select
                                    className="flex-1 min-w-0 text-[8.5px] bg-black/60 border border-white/10 rounded-lg py-1 px-1 text-slate-200 focus:outline-none focus:border-blue-400 font-medium"
                                    value={currentSelectValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "__open_modal__") {
                                        openScheduleModal(cam, trigger);
                                        return;
                                      }
                                      const preset = SCHEDULE_PRESETS.find((p) => p.id === val);
                                      if (!preset) return;
                                      updateCam(cam.id, {
                                        triggerSchedules: {
                                          ...(cam.triggerSchedules || {}),
                                          [trigger.id]: { ...preset.schedule },
                                        },
                                      });
                                    }}
                                  >
                                    {SCHEDULE_PRESETS.map((p) => (
                                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                        {p.id === "allDay" ? "24h Sempre" : p.label.split(" ")[0]}
                                      </option>
                                    ))}
                                    {isCustomTime && (
                                      <option value="custom" className="bg-slate-900 text-amber-400">
                                        {sched?.startTime}-{sched?.endTime}
                                      </option>
                                    )}
                                    <option value="__open_modal__" className="bg-slate-900 text-blue-400 font-bold">
                                      ⚙️ Orario...
                                    </option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => openScheduleModal(cam, trigger)}
                                    className="p-1 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 text-slate-400 hover:text-amber-300 transition-colors shrink-0"
                                    title="Personalizza orario in modale"
                                  >
                                    <Clock size={11} />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-6 flex items-center justify-center">
                                  <span className="text-[8px] text-slate-600">—</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* DETTAGLI RETE RTSP (COLLAPSIBLE) */}
                      <AnimatePresence>
                        {showNet && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-4 border-t border-white/5 overflow-hidden"
                          >
                            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
                              <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                                <Wifi size={13} className="text-blue-400" /> Parametri di Connessione Stream RTSP
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">IP Telecamera</label>
                                  <input
                                    type="text"
                                    value={cam.ip || ""}
                                    onChange={(e) => updateCam(cam.id, { ip: e.target.value })}
                                    placeholder="192.168.1.50"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Porta RTSP</label>
                                  <input
                                    type="number"
                                    value={cam.port ?? 554}
                                    onChange={(e) => updateCam(cam.id, { port: Number(e.target.value) || 554 })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">RTSP Path</label>
                                  <input
                                    type="text"
                                    value={cam.rtspPath || "/stream1"}
                                    onChange={(e) => updateCam(cam.id, { rtspPath: e.target.value })}
                                    placeholder="/stream1"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Username</label>
                                  <input
                                    type="text"
                                    value={cam.username || ""}
                                    onChange={(e) => updateCam(cam.id, { username: e.target.value })}
                                    placeholder="admin"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════════
            SEZIONE 2 (SOTTO LE TELECAMERE): EMAIL ALLARMI & CRONOLOGIA ULTIMI 5 EVENTI
            ═══════════════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-white/10">
          {/* CARD A: Email Ricezione Allarmi (5 colonne su desktop) */}
          <div className="lg:col-span-5 bg-[#0a0f20] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Email Allarmi AI</h3>
                  <p className="text-[10px] text-slate-400">Destinatari degli avvisi critici con screenshot</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-mono">
                {notificationEmails.length} email
              </span>
            </div>

            {/* List of current emails */}
            <div className="space-y-2 mb-4 flex-1">
              {notificationEmails.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  Nessuna email impostata. Gli allarmi non verranno inviati via email.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {notificationEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-200"
                    >
                      <Mail size={12} className="text-blue-400 shrink-0" />
                      <span className="truncate max-w-[220px]">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-slate-500 hover:text-red-400 ml-1 p-0.5 rounded transition-colors"
                        title="Rimuovi email"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add email form */}
            <form onSubmit={handleAddEmail} className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => {
                      setNewEmailInput(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="aggiungi.email@azienda.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} />
                  <span>Aggiungi</span>
                </button>
              </div>

              {emailError && <p className="text-[11px] text-red-400">{emailError}</p>}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">
                  Modifica e salva per aggiornare il profilo cliente
                </span>
                <button
                  type="button"
                  onClick={handleSaveEmails}
                  disabled={savingEmails}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {savingEmails ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : savedEmailsSuccess ? (
                    <Check size={13} className="text-emerald-300" />
                  ) : (
                    <Save size={13} />
                  )}
                  <span>{savedEmailsSuccess ? "Salvato!" : "Salva Email"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD B: Cronologia Ultimi 5 Eventi (7 colonne su desktop) */}
          <div className="lg:col-span-7 bg-[#0a0f20] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Cronologia Ultimi 5 Eventi
                  </h3>
                  <p className="text-[10px] text-slate-400">Rilevamenti e allarmi recenti registrati dall&apos;AI</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                Sicurezza Attiva
              </span>
            </div>

            {loadingOverview ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-xs">Caricamento eventi...</span>
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nessun allarme o evento registrato di recente per questo account.
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
                {recentEvents.map((evt) => {
                  const dateStr = evt.createdAt
                    ? new Date(evt.createdAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Data non disp.";

                  const isHigh = evt.threatLevel === "high";
                  const isMedium = evt.threatLevel === "medium";

                  return (
                    <div
                      key={evt.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              isHigh
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : isMedium
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {isHigh ? "Pericolo Alto" : isMedium ? "Attenzione" : "Info"}
                          </span>

                          <span className="text-[11px] font-bold text-white bg-white/5 px-2 py-0.5 rounded-md">
                            [{evt.cameraName}]
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock size={10} />
                            {dateStr}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>

                      {evt.screenshot && (
                        <button
                          type="button"
                          onClick={() => setPreviewScreenshot(evt)}
                          className="shrink-0 w-14 h-14 rounded-xl border border-white/10 overflow-hidden relative group cursor-pointer shadow-md bg-black"
                          title="Clicca per ingrandire lo screenshot dell'evento"
                        >
                          <img
                            src={evt.screenshot}
                            alt="Screenshot Allarme"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent flex items-center justify-center transition-colors">
                            <Eye size={14} className="text-white group-hover:scale-125 transition-transform" />
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── MODALE ORARIO & FASCIA DI ATTIVAZIONE ─── */}
      <AnimatePresence>
        {scheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#0a0f20] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5"
            >
              {/* Header Modale */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Fascia Oraria di Attivazione
                    </h3>
                    <p className="text-xs text-slate-400">
                      [{scheduleModal.cameraName}] {scheduleModal.triggerLabel ? `• Trigger: ${scheduleModal.triggerLabel}` : "• Tutti i trigger"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setScheduleModal(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Bottoni Preset Rapidi */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Preimpostazioni Veloci
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SCHEDULE_PRESETS.map((preset) => {
                    const isSelected = preset.schedule.allDay
                      ? scheduleModal.allDay
                      : !scheduleModal.allDay &&
                        scheduleModal.startTime === preset.schedule.startTime &&
                        scheduleModal.endTime === preset.schedule.endTime;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setScheduleModal({
                            ...scheduleModal,
                            allDay: !!preset.schedule.allDay,
                            startTime: preset.schedule.startTime || "08:00",
                            endTime: preset.schedule.endTime || "18:00",
                          });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSelected
                            ? "bg-blue-600 border-blue-400 text-white shadow-md"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {preset.label.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opzione 24 Ore vs Orario Personalizzato */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors">
                  <input
                    type="checkbox"
                    checked={scheduleModal.allDay}
                    onChange={(e) =>
                      setScheduleModal({ ...scheduleModal, allDay: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-black/40 border-white/20"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Attivo 24 ore su 24 (Sempre attivo)</p>
                    <p className="text-[10px] text-slate-400">L&apos;allarme e il monitoraggio saranno sempre operativi giorno e notte.</p>
                  </div>
                </label>

                {!scheduleModal.allDay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Ora Inizio
                        </label>
                        <input
                          type="time"
                          value={scheduleModal.startTime}
                          onChange={(e) =>
                            setScheduleModal({ ...scheduleModal, startTime: e.target.value })
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Ora Fine
                        </label>
                        <input
                          type="time"
                          value={scheduleModal.endTime}
                          onChange={(e) =>
                            setScheduleModal({ ...scheduleModal, endTime: e.target.value })
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    {/* Banner Riepilogo */}
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <Clock size={15} className="shrink-0 text-amber-400" />
                      <span>
                        Attivo dalle <b>{scheduleModal.startTime}</b> alle <b>{scheduleModal.endTime}</b>
                        {scheduleModal.startTime > scheduleModal.endTime && " (Fascia a cavallo di mezzanotte)"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Checkbox Applica a tutti i trigger */}
              <div className="pt-2 border-t border-white/5">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleModal.applyToAll}
                    onChange={(e) =>
                      setScheduleModal({ ...scheduleModal, applyToAll: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-black/40 border-white/20"
                  />
                  <span>Applica questo orario a tutti i trigger abilitati di questa telecamera</span>
                </label>
              </div>

              {/* Bottoni Azione */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setScheduleModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={handleApplyScheduleModal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Check size={14} />
                  <span>Applica Orario</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL PREVIEW SCREENSHOT EVENTO ─── */}
      <AnimatePresence>
        {previewScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-3xl w-full bg-[#0a0f20] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-400" />
                    Screenshot Allarme AI — [{previewScreenshot.cameraName}]
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewScreenshot.createdAt
                      ? new Date(previewScreenshot.createdAt).toLocaleString("it-IT")
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshot(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-black flex items-center justify-center">
                <img
                  src={previewScreenshot.screenshot || ""}
                  alt="Screenshot evento"
                  className="max-h-[60vh] object-contain rounded-xl border border-white/5"
                />
              </div>

              <div className="p-4 bg-[#080d1a] border-t border-white/5">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {previewScreenshot.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
