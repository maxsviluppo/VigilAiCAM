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
  let resolvedApiKey = "";
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
    resolvedApiKey = apiKey;

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

    const modelName = modelId || "gemini-3.8-flash";

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

    if (modelName.includes("3.8")) {
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
      msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")
    ) {
      throw new Error(formatGeminiAuthError(resolvedApiKey, msg));
    }

    if (cleanErrorMessage.includes("RESOURCE_EXHAUSTED") || cleanErrorMessage.includes("quota")) {
      return {
        threatLevel: "low",
        detectedEvents: [],
        description: `Quota API Gemini superata per il modello ${modelId || "gemini-3.8-flash"} (Free Tier). Attendi 60s.`,
        isEmergency: false,
        usedModel: modelId,
        latencyMs,
      };
    }

    if (cleanErrorMessage.includes("404") || cleanErrorMessage.includes("NOT_FOUND")) {
      throw new Error("Modello gemini-3.8-flash non disponibile. Verifica API Gemini e il modello selezionato.");
    }

    throw new Error(cleanErrorMessage);
  }
};
