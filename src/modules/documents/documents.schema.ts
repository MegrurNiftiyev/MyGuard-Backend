export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
  fileUrl?: string;
}

export interface AnalysisRecord {
  documentId: string;
  analyzedAt: string;
  overallRiskScore: number;
  status: 'safe' | 'suspicious' | 'blocked';
  layer1_ocrTextMatch: {
    matchPercent: number;
    hiddenTextDetected: boolean;
    extraTextSegments?: string[];
  };
  layer2_classification: any;
  layer3_llmAnalysis: any;
}
