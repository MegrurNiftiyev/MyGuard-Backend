import { Request } from 'express';
import { Department, ALL_DEPARTMENTS } from '../modules/auth/auth.schema.js';

export { Department, ALL_DEPARTMENTS };

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  file?: any;
};

export type RiskStatus = 'safe' | 'suspicious' | 'high_risk' | 'blocked';
export type ActionDecision = 'ALLOWED' | 'BLOCKED' | 'REQUIRES_CONFIRMATION';
export type SensitivityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type AIModelMode = 'STANDARD AI' | 'CONFIDENTIAL AI';

export type ScanStep =
  | 'DOCUMENT_UPLOADED'
  | 'PDF_TEXT_EXTRACTION'
  | 'OCR_ANALYSIS'
  | 'TEXT_COMPARISON'
  | 'HIDDEN_TEXT_DETECTION'
  | 'PROMPT_INJECTION_ANALYSIS'
  | 'RISK_ASSESSMENT';

export interface Document {
  id: string;
  ownerId: string;

  fileName: string;
  fileSizeBytes: number;
  fileType: 'pdf' | 'docx' | 'txt' | string;
  uploadUrl: string;
  isConfidential: boolean;

  uploadedAt: string;
  scanStartedAt: string | null;
  scanFinishedAt: string | null;
  scanDurationMs: number | null;

  currentStep: ScanStep | 'COMPLETED' | 'FAILED';
  stepStatus: 'pending' | 'active' | 'completed' | 'error';
  stepHistory: {
    step: ScanStep;
    startedAt: string;
    finishedAt: string | null;
    status: 'completed' | 'error';
    message: string;
  }[];

  layer1_ocrTextMatch: {
    matchPercent: number;
    hiddenTextDetected: boolean;
    extraTextSegments: string[];
    textDifferenceFound: boolean;
    differenceSnippet: string; // for backward compatibility
    differenceSnippets: string[]; // new list format
    ocrText: string;
    pdfTextLayer: string;
    status: 'clean' | 'suspicious';
  } | null;

  layer2_classification: {
    label: 'safe' | 'suspicious' | 'injection';
    confidence: number;
    accuracy: number;
    message: string;
    categories: string[];
    requiresUserConfirmation: boolean;
  } | null;

  layer3_llmReview: {
    used: boolean;
    isMalicious: boolean;
    confidence: number;
    explanation: string | null;
    message: string | null;
    recommendedAction: string | null;
    attackVector?: string;
    reasoning?: string;
    mitigationSteps?: string[];
  } | null;

  finalRiskScore: number | null;
  finalStatus: RiskStatus | null;

  reviewedByUser: boolean;
  userReviewLabel: boolean | null;
  isContainInjection: boolean;

  errorDetail: string | null;
}

export interface DocumentListItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  finalStatus: RiskStatus | null;
  finalRiskScore: number | null;
  currentStep: ScanStep | 'COMPLETED' | 'FAILED';
  isConfidential?: boolean;
}

export interface ScanSocketEvent {
  response: 'success' | 'error';
  step: ScanStep;
  message: string;
  fileData: Pick<Document,
    | 'currentStep' | 'stepStatus'
    | 'layer1_ocrTextMatch' | 'layer2_classification' | 'layer3_llmReview'
    | 'finalRiskScore' | 'finalStatus' | 'isContainInjection'
    | 'scanStartedAt' | 'scanFinishedAt' | 'scanDurationMs'
    | 'isConfidential'
  >;
}

// Keeping ThreatItem, MessageBlock etc. intact below if needed.
export interface ThreatItem {
  id: string;
  type: 'Hidden Text' | 'Instruction Override' | 'Ranking Manipulation' | 'External Action Request';
  title: string;
  snippet: string;
  description: string;
  location: string;
  pageNumber: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}



export type AiMessageBlock =
  | { type: 'header'; title: string; subtitle?: string }
  | { type: 'text'; content: string }
  | { type: 'callout'; title?: string; content: string; tone: 'danger' | 'warning' | 'info' | 'success' }
  | { type: 'table'; title?: string; headers: string[]; rows: (string | number)[][] }
  | {
      type: 'chart';
      title?: string;
      subtitle?: string;
      chartType: 'area' | 'bar' | 'line' | 'pie' | 'donut' | 'horizontal_bar';
      chartKeys: {
        nameKey: string;
        valueKey?: string;
        dataKeys?: { key: string; tone: string; label: string }[];
      };
      chartData: Record<string, string | number>[];
    }
  | { type: 'list'; title?: string; listType: 'numbered' | 'bulleted'; items: string[] }
  | { type: 'image'; title: string; description: string; actionLabel?: string; actionUrl?: string }
  | { type: 'code'; title?: string; language: string; code: string }
  | { type: 'quote'; title?: string; content: string; author?: string; date?: string }
  | { type: 'link'; label: string; url: string; content?: string }
  | { type: 'file'; name: string; sizeLabel: string; url: string };

export type MessageBlockType = 
  | 'header' 
  | 'text' 
  | 'chart' 
  | 'table' 
  | 'callout' 
  | 'link' 
  | 'file' 
  | 'image' 
  | 'code' 
  | 'quote' 
  | 'list';

export interface MessageBlock {
  type: MessageBlockType;
  title?: string;
  subtitle?: string;
  content?: string;
  chartType?: 'area' | 'line' | 'bar' | 'pie' | 'horizontal_bar' | 'donut';
  chartData?: any[];
  chartKeys?: { 
    nameKey?: string; 
    valueKey?: string; 
    dataKeys?: { key: string; tone?: string; color?: string; label?: string }[] 
  };
  imageUrl?: string;
  imageAlt?: string;
  name?: string;
  sizeLabel?: string;
  actionLabel?: string;
  actionUrl?: string;
  tableData?: { headers: string[]; rows: (string | number)[][] };
  headers?: string[];
  rows?: (string | number)[][];
  tone?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'purple' | 'indigo';
  url?: string;
  label?: string;
  description?: string;
  code?: string;
  language?: string;
  author?: string;
  date?: string;
  items?: string[];
  listType?: 'numbered' | 'bulleted' | 'bullet';
}

export const ChatMode = {
  SMALL_CHAT: 'SMALL_CHAT',
  LARGE_CHAT: 'LARGE_CHAT',
} as const;
export type ChatMode = typeof ChatMode[keyof typeof ChatMode] | string;

export const ScreenDestination = {
  HOME_SCREEN: 'HOME_SCREEN',
  DOCUMENTS_SCREEN: 'DOCUMENTS_SCREEN',
  SCAN_SCREEN: 'SCAN_SCREEN',
  SETTINGS_SCREEN: 'SETTINGS_SCREEN',
  AI_SCREEN: 'AI_SCREEN',
} as const;
export type ScreenDestination = typeof ScreenDestination[keyof typeof ScreenDestination] | string;

export interface AttachedDocumentPayload {
  name?: string;
  fileName?: string;
  content?: string;
  text?: string;
  fileSizeBytes?: number;
}

export interface SendChatMessageRequest {
  chatMode?: ChatMode;
  screenDestination?: ScreenDestination;
  message?: string;
  userMessage?: string;
  sessionId?: string;
  contextDocumentId?: string;
  documentId?: string;
  attachedDocument?: AttachedDocumentPayload;
  files?: AttachedDocumentPayload[];
}

export interface SmallChatMessage {
  chatMode: typeof ChatMode.SMALL_CHAT | string;
  text: string;
}

export interface LargeChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  timestamp: string;
  createdAtISO?: string;
  blocks: MessageBlock[];
}

export interface ModelConfig {
  id: string;
  name: string;
  mode: AIModelMode;
  status: 'Active' | 'Standby' | 'Offline';
  isLocal: boolean;
  lastUpdate: string;
  provider: string;
  description: string;
  latency: string;
  maxContext: string;
}

export interface AgentActivityLog {
  id: string;
  agent: string;
  action: string;
  file: string;
  destination: string;
  sensitivity: SensitivityLevel;
  decision: 'ALLOWED' | 'BLOCKED';
  timestamp: string;
  reason: string;
}

export interface RiskDashboardStats {
  totalScanned: number;
  safeCount: number;
  suspiciousCount: number;
  blockedCount: number;
  detectedInjectionsCount: number;
  riskTrend: Array<{ date: string; safe: number; suspicious: number; blocked: number }>;
  injectionTypes: Array<{ type: string; count: number; percentage: number }>;
  departmentRisks: Array<{ department: string; scanned: number; riskRate: number }>;
  documentsSummary?: Array<{
    id: string;
    fileName: string;
    uploadedAt: string;
    finalStatus: RiskStatus;
    finalRiskScore: number;
    isContainInjection: boolean;
  }>;
}

export interface Layer1Metrics {
  matchPercent: number;
  hiddenTextDetected: boolean;
  extraTextSegments?: string[];
}

export interface ScanStepCard {
  stepNumber: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'warning';
}

export interface DocumentThreatReport {
  documentId: string;
  documentName: string;
  fileType: string;
  uploadTime: string;
  riskStatus: RiskStatus;
  riskScore: number;
  ocrPdfMatch: number;
  hiddenTextDetected: boolean;
  promptInjectionProb: number;
  plainExplanation: string;
  threats: ThreatItem[];
  ocrText?: string;
  pdfTextLayer?: string;
  flaggedSnippet?: string; // legacy
  flaggedSnippets?: string[]; // new list format
  flaggedMetadata?: any;
}
