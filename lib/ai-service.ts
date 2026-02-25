
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIConfig {
    provedor: string;
    modelo: string;
    credential: string;
    responseMimeType?: string;
}

export class AIService {
    static getModel(config: AIConfig) {
        const provedor = config.provedor?.toLowerCase() || 'gemini';
        const modelo = config.modelo || 'gemini-1.5-flash';
        const credential = config.credential;

        if (provedor === 'gemini' || provedor === 'google') {
            const genAI = new GoogleGenerativeAI(credential);
            return genAI.getGenerativeModel({
                model: modelo,
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 8192,
                    topP: 0.95,
                    topK: 40,
                    ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {})
                }
            });
        }

        // Futuras implementações para OpenAI, Grok, etc.
        if (provedor === 'openai') {
            throw new Error('Provedor OpenAI ainda não implementado no AIService');
        }

        throw new Error(`Provedor de IA desconhecido: ${provedor}`);
    }

    static isGemini(provedor?: string) {
        const p = provedor?.toLowerCase() || 'gemini';
        return p === 'gemini' || p === 'google';
    }
}
