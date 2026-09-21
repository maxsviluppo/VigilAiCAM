import { Injectable } from '@angular/core';
import { Type } from '@google/genai';
import { createGeminiClient } from '../utils/geminiClient';
import { normalizeGeminiApiKey, resolveVigilAiModel } from '../utils/geminiApiKey';

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

        const ai = createGeminiClient(apiKey);
        const modelName = resolveVigilAiModel(localStorage.getItem("vigilai_model"));

        const base64Image = await this.fileToBase64(file);
        const prompt = `Agisci come un esperto di tracciabilità alimentare (HACCP). 
          Analizza questa immagine di un'etichetta di un ingrediente. Estrai: productName, lotNumber, expiryDate (YYYY-MM-DD), notes.`;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Image.split(',')[1] } },
                        { text: prompt }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        productName: { type: Type.STRING },
                        lotNumber: { type: Type.STRING },
                        expiryDate: { type: Type.STRING },
                        notes: { type: Type.STRING }
                    },
                    required: ["productName", "lotNumber", "expiryDate", "notes"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error('Risposta AI vuota');

        return JSON.parse(text);
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
