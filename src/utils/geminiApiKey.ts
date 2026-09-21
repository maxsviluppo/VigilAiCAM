/** Formati chiave API Google Gemini supportati da VigilAI */
export const GEMINI_API_KEY_PLACEHOLDER = "Chiave API (AIzaSy... o AQ....)";
export const GEMINI_API_KEY_MODAL_PLACEHOLDER = "Incolla la chiave (AIzaSy... o AQ....)";

/** Chiave classica Google AI Studio / Cloud (es. AIzaSy...) */
const LEGACY_GEMINI_KEY = /^AIza[0-9A-Za-z_-]{30,}$/;

/** Nuovo formato Google (es. AQ.xxxxxxxxx...) */
const AQ_GEMINI_KEY = /^AQ\.[A-Za-z0-9_-]{20,}$/;

export type GeminiApiKeyFormat = "legacy" | "aq" | "unknown";

export const VIGILAI_DEFAULT_AI_MODEL = "gemini-3.8-flash";
export const VIGILAI_FALLBACK_AI_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-flash-latest"];

const DEPRECATED_AI_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash",
]);

/** Forza Gemini 3.8 se in localStorage/cloud è rimasto un modello vecchio (es. 1.5). */
export function resolveVigilAiModel(stored?: string | null): string {
  const id = (stored || "").trim();
  if (!id || DEPRECATED_AI_MODELS.has(id) || id.includes("1.5")) {
    return VIGILAI_DEFAULT_AI_MODEL;
  }
  return id;
}

export function normalizeGeminiApiKey(key: string): string {
  return key
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
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

  const localFmt = getGeminiApiKeyFormat(local);
  const cloudFmt = getGeminiApiKeyFormat(cloud);
  // Non ripristinare AIza dal server/cloud se in browser c'è già una chiave AQ. valida
  if (localFmt === "aq" && cloudFmt === "legacy") return local;
  if (localFmt === "legacy" && cloudFmt === "aq") return cloud;

  if (localUpdatedAt && cloudUpdatedAt) {
    const localTs = Date.parse(localUpdatedAt);
    const cloudTs = Date.parse(cloudUpdatedAt);
    if (!Number.isNaN(localTs) && !Number.isNaN(cloudTs)) {
      return localTs >= cloudTs ? local : cloud;
    }
  }

  return local;
}

/** Rifiuta chiavi troncate (causa tipica del messaggio OAuth su chiavi AQ.) */
export function validateGeminiApiKeyOrThrow(key: string): string {
  const normalized = normalizeGeminiApiKey(key);
  if (!normalized) {
    throw new Error("API Key mancante. Inseriscila in Impostazioni → AI.");
  }
  const format = getGeminiApiKeyFormat(normalized);
  if (format === "aq" && normalized.length < 40) {
    throw new Error(
      "Chiave AQ. incompleta (copia l'intera chiave da AI Studio, senza spazi). " +
        "Se persiste, salva di nuovo in Impostazioni e riavvia il server.",
    );
  }
  if (format === "legacy" && normalized.length < 35) {
    throw new Error("Chiave AIza incompleta. Copia di nuovo la chiave da AI Studio.");
  }
  if (format === "unknown") {
    throw new Error(
      "Formato chiave non riconosciuto (atteso AIza... o AQ....). Verifica copia/incolla in Impostazioni.",
    );
  }
  return normalized;
}

export function formatGeminiAuthError(apiKey: string, rawMessage = ""): string {
  const format = getGeminiApiKeyFormat(apiKey);
  const base = rawMessage || "Autenticazione Gemini fallita.";

  if (
    base.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
    base.includes("OAuth") ||
    base.includes("Expected OAuth")
  ) {
    if (format === "aq") {
      return (
        "Google non accetta questa chiave AQ. (errore OAuth). Di solito la chiave è troncata o è stata sovrascritta da una vecchia AIza nel .env/server. " +
        "Incolla di nuovo la chiave AQ. completa in Impostazioni, clicca Salva, riavvia il server e aggiorna GEMINI_API_KEY nel file .env. " +
        "In AI Studio la chiave deve essere limitata a «Gemini API»."
      );
    }
    return (
      "Autenticazione Gemini fallita: chiave AIza non valida o revocata. " +
      "Crea una nuova chiave in AI Studio (formato AQ.) e sostituisci quella nel .env e in Impostazioni."
    );
  }

  if (base.includes("403") || base.includes("PERMISSION_DENIED") || base.includes("denied access")) {
    return (
      "Errore 403 Google: Accesso negato ('Your project has been denied access'). " +
      "Questa specifica chiave appartiene a un sotto-progetto Google Cloud disabilitato. " +
      "Usa la chiave generata nel Default Gemini Project (gen-lang-client-0195516927)."
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
