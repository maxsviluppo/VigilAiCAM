import { Injectable } from '@angular/core';
import { Type } from '@google/genai';
import { createGeminiClient } from '../utils/geminiClient';
import { getGeminiApiKeyFormat, normalizeGeminiApiKey, resolveVigilAiModel, VIGILAI_FALLBACK_AI_MODELS } from '../utils/geminiApiKey';
import { geminiGenerateContentRest } from '../utils/geminiRest';

@Injectable({
    providedIn: 'root'
})
export class GeminiService {
    private getApiKey(): string {
        const localKey = typeof window !== 'undefined' ? localStorage.getItem("vigilai_gemini_key") : null;
        if (localKey && localKey.trim() !== "") {
            return normalizeGeminiApiKey(localKey);
        }

        const env = (import.meta as any).env || {};
        const processEnv = (window as any).process?.env || {};

        const key = env['VITE_GEMINI_API_KEY'] ||
            env['GEMINI_API_KEY'] ||
            processEnv['VITE_GEMINI_API_KEY'] ||
            processEnv['GEMINI_API_KEY'];

        return normalizeGeminiApiKey(key || "");
    }

    async analyzeImage(file: File): Promise<any> {
        const apiKey = this.getApiKey();
        if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
            throw new Error('API_KEY_MISSING');
        }

        const primaryModel = resolveVigilAiModel(localStorage.getItem("vigilai_model"));
        const modelsToTry = [
            primaryModel,
            ...VIGILAI_FALLBACK_AI_MODELS.filter((m) => m !== primaryModel)
        ];

        const base64Image = await this.fileToBase64(file);
        const prompt = `Agisci come un esperto di tracciabilità alimentare (HACCP). 
          Analizza questa immagine di un'etichetta di un ingrediente. Estrai: productName, lotNumber, expiryDate (YYYY-MM-DD), notes.`;

        const contents = [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Image.split(',')[1] } },
                    { text: prompt }
                ]
            }
        ];

        const schema = {
            type: Type.OBJECT,
            properties: {
                productName: { type: Type.STRING },
                lotNumber: { type: Type.STRING },
                expiryDate: { type: Type.STRING },
                notes: { type: Type.STRING }
            },
            required: ["productName", "lotNumber", "expiryDate", "notes"]
        };

        const keyFormat = getGeminiApiKeyFormat(apiKey);
        const ai = createGeminiClient(apiKey);
        let lastError: any = null;

        for (const candidateModel of modelsToTry) {
            try {
                let text: string;
                if (keyFormat === "aq") {
                    text = await geminiGenerateContentRest(apiKey, candidateModel, {
                        contents,
                        generationConfig: {
                            responseMimeType: 'application/json',
                            responseSchema: schema
                        }
                    });
                } else {
                    const response = await ai.models.generateContent({
                        model: candidateModel,
                        contents,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: schema
                        }
                    });
                    text = response.text || "";
                }

                if (!text) throw new Error('Risposta AI vuota');
                return JSON.parse(text);
            } catch (err: any) {
                lastError = err;
                console.warn(`[HACCP AI] Errore con modello ${candidateModel}: ${err.message}. Tento modello successivo...`);
            }
        }

        throw lastError || new Error('Impossibile analizzare immagine HACCP.');
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
