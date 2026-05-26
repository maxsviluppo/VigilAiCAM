import { GoogleGenAI, Type } from "@google/genai";
import { AlertTrigger } from "../types";

export interface DetectionResult {
  threatLevel: "low" | "medium" | "high";
  detectedEvents: string[];
  description: string;
  isEmergency: boolean;
}

export const analyzeFrame = async (
  base64Image: string, 
  triggers: AlertTrigger[] = ["intrusion", "violence"],
  location: string = "Area monitorata",
  modelId: string = "gemini-3-flash-preview",
  zones: any[] = [],
  triggerDescriptionsMap?: Record<string, string>
): Promise<DetectionResult> => {
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
    const apiKey = rawKey ? rawKey.trim() : "";
    
    if (!apiKey) {
      throw new Error("API Key mancante.");
    }

    // Diagnostic log: check if the key is actually changing
    console.log(`[AI Core] Inizializzazione con chiave: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

    // Inizializzazione con v1beta per supportare i modelli preview di generazione 3
    const ai = new GoogleGenAI({ apiKey });

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

    // Prova i modelli della nuova generazione 3 e 2
    const modelsToTry = [modelId, "gemini-3-flash-preview", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError = "";

    for (const modelName of modelsToTry) {
      try {
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
          config: {
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
          },
        });

        const text = response.text;
        if (!text) throw new Error("Risposta AI vuota");
        
        return JSON.parse(text);
      } catch (err: any) {
        lastError = err.message;
        if (!err.message.includes("404")) break; // Se l'errore non è 404, fermati
        console.warn(`Modello ${modelName} non trovato, provo il prossimo...`);
      }
    }

    throw new Error(lastError);
  } catch (error: any) {
    let cleanErrorMessage = error.message || "Errore sconosciuto durante l'analisi.";
    
    // Se l'errore è una stringa JSON (like often with 429), extract only the message
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
    };
  }
};
