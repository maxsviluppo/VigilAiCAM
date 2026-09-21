/** Chiamata REST nativa Gemini (header x-goog-api-key) — affidabile con chiavi AQ. */
export async function geminiGenerateContentRest(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      `HTTP ${res.status} da Gemini API`;
    throw new Error(msg);
  }

  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error("Risposta AI vuota");
  }
  const textPart = parts.find((p: { text?: string }) => typeof p?.text === "string");
  if (!textPart?.text) {
    throw new Error("Risposta AI vuota");
  }
  return textPart.text;
}
