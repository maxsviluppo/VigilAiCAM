import { Type } from "@google/genai";
import { AlertTrigger } from "../types";
import { createGeminiClient } from "../utils/geminiClient";
import { formatGeminiAuthError, getGeminiApiKeyFormat, normalizeGeminiApiKey } from "../utils/geminiApiKey";

export interface DetectionResult {
  threatLevel: "low" | "medium" | "high";
  detectedEvents: string[];
  description: string;
  isEmergency: boolean;
  usedModel?: string;
  latencyMs?: number;
}

export const analyzeFrame = async (
  base64Image: string, 
  triggers: AlertTrigger[] = ["intrusion", "violence"],
  location: string = "Area monitorata",
  modelId: string = "gemini-3.8-flash",
  zones: any[] = [],
  triggerDescriptionsMap?: Record<string, string>
): Promise<DetectionResult> => {
  const startTime = Date.now();
  try {
    let rawKey = localStorage.getItem("vigilai_gemini_key") || "";
    if (!rawKey) {
       // @ts-ignore
       rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    }
    if (!rawKey) {
       // @ts-ignore
       rawKey = process.env.GEMINI_API_KEY || "";
    }
    const apiKey = normalizeGeminiApiKey(rawKey);
    
    if (!apiKey) {
      throw new Error("API Key mancante.");
    }

    const keyFormat = getGeminiApiKeyFormat(apiKey);
    console.log(`[AI Core] Inizializzazione chiave formato ${keyFormat}: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

    const ai = createGeminiClient(apiKey);

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

    // Prova prima il modello 3.8 Flash, poi 3.0 e fallback veloci 2.0 / 1.5
    const modelsToTry = Array.from(new Set([
      modelId,
      "gemini-3.8-flash",
      "gemini-3-flash-preview",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ]));
    let lastError = "";

    for (const modelName of modelsToTry) {
      try {
        const isModel38 = modelName.includes("3.8");
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

        // Su Gemini 3.8 Flash ottimizziamo la latenza per videoanalisi continua
        if (isModel38) {
          configObj.thinkingConfig = { thinkingLevel: "low" };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: prompt }
              ]
            }
          ],
          config: configObj,
        });

        const text = response.text;
        if (!text) throw new Error("Risposta AI vuota");
        
        const parsed = JSON.parse(text);
        const latencyMs = Date.now() - startTime;
        console.log(`[AI Core] Analisi frame eseguita con successo con modello: ${modelName} (${latencyMs}ms)`);
        
        return {
          ...parsed,
          usedModel: modelName,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err.message || String(err);
        const msg = lastError;
        if (
          msg.includes("401") ||
          msg.includes("UNAUTHENTICATED") ||
          msg.toLowerCase().includes("api key not valid") ||
          msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")
        ) {
          throw new Error(formatGeminiAuthError(apiKey, msg));
        }
        const isModelMissing =
          msg.includes("404") ||
          msg.includes("NOT_FOUND") ||
          msg.toLowerCase().includes("not found");
        if (!isModelMissing) break;
        console.warn(`Modello ${modelName} non disponibile, provo il prossimo...`);
      }
    }

    throw new Error(lastError);
  } catch (error: any) {
    let cleanErrorMessage = error.message || "Errore sconosciuto durante l'analisi.";
    const latencyMs = Date.now() - startTime;
    
    // Se l'errore è una stringa JSON (come spesso accade con gli errori 429), estraiamo solo il messaggio
    if (cleanErrorMessage.includes("RESOURCE_EXHAUSTED") || cleanErrorMessage.includes("quota")) {
      cleanErrorMessage = `Quota API Gemini superata per il modello ${modelId} (Free Tier). Attendi 60s o prova un modello diverso.`;
    } else if (cleanErrorMessage.includes("404")) {
      cleanErrorMessage = "Modello non trovato. Verifica le impostazioni API Gemini.";
    } else if (cleanErrorMessage.startsWith("{")) {
      try {
        const parsed = JSON.parse(cleanErrorMessage);
        cleanErrorMessage = parsed.error?.message || cleanErrorMessage;
      } catch (e) {}
    }

    return {
      threatLevel: "low",
      detectedEvents: [],
      description: cleanErrorMessage,
      isEmergency: false,
      usedModel: modelId,
      latencyMs,
    };
  }
};
