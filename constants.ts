
import { Document, DocStatus, RiskLevel } from './types';

// Helper: Gera data relativa a hoje (dias atrás)
const getDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
};

// Helper: Gera data relativa a hoje (meses atrás)
const getMonthsAgo = (months: number, day: number = 15) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    date.setDate(day);
    return date.toISOString();
};

// Helper: Gera data relativa a hoje (anos atrás)
const getYearsAgo = (years: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString();
};

export const MOCK_DOCUMENTS: Document[] = [
  // --- RECENTES (Última Semana) ---
  {
    id: 'doc-001',
    title: 'Renovação de Contrato - Vertex Corp',
    sender: 'Jurídico',
    receivedAt: getDaysAgo(1),
    status: DocStatus.INBOX,
    overallRisk: RiskLevel.HIGH,
    summary: 'Contém cláusulas de responsabilidade ambíguas sobre violação de dados.',
    content: `ADITIVO DE CONTRATO...\n1. VIGÊNCIA\nEste contrato será renovado automaticamente por 5 anos, exceto se contestado em 24h.`,
    highlights: [
      {
        id: 'h1',
        textSnippet: 'renovado automaticamente por um período de 5 anos',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Janela de contestação inviável (24h) para renovação longa.',
        category: 'Prazo Contratual'
      }
    ],
    history: []
  },
  {
    id: 'doc-004',
    title: 'Aditivo SLA CloudNet - Redução',
    sender: 'TI / Infra',
    receivedAt: getDaysAgo(2),
    status: DocStatus.IN_PLANNING,
    overallRisk: RiskLevel.HIGH,
    summary: 'Redução de SLA de 99,9% para 99,0% sem redução de custo.',
    content: `NOTIFICAÇÃO DE MUDANÇA DE SLA...\nNovo SLA garantido: 99,0%.`,
    highlights: [
      {
        id: 'h5',
        textSnippet: 'ajustado de 99,9% para 99,0%',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Redução de disponibilidade impacta operações críticas.',
        category: 'SLA'
      }
    ],
    history: [{ id: 'log-1', user: 'Você', action: 'PLAN_CREATED', timestamp: getDaysAgo(2), note: 'Risco aceito temporariamente.' }]
  },
  {
    id: 'doc-009',
    title: 'Escala de Plantão - Feriado',
    sender: 'Recursos Humanos',
    receivedAt: getDaysAgo(4),
    status: DocStatus.INBOX,
    overallRisk: RiskLevel.MEDIUM,
    summary: 'Escala excede limite legal de horas extras.',
    content: `PROPOSTA DE ESCALA...\nSexta-feira: 08:00 - 22:00 (14h)`,
    highlights: [
      {
        id: 'h13',
        textSnippet: 'Sexta-feira: 08:00 - 22:00 (14h)',
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'Jornada excede limite de horas extras.',
        category: 'Trabalhista'
      }
    ],
    history: []
  },

  // --- MÊS ATUAL / PASSADO ---
  {
    id: 'doc-007',
    title: 'Relatório Falha Crítica - Caldeira',
    sender: 'Manutenção',
    receivedAt: getDaysAgo(12),
    status: DocStatus.IN_ANALYSIS,
    overallRisk: RiskLevel.HIGH,
    summary: 'Falha em válvula sem peça de reposição.',
    content: `RELATÓRIO TÉCNICO...\nNão há peças de reposição. Prazo: 3 semanas.`,
    highlights: [
      { id: 'h8', textSnippet: 'fornecedor estima 3 semanas', riskLevel: RiskLevel.HIGH, explanation: 'Impacto na produção.', category: 'Operacional' }
    ],
    history: []
  },
  {
    id: 'doc-002',
    title: 'Relatório Conformidade Operacional',
    sender: 'Operações',
    receivedAt: getDaysAgo(20),
    status: DocStatus.COMPLIANT,
    overallRisk: RiskLevel.LOW,
    summary: 'Operação dentro dos limites normais.',
    content: `VISÃO GERAL...\nTodos os setores operacionais dentro dos limites verdes.`,
    highlights: [],
    history: []
  },

  // --- MESES ANTERIORES (Para gráfico anual) ---
  {
    id: 'doc-hist-1',
    title: 'Fatura AWS - Q3',
    sender: 'Financeiro',
    receivedAt: getMonthsAgo(2),
    status: DocStatus.APPROVED,
    overallRisk: RiskLevel.LOW,
    summary: 'Fatura dentro do budget.',
    content: `INVOICE AWS...`,
    highlights: [],
    history: []
  },
  {
    id: 'doc-hist-2',
    title: 'Renovação Seguro Frota',
    sender: 'Seguros',
    receivedAt: getMonthsAgo(3),
    status: DocStatus.APPROVED,
    overallRisk: RiskLevel.MEDIUM,
    summary: 'Aumento de prêmio anual.',
    content: `APÓLICE...`,
    highlights: [],
    history: []
  },
  {
    id: 'doc-hist-3',
    title: 'Auditoria Interna ISO 9001',
    sender: 'Qualidade',
    receivedAt: getMonthsAgo(5),
    status: DocStatus.COMPLIANT,
    overallRisk: RiskLevel.LOW,
    summary: 'Sem não conformidades.',
    content: `RELATÓRIO AUDITORIA...`,
    highlights: [],
    history: []
  },

  // --- ANOS ANTERIORES ---
  {
    id: 'doc-old-1',
    title: 'Relatório Anual 2023',
    sender: 'Diretoria',
    receivedAt: getYearsAgo(1),
    status: DocStatus.APPROVED,
    overallRisk: RiskLevel.LOW,
    summary: 'Fechamento do ano anterior.',
    content: `RELATÓRIO...`,
    highlights: [],
    history: []
  },
  {
    id: 'doc-old-2',
    title: 'Contrato Aluguel Sede',
    sender: 'Jurídico',
    receivedAt: getYearsAgo(2),
    status: DocStatus.APPROVED,
    overallRisk: RiskLevel.LOW,
    summary: 'Contrato de longo prazo.',
    content: `CONTRATO DE LOCAÇÃO...`,
    highlights: [],
    history: []
  }
];
