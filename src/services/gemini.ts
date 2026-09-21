import { Type } from "@google/genai";
import { AlertTrigger } from "../types";
import { createGeminiClient } from "../utils/geminiClient";
import {
  formatGeminiAuthError,
  getGeminiApiKeyFormat,
  normalizeGeminiApiKey,
  resolveVigilAiModel,
  validateGeminiApiKeyOrThrow,
  VIGILAI_DEFAULT_AI_MODEL,
  VIGILAI_FALLBACK_AI_MODELS,
} from "../utils/geminiApiKey";
import { geminiGenerateContentRest } from "../utils/geminiRest";

export interface DetectionResult {
  threatLevel: "low" | "medium" | "high";
  detectedEvents: string[];
  description: string;
  isEmergency: boolean;
  usedModel?: string;
  latencyMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyzeFrame = async (
  base64Image: string, 
  triggers: AlertTrigger[] = ["intrusion", "violence"],
  location: string = "Area monitorata",
  modelId: string = VIGILAI_DEFAULT_AI_MODEL,
  zones: any[] = [],
  triggerDescriptionsMap?: Record<string, string>
): Promise<DetectionResult> => {
  const startTime = Date.now();
  let resolvedApiKey = "";
  try {
    const hasLocalStorage = typeof localStorage !== "undefined" && typeof localStorage?.getItem === "function";
    const localKey = hasLocalStorage ? normalizeGeminiApiKey(localStorage.getItem("vigilai_gemini_key") || "") : "";
    const envKey = normalizeGeminiApiKey(
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== "undefined" && (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) || ""
    );

    const keysToTry: string[] = [];
    if (localKey) keysToTry.push(localKey);
    if (envKey && !keysToTry.includes(envKey)) keysToTry.push(envKey);

    if (keysToTry.length === 0) {
      throw new Error("API Key mancante. Inseriscila in Impostazioni → IA.");
    }

    // Clean base64 data if it contains the prefix
    const cleanBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const defaultDescriptions: Record<string, string> = {
      intrusion: "Intrusione non autorizzata o presenza sospetta di intrusi.",
      violence: "Rapine, aggressioni, atti vandalici o armi (pistole, coltelli, mazze).",
      fire: "Fiamme libere, principio di incendio o presenza di fuoco.",
      smoke: "Fumo denso o fumo anomalo negli ambienti.",
      safety_gear: "Mancato uso di caschi di protezione, giubbotti catarifrangenti o abbigliamento protettivo obbligatorio.",
      fall: "Persone a terra, svenimenti o cadute accidentali.",
      flooding: "Presenza di acqua o liquidi sul pavimento, allagamenti, pozze o perdite da tubature.",
      earthquake: "Vibrazioni, oscillazioni continue o scuotimento dell'inquadratura compatibili con un terremoto/scossa sismica (da distinguere da urti singoli al tavolo/supporto)."
    };

    const descriptions = triggerDescriptionsMap || defaultDescriptions;
    const activePrompts = triggers.map((t) => descriptions[t] || t).join(" ");

    const zoneInfo = zones.length > 0 
      ? `\nZONE DEFINITE (Coordinate 0-1, 0,0 è top-left):\n${zones.map(z => `- NOME: "${z.label}", TIPO: "${z.type}", COORDINATE: ${JSON.stringify(z.points)}`).join('\n')}`
      : "";

    const prompt = `Analizza questa immagine di sicurezza (${location}).
    OBIETTIVI: ${activePrompts}
    ${zoneInfo}
    
    Se sono presenti ZONE DI SICUREZZA sopra definite:
    - Valuta se eventuali minacce (persone sospette, armi, veicoli) avvengono all'INTERNO dei poligoni definiti dalle COORDINATE.
    - Se un pericolo o un VEICOLO è in una zona 'restricted' o 'alert': segnali un'allerta immediata (isEmergency: true) specificando il nome della zona nella 'description'.
    - Per ogni veicolo rilevato nelle zone di sicurezza (restricted/alert), riporta obbligatoriamente nella 'description': MARCA, COLORE e TARGA (se leggibile).
    - Se un'area è 'privacy', ignora QUALSIASI attività al suo interno (non segnalare nulla).
 
    Rispondi SOLO in formato JSON:
    {
      "threatLevel": "low" | "medium" | "high",
      "detectedEvents": string[],
      "description": "descrizione tecnica in italiano (includi dettagli veicolo e riferimento alla ZONA se rilevata)",
      "isEmergency": boolean
    }
    
    CRITERIO EMERGENZA (isEmergency=true): Rapina (volto coperto e armi), violenza, fiamme, o QUALSIASI intrusione di persone o veicoli nelle zone 'restricted' o 'alert'.`;

    const primaryModel = resolveVigilAiModel(modelId);

    // Costruiamo la sequenza di modelli resiliente: primario (3-flash-preview o 3.8-flash) con fallback intelligente
    const modelsToTry = [
      primaryModel,
      ...VIGILAI_FALLBACK_AI_MODELS.filter((m) => m !== primaryModel),
    ];

    const contents = [
      {
        role: "user" as const,
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: prompt },
        ],
      },
    ];

    let lastErrorMsg = "";
    let finalParsed: any = null;
    let successfulModel = primaryModel;

    // Iterazione con self-healing: prova prima la chiave salvata in locale, se fallisce con 403/progetto disabilitato prova quella del .env
    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      resolvedApiKey = apiKey;
      validateGeminiApiKeyOrThrow(apiKey);
      const keyFormat = getGeminiApiKeyFormat(apiKey);
      const ai = createGeminiClient(apiKey);
      let keyPermissionError = false;

      for (let i = 0; i < modelsToTry.length; i++) {
        const candidateModel = modelsToTry[i];
        const is38 = candidateModel.includes("3.8");

        const configObj: any = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              threatLevel: { type: Type.STRING, enum: ["low", "medium", "high"] },
              detectedEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              isEmergency: { type: Type.BOOLEAN },
            },
            required: ["threatLevel", "detectedEvents", "description", "isEmergency"],
          },
        };

        if (is38) {
          configObj.thinkingConfig = { thinkingLevel: "low" };
        }

        // Prova fino a 2 tentativi se 503 (high demand) sul modello primario
        const maxAttempts = (candidateModel === primaryModel) ? 2 : 1;
        let attemptSuccess = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            let text: string;
            if (keyFormat === "aq") {
              const restBody: Record<string, unknown> = {
                contents,
                generationConfig: {
                  responseMimeType: configObj.responseMimeType,
                  responseSchema: configObj.responseSchema,
                },
              };
              if (configObj.thinkingConfig) {
                (restBody.generationConfig as Record<string, unknown>).thinkingConfig = configObj.thinkingConfig;
              }
              text = await geminiGenerateContentRest(apiKey, candidateModel, restBody);
            } else {
              const response = await ai.models.generateContent({
                model: candidateModel,
                contents,
                config: configObj,
              });
              if (!response.text) throw new Error("Risposta AI vuota");
              text = response.text;
            }

            finalParsed = JSON.parse(text);
            successfulModel = candidateModel;
            attemptSuccess = true;
            break;
          } catch (callErr: any) {
            lastErrorMsg = callErr.message || String(callErr);

            if (lastErrorMsg.startsWith("{")) {
              try {
                const p = JSON.parse(lastErrorMsg);
                lastErrorMsg = p.error?.message || lastErrorMsg;
              } catch {}
            }

            const isAuthOrPermission =
              lastErrorMsg.includes("403") ||
              lastErrorMsg.includes("PERMISSION_DENIED") ||
              lastErrorMsg.includes("denied access") ||
              lastErrorMsg.includes("disabled");

            if (isAuthOrPermission) {
              console.warn(`[AI Core] Chiave ${apiKey.slice(0, 8)}... non ha accesso (${lastErrorMsg.slice(0, 80)})`);
              keyPermissionError = true;
              break;
            }

            if (
              lastErrorMsg.includes("401") ||
              lastErrorMsg.includes("UNAUTHENTICATED") ||
              lastErrorMsg.toLowerCase().includes("api key not valid") ||
              lastErrorMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
              lastErrorMsg.includes("Expected OAuth")
            ) {
              console.warn(`[AI Core] Chiave non autenticata: ${lastErrorMsg.slice(0, 80)}`);
              keyPermissionError = true;
              break;
            }

            const isOverloaded = 
              lastErrorMsg.includes("503") ||
              lastErrorMsg.includes("UNAVAILABLE") ||
              lastErrorMsg.includes("high demand") ||
              lastErrorMsg.includes("RESOURCE_EXHAUSTED") ||
              lastErrorMsg.includes("quota") ||
              lastErrorMsg.includes("429");

            if (isOverloaded && attempt < maxAttempts) {
              console.warn(`[AI Core] ${candidateModel} picco temporaneo (tentativo ${attempt}/${maxAttempts}). Attesa 600ms e riprovo...`);
              await sleep(600);
              continue;
            }

            console.warn(`[AI Core] Modello ${candidateModel} non disponibile al momento (${lastErrorMsg.slice(0, 100)}).`);
            break;
          }
        }

        if (attemptSuccess || keyPermissionError) {
          break;
        }
      }

      if (finalParsed) {
        if (apiKey !== localKey && hasLocalStorage) {
          console.log("[AI Core] Auto-ripristino: salvata in localStorage la chiave funzionante dal .env");
          localStorage.setItem("vigilai_gemini_key", apiKey);
        }
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    if (finalParsed) {
      if (successfulModel !== primaryModel) {
        console.log(`[AI Core] Failover automatico attivo: frame analizzato con ${successfulModel} (${latencyMs}ms)`);
      } else {
        console.log(`[AI Core] Analisi frame eseguita con successo con ${successfulModel} (${latencyMs}ms)`);
      }
      return {
        ...finalParsed,
        usedModel: successfulModel,
        latencyMs,
      };
    }

    console.error(`[AI Core] Tutti i modelli hanno fallito: ${lastErrorMsg}`);
    const isPermissionError = lastErrorMsg.includes("403") || lastErrorMsg.includes("PERMISSION_DENIED") || lastErrorMsg.includes("denied access") || lastErrorMsg.includes("disabled");
    const errorDesc = isPermissionError 
      ? `⚠️ Errore Google API (403): Accesso negato o progetto disabilitato (${lastErrorMsg.slice(0, 80)}).`
      : `⚠️ Modelli Gemini temporaneamente occupati da picco di traffico. Nuovo tentativo al prossimo frame.`;

    return {
      threatLevel: "low",
      detectedEvents: [],
      description: errorDesc,
      isEmergency: false,
      usedModel: primaryModel,
      latencyMs,
    };
  } catch (error: any) {
    let cleanErrorMessage = error.message || "Errore sconosciuto durante l'analisi.";
    const latencyMs = Date.now() - startTime;

    if (cleanErrorMessage.startsWith("{")) {
      try {
        const parsed = JSON.parse(cleanErrorMessage);
        cleanErrorMessage = parsed.error?.message || cleanErrorMessage;
      } catch (e) {}
    }

    const msg = cleanErrorMessage;
    if (
      msg.includes("401") ||
      msg.includes("UNAUTHENTICATED") ||
      msg.toLowerCase().includes("api key not valid") ||
      msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
      msg.includes("Expected OAuth")
    ) {
      throw new Error(formatGeminiAuthError(resolvedApiKey, msg));
    }

    return {
      threatLevel: "low",
      detectedEvents: [],
      description: `⚠️ Servizio AI: ${cleanErrorMessage.slice(0, 120)}`,
      isEmergency: false,
      usedModel: modelId || VIGILAI_DEFAULT_AI_MODEL,
      latencyMs,
    };
  }
};
