
import { Document, DocStatus, RiskLevel } from './types';

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-001',
    title: 'Renovação de Contrato de Serviço - Vertex Corp',
    sender: 'Departamento Jurídico',
    receivedAt: '2023-10-27T09:30:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.HIGH,
    summary: 'Contém cláusulas de responsabilidade ambíguas sobre violação de dados.',
    content: `ADITIVO DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS
    
1. VIGÊNCIA
Este contrato será renovado automaticamente por um período de 5 anos, a menos que contestado dentro de 24 horas.

2. RESPONSABILIDADE
A Vertex Corp não será responsabilizada por quaisquer danos indiretos, incidentais ou consequentes, incluindo, mas não se limitando a perda de dados causada por integrações de terceiros, independentemente de negligência.

3. PAGAMENTO
Os termos de pagamento são de 15 dias líquidos. Taxas de atraso seguem uma taxa de juros composta de 5% ao dia.

4. RESCISÃO
O provedor pode rescindir este contrato a qualquer momento sem justa causa.`,
    highlights: [
      {
        id: 'h1',
        textSnippet: 'renovado automaticamente por um período de 5 anos, a menos que contestado dentro de 24 horas',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Janela de contestação inviável (24h) para uma renovação longa (5 anos).',
        category: 'Prazo Contratual'
      },
      {
        id: 'h2',
        textSnippet: 'independentemente de negligência',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Exclui responsabilidade mesmo em casos de negligência, criando alto risco operacional.',
        category: 'Responsabilidade Civil'
      },
      {
        id: 'h3',
        textSnippet: 'juros composta de 5% ao dia',
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'Estrutura de juros por atraso abusiva e fora do padrão de mercado.',
        category: 'Financeiro'
      }
    ],
    history: []
  },
  {
    id: 'doc-007',
    title: 'Relatório de Falha Crítica - Caldeira B2',
    sender: 'Manutenção Industrial',
    receivedAt: '2023-10-29T07:15:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.HIGH,
    summary: 'Falha em válvula de pressão sem peças de reposição. Risco de parada de linha.',
    content: `RELATÓRIO DE INCIDENTE TÉCNICO - CALDEIRA B2

Data: 29/10/2023
Técnico Responsável: Carlos M.

Descrição:
Durante a inspeção matinal, detectou-se corrosão severa na válvula de alívio principal. A operação foi interrompida preventivamente.

Estoque:
Não há peças de reposição no almoxarifado local. O fornecedor estima 3 semanas para entrega devido a trâmites de importação.

Impacto:
Redução de 30% na capacidade produtiva da Linha 2 até o reparo.`,
    highlights: [
      {
        id: 'h8',
        textSnippet: 'fornecedor estima 3 semanas para entrega',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Tempo de inatividade prolongado impactará metas de produção mensal.',
        category: 'Operacional'
      },
       {
        id: 'h9',
        textSnippet: 'Redução de 30% na capacidade produtiva',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Impacto direto no faturamento e prazos de entrega.',
        category: 'Financeiro'
      }
    ],
    history: []
  },
  {
    id: 'doc-008',
    title: 'Alteração na Legislação Ambiental - CONAMA',
    sender: 'Consultoria Jurídica',
    receivedAt: '2023-10-30T10:00:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.HIGH,
    summary: 'Novos limites de efluentes entram em vigor em 30 dias. Planta atual não conforme.',
    content: `MEMORANDO JURÍDICO: ATUALIZAÇÃO RESOLUÇÃO CONAMA

Prezados,

Foi publicada hoje a nova resolução referente ao descarte de efluentes industriais líquidos.

Mudanças Principais:
- Redução do limite de metais pesados de 0.5mg/L para 0.2mg/L.
- Obrigatoriedade de monitoramento em tempo real via telemetria.

Prazo:
As adequações devem ser comprovadas em até 30 dias sob pena de multa diária de R$ 50.000,00.

Status Atual:
Nossa estação de tratamento opera com média de 0.3mg/L.`,
    highlights: [
      {
        id: 'h10',
        textSnippet: 'comprovadas em até 30 dias',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Prazo extremamente curto para adequação de infraestrutura de tratamento.',
        category: 'Regulatório'
      },
      {
        id: 'h11',
        textSnippet: 'multa diária de R$ 50.000,00',
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'Risco financeiro significativo em caso de não conformidade.',
        category: 'Financeiro'
      },
       {
        id: 'h12',
        textSnippet: 'opera com média de 0.3mg/L',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Sistema atual não atende à nova norma (0.2mg/L). Ação imediata necessária.',
        category: 'Operacional'
      }
    ],
    history: []
  },
  {
    id: 'doc-004',
    title: 'Aditivo SLA CloudNet - Redução de Garantia',
    sender: 'Infraestrutura de TI',
    receivedAt: '2023-10-28T08:00:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.HIGH,
    summary: 'Proposta de redução de SLA de 99,9% para 99,0% sem redução de custo.',
    content: `NOTIFICAÇÃO DE MUDANÇA DE NÍVEL DE SERVIÇO (SLA)

Prezado Cliente,

A CloudNet está atualizando sua infraestrutura global. Durante o próximo ano fiscal, o SLA garantido para serviços de armazenamento será ajustado de 99,9% para 99,0%.

Não haverá alteração na fatura mensal vigente.

O suporte técnico passará a operar apenas em horário comercial (09h às 18h), exceto para planos Enterprise Plus.`,
    highlights: [
      {
        id: 'h5',
        textSnippet: 'ajustado de 99,9% para 99,0%',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Redução significativa de disponibilidade que pode impactar operações críticas.',
        category: 'SLA'
      },
      {
        id: 'h6',
        textSnippet: 'apenas em horário comercial',
        riskLevel: RiskLevel.HIGH,
        explanation: 'Fim do suporte 24/7 cria vulnerabilidade fora do expediente.',
        category: 'Suporte'
      }
    ],
    history: []
  },
  {
    id: 'doc-009',
    title: 'Escala de Plantão - Feriado Nacional',
    sender: 'Recursos Humanos',
    receivedAt: '2023-10-31T14:30:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.MEDIUM,
    summary: 'Escala proposta excede limite legal de horas extras para a Equipe C.',
    content: `PROPOSTA DE ESCALA - OPERAÇÃO FERIADO

Para cobrir a demanda extraordinária do feriado, a seguinte escala é proposta para a Equipe C:

- Sexta-feira: 08:00 - 22:00 (14h)
- Sábado: 08:00 - 20:00 (12h)
- Domingo: Descanso

Observação: O intervalo interjornada de 11 horas está sendo respeitado no limite.`,
    highlights: [
      {
        id: 'h13',
        textSnippet: 'Sexta-feira: 08:00 - 22:00 (14h)',
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'Jornada de 14h excede o limite habitual de horas extras, gerando passivo trabalhista.',
        category: 'Trabalhista'
      },
      {
        id: 'h14',
        textSnippet: 'respeitado no limite',
        riskLevel: RiskLevel.LOW,
        explanation: 'Margem de erro zero para o intervalo interjornada. Qualquer atraso gera infração.',
        category: 'Compliance'
      }
    ],
    history: []
  },
  {
    id: 'doc-006',
    title: 'Notificação de Auditoria Externa ISO 9001',
    sender: 'Qualidade',
    receivedAt: '2023-10-24T10:00:00Z',
    status: DocStatus.RISK_WARNING,
    overallRisk: RiskLevel.MEDIUM,
    summary: 'Agendamento de auditoria para o próximo mês. Requer preparação de documentos.',
    content: `CONFIRMAÇÃO DE AGENDAMENTO DE AUDITORIA

A certificadora QualityCert confirma a realização da auditoria de manutenção da ISO 9001 nos dias 20 e 21 de Novembro.

Escopo:
- Processos de Compras
- Gestão de RH
- Controle de Qualidade de Produção

Solicitamos que a documentação dos últimos 12 meses esteja disponível fisicamente na sala de reuniões principal.`,
    highlights: [
      {
        id: 'h7',
        textSnippet: 'esteja disponível fisicamente',
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'Exigência de documentos físicos pode demandar tempo significativo de preparação.',
        category: 'Compliance'
      }
    ],
    history: []
  },
  {
    id: 'doc-003',
    title: 'Atualização de Fornecedor - SteelWorks',
    sender: 'Suprimentos',
    receivedAt: '2023-10-25T11:00:00Z',
    status: DocStatus.APPROVED,
    overallRisk: RiskLevel.MEDIUM,
    summary: 'Aviso de reajuste de preço devido à escassez de matéria-prima.',
    content: `AVISO DE REAJUSTE DE PREÇO

Devido às flutuações globais nos preços do minério de ferro, a SteelWorks necessita aplicar um aumento de 12% no custo unitário, com efeito imediato para todos os pedidos pendentes.`,
    highlights: [],
    history: [
      {
        id: 'act-1',
        user: 'Analista Sarah',
        action: 'VALIDATE',
        timestamp: '2023-10-25T13:00:00Z',
        note: 'Aumento alinhado com tendências de mercado. Aprovado.'
      }
    ]
  },
  {
    id: 'doc-002',
    title: 'Relatório de Conformidade Operacional Q4',
    sender: 'Gerente de Operações',
    receivedAt: '2023-10-26T14:15:00Z',
    status: DocStatus.COMPLIANT,
    overallRisk: RiskLevel.LOW,
    summary: 'Relatório padrão. Dois desvios menores em logs de segurança já tratados.',
    content: `VISÃO GERAL DE CONFORMIDADE Q4

Todos os setores operacionais permaneceram dentro dos limites verdes. 

- Setor A: 99,9% de disponibilidade.
- Setor B: 98,5% de disponibilidade (Janela de Manutenção).

Os registros de segurança indicam dois incidentes menores envolvendo uso de EPI no Armazém 4. Treinamento corretivo foi aplicado imediatamente. Nenhuma violação regulatória ocorreu.`,
    highlights: [
      {
        id: 'h4',
        textSnippet: 'dois incidentes menores envolvendo uso de EPI',
        riskLevel: RiskLevel.LOW,
        explanation: 'Desvios pontuais observados. Já mitigados via treinamento.',
        category: 'Segurança'
      }
    ],
    history: []
  },
  {
    id: 'doc-005',
    title: 'Fatura Mensal - Logística Express',
    sender: 'Financeiro',
    receivedAt: '2023-10-27T16:45:00Z',
    status: DocStatus.COMPLIANT,
    overallRisk: RiskLevel.LOW,
    summary: 'Fatura regular. Valores dentro da média histórica.',
    content: `FATURA DE SERVIÇOS LOGÍSTICOS #49202

Período: Outubro/2023
Total: R$ 45.200,00

Detalhamento:
- Rotas Urbanas: R$ 30.000,00
- Rotas Intermunicipais: R$ 12.000,00
- Taxas de Combustível: R$ 3.200,00

Vencimento: 15/11/2023
Dados bancários para depósito em anexo.`,
    highlights: [],
    history: []
  }
];
