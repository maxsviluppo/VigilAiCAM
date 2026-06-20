/** Formati chiave API Google Gemini supportati da VigilAI */
export const GEMINI_API_KEY_PLACEHOLDER = "Chiave API (AIzaSy... o AQ....)";
export const GEMINI_API_KEY_MODAL_PLACEHOLDER = "Incolla la chiave (AIzaSy... o AQ....)";

/** Chiave classica Google AI Studio / Cloud (es. AIzaSy...) */
const LEGACY_GEMINI_KEY = /^AIza[0-9A-Za-z_-]{30,}$/;

/** Nuovo formato Google (es. AQ.xxxxxxxxx...) */
const AQ_GEMINI_KEY = /^AQ\.[A-Za-z0-9_-]{20,}$/;

export type GeminiApiKeyFormat = "legacy" | "aq" | "unknown";

export function normalizeGeminiApiKey(key: string): string {
  return key.trim().replace(/\s+/g, "");
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
