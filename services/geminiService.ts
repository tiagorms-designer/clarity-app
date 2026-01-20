import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Highlight, RiskLevel } from "../types";

const GEMINI_MODEL = "gemini-3-flash-preview";

export const analyzeDocumentWithGemini = async (
  text: string
): Promise<{ summary: string; overallRisk: RiskLevel; highlights: Highlight[]; sender: string }> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    throw new Error("Chave de API ausente. Por favor, selecione uma chave.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        // Configurações de segurança para evitar bloqueio de termos jurídicos/contratuais
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

    // Tratamento Robusto de JSON
    // O modelo pode retornar Markdown ```json ... ``` ou texto introdutório.
    // Esta lógica encontra a primeira chave '{' e a última '}' para extrair apenas o objeto JSON válido.
    const rawText = response.text || "{}";
    let jsonString = rawText;
    
    const firstOpen = rawText.indexOf('{');
    const lastClose = rawText.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonString = rawText.substring(firstOpen, lastClose + 1);
    }

    const result = JSON.parse(jsonString);
    
    // Add unique IDs to highlights for UI handling
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

  } catch (error) {
    console.error("Gemini analysis failed details:", error);
    throw new Error("Falha na comunicação com a IA Clarity. Tente novamente.");
  }
};

export const getRemediationSuggestion = async (
    riskSnippet: string,
    riskExplanation: string,
    category: string
): Promise<string> => {
    if (!process.env.API_KEY) return "Erro: Chave de API não configurada.";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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