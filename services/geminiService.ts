import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Highlight, RiskLevel } from "../types";

const GEMINI_MODEL = "gemini-3-flash-preview";

export const analyzeDocumentWithGemini = async (
  text: string
): Promise<{ summary: string; overallRisk: RiskLevel; highlights: Highlight[]; sender: string }> => {
  
  // Safety check for environment variable access to prevent crash in browsers if process is undefined
  let apiKey: string | undefined;
  try {
    apiKey = process.env.API_KEY;
  } catch (e) {
    console.error("Environment variable access failed:", e);
    throw new Error("Erro de Ambiente: 'process.env.API_KEY' não está acessível. Verifique a configuração do build/deploy.");
  }

  if (!apiKey) {
    console.error("API Key missing");
    throw new Error("Chave de API ausente. Por favor, configure a API Key.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    Você é a Clarity AI, uma especialista em análise de riscos contratuais e operacionais.

    Analise o seguinte documento com precisão cirúrgica.
    
    INSTRUÇÕES CRÍTICAS:
    1. Identifique quem é o EMISSOR ou DEPARTAMENTO responsável pelo documento (ex: "Departamento Jurídico", "Recursos Humanos", "Fornecedor [Nome]", "Manutenção").
    2. O campo 'textSnippet' DEVE SER UMA CÓPIA EXATA, caractere por caractere, de um trecho encontrado no texto original.
    3. NÃO resuma, NÃO reformule e NÃO corrija o 'textSnippet'.
    4. Selecione apenas os trechos mais críticos que evidenciam o risco.

    Objetivos da Análise:
    1. Determinar o Risco Geral do documento.
    2. Identificar cláusulas ou trechos específicos que representam ameaças.
    3. Categorizar o documento.

    Texto para Análise:
    """
    ${text}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sender: {
              type: Type.STRING,
              description: "O departamento interno, empresa externa ou área responsável pelo documento (ex: Jurídico, RH, Financeiro)."
            },
            summary: {
              type: Type.STRING,
              description: "Resumo executivo profissional (1 parágrafo) focado na tomada de decisão."
            },
            overallRisk: {
              type: Type.STRING,
              enum: ["HIGH", "MEDIUM", "LOW", "NEUTRAL"],
              description: "Nível de risco agregado do documento."
            },
            highlights: {
              type: Type.ARRAY,
              description: "Lista de pontos de risco identificados no texto.",
              items: {
                type: Type.OBJECT,
                properties: {
                  textSnippet: {
                    type: Type.STRING,
                    description: "CÓPIA EXATA e LITERAL do trecho do texto original que contém o risco."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Explicação do impacto (máx 20 palavras)."
                  },
                  riskLevel: {
                    type: Type.STRING,
                    enum: ["HIGH", "MEDIUM", "LOW", "NEUTRAL"]
                  },
                  category: {
                    type: Type.STRING,
                    description: "Categoria (ex: Jurídico, Financeiro, Compliance, SLA, Segurança)."
                  }
                },
                required: ["textSnippet", "explanation", "riskLevel", "category"]
              }
            }
          },
          required: ["summary", "overallRisk", "highlights", "sender"]
        }
      }
    });

    const rawText = response.text || "{}";
    let jsonString = rawText;
    
    // Robust extraction of JSON object
    const firstOpen = rawText.indexOf('{');
    const lastClose = rawText.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonString = rawText.substring(firstOpen, lastClose + 1);
    }

    let result;
    try {
        result = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", rawText);
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
    
    const highlightsWithIds = (result.highlights || []).map((h: any, index: number) => ({
      ...h,
      id: `gen-h-${Date.now()}-${index}`
    }));

    return {
      sender: result.sender || "Upload Externo",
      summary: result.summary || "Análise concluída, mas nenhum resumo gerado.",
      overallRisk: (result.overallRisk as RiskLevel) || RiskLevel.NEUTRAL,
      highlights: highlightsWithIds
    };

  } catch (error: any) {
    console.error("Gemini analysis failed details:", error);
    
    let userMessage = "Falha na comunicação com a IA Clarity.";

    if (error.message) {
        if (error.message.includes("403")) {
            userMessage = "Erro 403: Acesso Negado. Verifique se o domínio do deploy está autorizado na chave de API.";
        } else if (error.message.includes("400")) {
             userMessage = "Erro 400: Requisição Inválida. O documento pode ser muito grande ou corrompido.";
        } else if (error.message.includes("429")) {
            userMessage = "Erro 429: Cota de API excedida. Aguarde um momento.";
        } else if (error.message.includes("fetch failed")) {
             userMessage = "Erro de Conexão: Verifique sua internet ou bloqueadores de anúncio.";
        } else {
             userMessage = `Erro: ${error.message}`;
        }
    }
    
    throw new Error(userMessage);
  }
};

export const getRemediationSuggestion = async (
    riskSnippet: string,
    riskExplanation: string,
    category: string
): Promise<string> => {
    let apiKey: string | undefined;
    try {
        apiKey = process.env.API_KEY;
    } catch {
        return "Erro: Variáveis de ambiente inacessíveis.";
    }

    if (!apiKey) return "Erro: Chave de API não configurada.";

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const prompt = `
      Atue como a Clarity, uma IA especialista em gestão de riscos operacionais e jurídicos.
      
      Contexto do Risco:
      - Trecho: "${riskSnippet}"
      - Impacto: "${riskExplanation}"
      - Categoria: "${category}"

      Tarefa:
      Gere um plano de ação técnico detalhado, direto e acionável para mitigar este risco.
      O texto deve ser instrutivo, para a pessoa responsável resolver o problema.
      Use tom profissional e imperativo. Máximo de 3 parágrafos curtos.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        return response.text || "Não foi possível gerar sugestão.";
    } catch (e) {
        console.error(e);
        return "Erro ao consultar a IA.";
    }
};