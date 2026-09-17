export interface Layer2ClassifierResult {
  classification: 'Safe' | 'Suspicious' | 'High Risk' | 'Critical';
  confidence: number;
  isInjection: boolean;
  riskCategory: 'Prompt Injection' | 'Steganography' | 'Hidden Command' | 'System Override' | 'None';
  matchedSignatures: string[];
}

export interface Layer3LLMAnalysisResult {
  isMalicious: boolean;
  confidence: number;
  aiExplanation: string;
  recommendedAction: string;
  mitigationSteps: string[];
}
