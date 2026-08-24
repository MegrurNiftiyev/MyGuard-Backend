import { Request } from 'express';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export type RiskStatus = 'safe' | 'suspicious' | 'high_risk' | 'blocked';
export type StepStatus = 'processing' | 'completed' | 'warning' | 'failed';
export type ActionDecision = 'ALLOWED' | 'BLOCKED' | 'REQUIRES_CONFIRMATION';
export type SensitivityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type AIModelMode = 'STANDARD AI' | 'CONFIDENTIAL AI';

export interface DocumentItem {
  id: string;
  name: string;
  fileType: string;
  size: string;
  uploadTime: string;
  riskScore: number; // 0 - 100
  status: RiskStatus;
  ocrPdfMatch: number; // percentage
  hiddenTextDetected: boolean;
  promptInjectionProb: number; // percentage
  department: string;
  flaggedCount: number;
  category: string;
  fileUrl?: string;
}

export interface ScanStep {
  stepNumber: number;
  title: string;
  description: string;
  status: StepStatus;
}

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

export interface DetailedAnalysis {
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
  ocrText: string;
  pdfTextLayer: string;
  flaggedSnippet: string;
  flaggedMetadata: {
    pageNumber: number;
    visibilityType: string;
    location: string;
  };
}

export interface StructuredAiAnalysis {
  riskSeverity: string;
  detectedThreat: string;
  confidence: string;
  reason: string;
  recommendation: string;
}

export type MessageBlockType = 
  | 'header' 
  | 'text' 
  | 'chart' 
  | 'table' 
  | 'analysis' 
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
  chartType?: 'area' | 'line' | 'bar' | 'horizontal_bar' | 'donut';
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
  analysisData?: StructuredAiAnalysis;
  tone?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'purple' | 'indigo';
  url?: string;
  label?: string;
  description?: string;
  code?: string;
  language?: string;
  author?: string;
  date?: string;
  items?: string[];
  listType?: 'numbered' | 'bullet';
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  structuredAnalysis?: StructuredAiAnalysis;
  blocks?: MessageBlock[];
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

export interface AgentAction {
  id: string;
  action: string;
  file: string;
  destination: string;
  sensitivity: SensitivityLevel;
  decision: ActionDecision;
  timestamp: string;
  reason: string;
}

export interface RiskReportMetrics {
  totalScanned: number;
  safeCount: number;
  suspiciousCount: number;
  blockedCount: number;
  detectedInjectionsCount: number;
  riskTrend: Array<{ date: string; safe: number; suspicious: number; blocked: number }>;
  injectionTypes: Array<{ type: string; count: number; percentage: number }>;
  departmentRisks: Array<{ department: string; scanned: number; riskRate: number }>;
}

export interface Layer1Metrics {
  matchPercent: number;
  hiddenTextDetected: boolean;
  extraTextSegments?: string[];
}

export interface AnalysisPipeline {
  documentId: string;
  layer1_ocrTextMatch: Layer1Metrics;
  layer2_classification: {
    confidence: number;
    label: 'safe' | 'suspicious' | 'injection';
    categories: string[];
  };
  layer3_llmReview: {
    used: boolean;
    explanation: string | null;
  };
  finalRiskScore: number;
  finalStatus: 'safe' | 'suspicious' | 'high_risk';
}
