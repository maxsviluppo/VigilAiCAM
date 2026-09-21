import { GoogleGenAI } from "@google/genai";
import { normalizeGeminiApiKey } from "./geminiApiKey";

/** Client Gemini Developer API (supporta chiavi AIza... e AQ....) */
export function createGeminiClient(rawKey: string): GoogleGenAI {
  const apiKey = normalizeGeminiApiKey(rawKey);
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
  });
}
