/** Formati chiave API Google Gemini supportati da VigilAI */
export const GEMINI_API_KEY_PLACEHOLDER = "Chiave API (AIzaSy... o AQ....)";
export const GEMINI_API_KEY_MODAL_PLACEHOLDER = "Incolla la chiave (AIzaSy... o AQ....)";

/** Chiave classica Google AI Studio / Cloud (es. AIzaSy...) */
const LEGACY_GEMINI_KEY = /^AIza[0-9A-Za-z_-]{30,}$/;

/** Nuovo formato Google (es. AQ.xxxxxxxxx...) */
const AQ_GEMINI_KEY = /^AQ\.[A-Za-z0-9_-]{20,}$/;

export type GeminiApiKeyFormat = "legacy" | "aq" | "unknown";

export function normalizeGeminiApiKey(key: string): string {
  return key.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

/** Sceglie la chiave più recente tra locale e cloud (evita rollback a AIza vecchia) */
export function pickPreferredGeminiApiKey(
  localKey: string,
  cloudKey: string,
  localUpdatedAt?: string | null,
  cloudUpdatedAt?: string | null,
): string {
  const local = normalizeGeminiApiKey(localKey);
  const cloud = normalizeGeminiApiKey(cloudKey);
  if (!cloud) return local;
  if (!local) return cloud;

  if (localUpdatedAt && cloudUpdatedAt) {
    const localTs = Date.parse(localUpdatedAt);
    const cloudTs = Date.parse(cloudUpdatedAt);
    if (!Number.isNaN(localTs) && !Number.isNaN(cloudTs)) {
      return localTs >= cloudTs ? local : cloud;
    }
  }

  return local;
}

export function formatGeminiAuthError(apiKey: string, rawMessage = ""): string {
  const format = getGeminiApiKeyFormat(apiKey);
  const base = rawMessage || "Autenticazione Gemini fallita.";

  if (
    format === "aq" &&
    (base.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
      base.includes("OAuth") ||
      base.includes("Expected OAuth"))
  ) {
    return (
      "Chiave AQ. rifiutata da Google per questo progetto. In AI Studio verifica che la chiave sia abilitata per «Gemini API», " +
      "salva di nuovo la chiave in VigilAI (Impostazioni) e aggiorna il backup Supabase. Se persiste, rigenera la chiave in AI Studio."
    );
  }

  if (base.includes("401") || base.toLowerCase().includes("api key")) {
    return `Chiave API Gemini non valida (${format === "aq" ? "formato AQ." : "formato AIza"}). Controlla AI Studio e ri-salva le impostazioni.`;
  }

  return base;
}

export function getGeminiApiKeyFormat(key: string): GeminiApiKeyFormat {
  const normalized = normalizeGeminiApiKey(key);
  if (LEGACY_GEMINI_KEY.test(normalized)) return "legacy";
  if (AQ_GEMINI_KEY.test(normalized)) return "aq";
  return "unknown";
}

export function isValidGeminiApiKey(key: string): boolean {
  const normalized = normalizeGeminiApiKey(key);
  if (!normalized) return false;
  if (LEGACY_GEMINI_KEY.test(normalized)) return true;
  if (AQ_GEMINI_KEY.test(normalized)) return true;
  return normalized.length >= 20;
}

export function formatGeminiApiKeyHint(key: string): string {
  const format = getGeminiApiKeyFormat(key);
  if (format === "legacy") return "Formato classico (AIzaSy)";
  if (format === "aq") return "Formato nuovo (AQ.)";
  return "Formato non standard — verifica la chiave";
}
