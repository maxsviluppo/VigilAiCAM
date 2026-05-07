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
  modelId: string = "gemini-3-flash-preview"
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

    // Inizializzazione con v1beta per supportare i modelli preview di generazione 3
    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 data if it contains the prefix
    const cleanBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const triggerDescriptions: Record<string, string> = {
      intrusion: "Intrusione non autorizzata o presenza sospetta.",
      violence: "Rapine, aggressioni, armi (pistole, coltelli, mazze).",
      fire: "Fiamme libere o incendio.",
      smoke: "Fumo denso.",
      safety_gear: "Mancato uso di caschi/DPI.",
      fall: "Persone a terra."
    };

    const activePrompts = triggers.map((t) => triggerDescriptions[t] || t).join(" ");

    const prompt = `Analizza questa immagine di sicurezza (${location}).
    OBIETTIVI: ${activePrompts}
    
    Se sono presenti ZONE DI SICUREZZA, valuta se eventuali minacce avvengono all'interno o in prossimità dei poligoni definiti.
    - Se un pericolo o un VEICOLO è in una zona 'restricted' o 'alert': segnali un'allerta immediata specificando il nome della zona nella descrizione.
    - Per ogni veicolo rilevato nelle zone di sicurezza (restricted/alert), riporta obbligatoriamente nella 'description': MARCA, COLORE e TARGA (se leggibile).
    - Se un'area è 'privacy', ignora qualsiasi attività al suo interno.

    Rispondi SOLO in formato JSON:
    {
      "threatLevel": "low" | "medium" | "high",
      "detectedEvents": string[],
      "description": "breve descrizione tecnica in italiano (includi dettagli veicolo MARCA/COLORE/TARGA se presente)",
      "isEmergency": boolean
    }
    
    CRITERIO EMERGENZA (isEmergency=true): Rapina (volto coperto e armi), violenza in corso, fiamme, o QUALSIASI presenza/intrusione di persone o veicoli rilevata all'interno delle zone 'restricted' o 'alert'.`;

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
    console.error("AI Analysis Error:", error.message);
    
    let userFriendlyError = `Errore analisi: ${error.message}`;
    if (error.message.includes("404")) {
      userFriendlyError = "Modello non trovato (404). Verifica se l'API Gemini 1.5 è abilitata nel tuo account.";
    }

    return {
      threatLevel: "low",
      detectedEvents: [],
      description: userFriendlyError,
      isEmergency: false,
    };
  }
};
