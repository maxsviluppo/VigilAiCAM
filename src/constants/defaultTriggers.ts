import type { AlertTriggerItem } from "../types";

export const DEFAULT_TRIGGERS: AlertTriggerItem[] = [
  { id: "intrusion", label: "Intrusione", description: "Intrusione non autorizzata o presenza sospetta.", icon_name: "Eye", color_class: "text-blue-400" },
  { id: "violence", label: "Violenza", description: "Rapine, aggressioni, atti vandalici o armi.", icon_name: "ShieldAlert", color_class: "text-red-500" },
  { id: "fire", label: "Incendio", description: "Fiamme libere o principio di incendio.", icon_name: "Flame", color_class: "text-orange-500" },
  { id: "smoke", label: "Fumo", description: "Fumo denso o anomalo.", icon_name: "Wind", color_class: "text-slate-300" },
  { id: "safety_gear", label: "DPI", description: "Mancato uso di DPI obbligatori.", icon_name: "UserCheck", color_class: "text-green-400" },
  { id: "fall", label: "Cadute", description: "Persone a terra o cadute.", icon_name: "Activity", color_class: "text-purple-400" },
  { id: "flooding", label: "Allagamento", description: "Acqua sul pavimento o perdite.", icon_name: "Waves", color_class: "text-cyan-400" },
  { id: "earthquake", label: "Terremoto", description: "Scuotimento continuo compatibile con sisma.", icon_name: "Zap", color_class: "text-amber-500" },
];
