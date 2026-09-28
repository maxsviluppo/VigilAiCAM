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
} from "lucide-react";
import type { Camera, TriggerSchedule, ZoneType } from "../types";
import { DEFAULT_TRIGGERS } from "../constants/defaultTriggers";
import { getTriggerScheduleBadgeText } from "../utils/cameraNetwork";

export interface AdminManagedUser {
  id: string;
  email: string;
  companyName?: string;
}

type CameraSection = "info" | "network" | "frequency" | "triggers" | "zones" | "status";

interface AdminUserCamerasWorkspaceProps {
  user: AdminManagedUser;
  adminToken: string;
  onBack: () => void;
}

const SCHEDULE_PRESETS: { id: string; label: string; schedule: TriggerSchedule }[] = [
  { id: "allDay", label: "24h", schedule: { allDay: true } },
  {
    id: "mattina",
    label: "Mattina",
    schedule: { allDay: false, presetName: "mattina", startTime: "08:00", endTime: "14:00" },
  },
  {
    id: "pomeriggio",
    label: "Pomeriggio",
    schedule: { allDay: false, presetName: "pomeriggio", startTime: "14:00", endTime: "20:00" },
  },
  {
    id: "notte",
    label: "Notte",
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
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<Record<string, CameraSection | null>>({});

  const displayName = user.companyName || user.email;

  const loadCameras = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/user/${user.id}/cameras`, {
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) throw new Error(data?.error || "Impossibile caricare le telecamere");
      setCameras(cloneCameras(data.cameras || []));
    } catch (e: any) {
      setError(e.message || "Errore di rete");
      setCameras([]);
    } finally {
      setLoading(false);
    }
  }, [adminToken, user.id]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const updateCam = (cameraId: string, patch: Partial<Camera>) => {
    setCameras((prev) => prev.map((c) => (c.id === cameraId ? { ...c, ...patch } : c)));
  };

  const toggleSection = (cameraId: string, section: CameraSection) => {
    setOpenSection((prev) => ({
      ...prev,
      [cameraId]: prev[cameraId] === section ? null : section,
    }));
  };

  const handleSave = async (cam: Camera) => {
    setSavingId(cam.id);
    setSavedId(null);
    try {
      const saved = await persistCamera(user.id, cam, adminToken);
      setCameras((prev) => prev.map((c) => (c.id === cam.id ? saved : c)));
      setSavedId(cam.id);
      setTimeout(() => setSavedId((id) => (id === cam.id ? null : id)), 2500);
    } catch (e: any) {
      setError(e.message || "Salvataggio fallito");
    } finally {
      setSavingId(null);
    }
  };

  const sectionButtons = useMemo(
    () =>
      [
        { id: "info" as const, label: "Info", icon: Monitor },
        { id: "network" as const, label: "Rete", icon: Wifi },
        { id: "frequency" as const, label: "Frequenza", icon: Timer },
        { id: "triggers" as const, label: "Trigger", icon: Cpu },
        { id: "zones" as const, label: "Zone", icon: Layers },
        { id: "status" as const, label: "Stato", icon: Power },
      ] as const,
    []
  );

  return (
    <div className="fixed inset-0 z-[300] bg-[#050810] text-slate-100 flex flex-col font-sans">
      <header className="shrink-0 border-b border-white/10 bg-[#080d1a]/95 backdrop-blur-xl px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
            title="Torna all'elenco utenti"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Video size={20} className="text-blue-400 shrink-0" />
              <h1 className="text-lg sm:text-xl font-black text-white truncate">Scheda telecamere</h1>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{displayName}</p>
            <p className="text-[10px] font-mono text-slate-600 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCameras}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Aggiorna
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 max-w-[1600px] w-full mx-auto">
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-red-300 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Caricamento telecamere...</p>
          </div>
        )}

        {!loading && cameras.length === 0 && (
          <div className="text-center py-24 opacity-60">
            <Video size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Nessuna telecamera per questo account</p>
          </div>
        )}

        {!loading && cameras.length > 0 && (
          <div className="space-y-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {cameras.length} telecamera{cameras.length !== 1 ? "e" : ""} — configura come nel pannello utente
            </p>

            {cameras.map((cam, index) => {
              const activeSection = openSection[cam.id] ?? "info";
              return (
                <motion.article
                  key={cam.id}
                  layout
                  className="rounded-3xl border border-white/10 bg-[#0a0f20] shadow-xl overflow-hidden"
                >
                  <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-black text-blue-400">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-white truncate">{cam.name || "Camera"}</h2>
                        <p className="text-[11px] text-slate-500 truncate">{cam.location || "—"} · {cam.type}</p>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          cam.status === "online"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {cam.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={savingId === cam.id}
                      onClick={() => handleSave(cam)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingId === cam.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : savedId === cam.id ? (
                        <Check size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      {savedId === cam.id ? "Salvato" : "Salva camera"}
                    </button>
                  </div>

                  <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-1.5 border-b border-white/5 bg-white/[0.02]">
                    {sectionButtons.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSection(cam.id, id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                          activeSection === id
                            ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                        }`}
                        title={label}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="px-4 sm:px-6 py-5">
                    <AnimatePresence mode="wait">
                      {activeSection === "info" && (
                        <motion.div
                          key="info"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="grid sm:grid-cols-2 gap-4 max-w-3xl"
                        >
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Nome</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.name}
                              onChange={(e) => updateCam(cam.id, { name: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Posizione</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.location}
                              onChange={(e) => updateCam(cam.id, { location: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">Tipo segnale</span>
                            <select
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.type}
                              onChange={(e) => updateCam(cam.id, { type: e.target.value as Camera["type"] })}
                            >
                              <option value="onvif">ONVIF / Tapo / IP</option>
                              <option value="ip">Stream URL</option>
                              <option value="webcam">Webcam</option>
                              <option value="browser">Browser</option>
                            </select>
                          </label>
                        </motion.div>
                      )}

                      {activeSection === "network" && (
                        <motion.div
                          key="network"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl"
                        >
                          <label className="block space-y-1 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">URL RTSP / stream</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-blue-300"
                              value={cam.url || ""}
                              onChange={(e) => updateCam(cam.id, { url: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">IP</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white"
                              value={cam.ip || ""}
                              onChange={(e) => updateCam(cam.id, { ip: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Porta</span>
                            <input
                              type="number"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.port ?? 554}
                              onChange={(e) => updateCam(cam.id, { port: Number(e.target.value) || 554 })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Percorso RTSP</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white"
                              value={cam.rtspPath || "/stream1"}
                              onChange={(e) => updateCam(cam.id, { rtspPath: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Utente</span>
                            <input
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.username || ""}
                              onChange={(e) => updateCam(cam.id, { username: e.target.value })}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Password</span>
                            <input
                              type="password"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                              value={cam.password || ""}
                              onChange={(e) => updateCam(cam.id, { password: e.target.value })}
                            />
                          </label>
                        </motion.div>
                      )}

                      {activeSection === "frequency" && (
                        <motion.div key="frequency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md">
                          <p className="text-[10px] font-black uppercase text-slate-500 mb-3">Intervallo analisi AI (secondi)</p>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                              onClick={() =>
                                updateCam(cam.id, {
                                  analysisInterval: Math.max(2, (cam.analysisInterval ?? 5) - 1),
                                })
                              }
                            >
                              −
                            </button>
                            <span className="text-3xl font-black text-blue-400 tabular-nums w-16 text-center">
                              {cam.analysisInterval ?? 5}
                            </span>
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                              onClick={() =>
                                updateCam(cam.id, {
                                  analysisInterval: Math.min(120, (cam.analysisInterval ?? 5) + 1),
                                })
                              }
                            >
                              +
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {activeSection === "triggers" && (
                        <motion.div key="triggers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <p className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                            <Bell size={12} /> Trigger AI — attiva e imposta fascia oraria
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                            {DEFAULT_TRIGGERS.map((trigger) => {
                              const isActive = (cam.enabledTriggers || []).includes(trigger.id);
                              const sched = cam.triggerSchedules?.[trigger.id];
                              const badge = isActive ? getTriggerScheduleBadgeText(sched) : null;
                              const LucideIcon = (Lucide as any)[trigger.icon_name] || Lucide.AlertTriangle;
                              return (
                                <div
                                  key={trigger.id}
                                  className="flex flex-col items-center gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/5"
                                >
                                  <button
                                    type="button"
                                    title={trigger.description}
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
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                                      isActive
                                        ? "bg-blue-600/30 border-blue-400/50 text-white"
                                        : "bg-white/5 border-white/10 text-slate-500 opacity-60 hover:opacity-100"
                                    }`}
                                  >
                                    <LucideIcon size={22} />
                                  </button>
                                  <span className="text-[9px] font-bold uppercase text-center leading-tight">
                                    {trigger.label}
                                  </span>
                                  {isActive && (
                                    <select
                                      className="w-full text-[8px] bg-black/40 border border-white/10 rounded-lg py-1 px-0.5 text-white"
                                      value={
                                        sched?.allDay
                                          ? "allDay"
                                          : sched?.presetName ||
                                            (sched?.startTime === "08:00" && sched?.endTime === "14:00"
                                              ? "mattina"
                                              : sched?.startTime === "14:00" && sched?.endTime === "20:00"
                                              ? "pomeriggio"
                                              : sched?.startTime === "22:00" && sched?.endTime === "06:00"
                                              ? "notte"
                                              : "allDay")
                                      }
                                      onChange={(e) => {
                                        const preset = SCHEDULE_PRESETS.find((p) => p.id === e.target.value);
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
                                        <option key={p.id} value={p.id}>
                                          {p.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  {badge && (
                                    <span className="text-[7px] font-black uppercase text-blue-400">{badge}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {activeSection === "zones" && (
                        <motion.div key="zones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 max-w-3xl">
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            {(cam.zones || []).length} zone definite (modifica etichetta e tipo)
                          </p>
                          {(cam.zones || []).length === 0 && (
                            <p className="text-sm text-slate-500">Nessuna zona — l&apos;utente può disegnarle dall&apos;app.</p>
                          )}
                          {(cam.zones || []).map((zone, zi) => (
                            <div
                              key={zone.id || zi}
                              className="flex flex-wrap gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/10"
                            >
                              <span className="text-[10px] font-mono text-slate-500 w-20 truncate">{zone.id}</span>
                              <input
                                className="flex-1 min-w-[120px] bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                value={zone.label || ""}
                                placeholder="Etichetta"
                                onChange={(e) => {
                                  const zones = [...(cam.zones || [])];
                                  zones[zi] = { ...zones[zi], label: e.target.value };
                                  updateCam(cam.id, { zones });
                                }}
                              />
                              <select
                                className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                value={zone.type}
                                onChange={(e) => {
                                  const zones = [...(cam.zones || [])];
                                  zones[zi] = { ...zones[zi], type: e.target.value as ZoneType };
                                  updateCam(cam.id, { zones });
                                }}
                              >
                                <option value="restricted">Ristretta</option>
                                <option value="alert">Alert</option>
                                <option value="privacy">Privacy</option>
                                <option value="excluded">Esclusa</option>
                              </select>
                              <span className="text-[10px] text-slate-600">{zone.points?.length || 0} punti</span>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {activeSection === "status" && (
                        <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                          {(["online", "offline"] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateCam(cam.id, { status: st })}
                              className={`px-6 py-3 rounded-xl text-xs font-black uppercase border ${
                                cam.status === st
                                  ? st === "online"
                                    ? "bg-green-600/20 border-green-500 text-green-400"
                                    : "bg-slate-600/20 border-slate-500 text-slate-300"
                                  : "bg-white/5 border-white/10 text-slate-500"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
