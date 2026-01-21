import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold, Schema } from "@google/genai";
import { Highlight, RiskLevel } from "../types";

// MUDANÇA CRÍTICA: Usando modelo estável (1.5 Flash) em vez de preview/2.0 para evitar erro 400 e instabilidade
const GEMINI_MODEL = "gemini-1.5-flash"; 

// Helper para obter a chave de API de todas as fontes possíveis
const getApiKey = (): string | undefined => {
  let key: string | undefined;
  try {
    // 1. Variáveis de ambiente do Vite (Padrão moderno)
    // @ts-ignore
    if (import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        key = import.meta.env.VITE_API_KEY;
    }
    // 2. Runtime injection (index.html window.process)
    else if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
        key = (window as any).process.env.API_KEY;
    } 
    // 3. Process env padrão (Node/Build time)
    else {
        key = process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Erro ao ler variáveis de ambiente:", e);
  }
  return key;
}

export const analyzeDocumentWithGemini = async (
  text: string
): Promise<{ summary: string; overallRisk: RiskLevel; highlights: Highlight[]; sender: string }> => {
  
  const apiKey = getApiKey();

  // Validação explícita da chave
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("INSIRA")) {
    console.error("API Key missing or invalid");
    throw new Error("Chave de API não encontrada. Configure a variável VITE_API_KEY ou edite o index.html.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Schema simplificado para garantir compatibilidade com 1.5 Flash
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      sender: { type: Type.STRING, description: "Emissor do documento" },
      summary: { type: Type.STRING, description: "Resumo executivo" },
      overallRisk: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "NEUTRAL"] },
      highlights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            textSnippet: { type: Type.STRING },
            explanation: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "NEUTRAL"] },
            category: { type: Type.STRING }
          },
          required: ["textSnippet", "explanation", "riskLevel", "category"]
        }
      }
    },
    required: ["summary", "overallRisk", "highlights", "sender"]
  };

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
            role: 'user',
            parts: [{ text: `Analise o seguinte documento e extraia riscos:\n\n${text}` }]
        }
      ],
      config: {
        systemInstruction: `Você é a Clarity AI. Analise contratos e documentos operacionais. 
        Saída estritamente em JSON.
        Se o texto for ilegível ou muito curto, retorne overallRisk: NEUTRAL.`,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    // Tratamento robusto do JSON
    const rawText = response.text || "{}";
    let result;
    
    try {
        result = JSON.parse(rawText);
    } catch (e) {
        // Fallback: Tentar limpar markdown se o modelo ignorar o MIME type
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanJson);
    }
    
    // Adiciona IDs únicos aos destaques
    const highlightsWithIds = (result.highlights || []).map((h: any, index: number) => ({
      ...h,
      id: `gen-h-${Date.now()}-${index}`
    }));

    return {
      sender: result.sender || "Desconhecido",
      summary: result.summary || "Sem resumo disponível.",
      overallRisk: (result.overallRisk as RiskLevel) || RiskLevel.NEUTRAL,
      highlights: highlightsWithIds
    };

  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    const msg = error.message || "";
    
    if (msg.includes("400") && msg.includes("API key")) {
        throw new Error("Sua Chave de API expirou ou é inválida. Gere uma nova no Google AI Studio.");
    } else if (msg.includes("400")) {
        throw new Error("Erro 400: O documento é complexo demais ou o modelo está instável. Tente novamente.");
    } else if (msg.includes("429")) {
        throw new Error("Muitas requisições. Aguarde um minuto.");
    }
    
    throw new Error("Erro na análise de IA. Verifique sua conexão e chave de API.");
  }
};

export const getRemediationSuggestion = async (
    riskSnippet: string,
    riskExplanation: string,
    category: string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Erro de configuração de API.";

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{
                role: 'user',
                parts: [{ text: `Gere um plano de ação curto para mitigar este risco: "${riskExplanation}" (Categoria: ${category}).` }]
            }]
        });
        return response.text || "Sem sugestão.";
    } catch (e) {
        return "Não foi possível gerar sugestão no momento.";
    }
};