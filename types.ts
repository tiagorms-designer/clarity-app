
export enum RiskLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NEUTRAL = 'NEUTRAL'
}

export enum DocStatus {
  PROCESSING = 'PROCESSING',
  INBOX = 'INBOX',             // Novo: Documento recebido, não aberto
  IN_ANALYSIS = 'IN_ANALYSIS', // Novo: Aberto/Visualizado pelo usuário
  IN_PLANNING = 'IN_PLANNING', // Novo: Usuário começou a criar planos de ação
  COMPLIANT = 'COMPLIANT',     // Baixo risco automático (Seguro)
  APPROVED = 'APPROVED'        // Validado manualmente
}

export interface RemediationPlan {
  actionType: 'REVISION' | 'MAINTENANCE' | 'TRAINING' | 'ACCEPT_RISK' | 'LEGAL_REVIEW';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assignee: string;
  deadline?: string;
  instructions: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface Highlight {
  id: string;
  textSnippet: string;
  riskLevel: RiskLevel;
  explanation: string; // "Why this matters"
  category: string;
  remediation?: RemediationPlan; // New field for detailed action reporting
}

export interface ActionLog {
  id: string;
  user: string;
  action: 'VALIDATE' | 'FLAG' | 'DISMISS' | 'COMMENT' | 'PLAN_CREATED';
  timestamp: string;
  note?: string;
}

export interface Document {
  id: string;
  title: string;
  sender?: string;
  receivedAt: string;
  status: DocStatus;
  overallRisk: RiskLevel;
  summary: string;
  content: string; // Plain text content for this demo
  fileUrl?: string; // Optional: Blob URL for original file viewing
  fileType?: string; // Optional: Mime type
  highlights: Highlight[];
  history: ActionLog[];
}

export type ViewState = 'DASHBOARD' | 'LIBRARY' | 'UPLOAD' | 'VIEWER' | 'AUDIT';