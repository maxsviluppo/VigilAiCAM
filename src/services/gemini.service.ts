import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
    providedIn: 'root'
})
export class GeminiService {
    private apiKey = '';

    private getApiKey(): string {
        const env = (import.meta as any).env || {};
        const processEnv = (window as any).process?.env || {};

        const key = env['VITE_GEMINI_API_KEY'] ||
            env['GEMINI_API_KEY'] ||
            processEnv['VITE_GEMINI_API_KEY'] ||
            processEnv['GEMINI_API_KEY'];

        // Se non viene rilevata una chiave valida, usiamo quella fornita
        return (key && key !== 'PLACEHOLDER_API_KEY') ? key : 'AIzaSyArBmcV0kZEwFbrlyXUlHrgSybMuQYurc0';
    }

    constructor() {
        this.apiKey = this.getApiKey();
    }

    async analyzeImage(file: File): Promise<any> {
        if (!this.apiKey || this.apiKey === 'PLACEHOLDER_API_KEY') {
            throw new Error('API_KEY_MISSING');
        }

        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
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
                if (!text) continue;

                return JSON.parse(text);
            } catch (error: any) {
                lastError = error;
                console.warn(`Tentativo fallito con ${modelName}:`, error.message);
                continue;
            }
        }

        throw new Error(lastError?.message || 'Errore tecnico AI');
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
