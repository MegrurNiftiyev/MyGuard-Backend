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

const INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'ignore all previous',
  'system prompt',
  'system override',
  'developer mode',
  'jailbreak',
  'override protocol',
  'set risk score to 0',
  'set budget to 0',
  'zəmanətin məbləğini',
  'do not disclose',
  'do not mention',
  'hidden_prompt',
  '<hidden',
];

export async function runMockLayer2Classifier(
  text: string,
  hiddenTextDetected: boolean
): Promise<Layer2ClassifierResult> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const lowerText = text.toLowerCase();
  const matchedKeywords = INJECTION_KEYWORDS.filter(kw => lowerText.includes(kw));
  const containsExplicitInjection = matchedKeywords.length > 0;

  if (containsExplicitInjection) {
    return {
      classification: 'High Risk',
      confidence: 0.94,
      isInjection: true,
      riskCategory: 'Prompt Injection',
      matchedSignatures: matchedKeywords,
    };
  }

  return {
    classification: 'Safe',
    confidence: 0.98,
    isInjection: false,
    riskCategory: 'None',
    matchedSignatures: [],
  };
}

export async function runMockLayer3SecurityLLM(
  text: string,
  layer1Result: any,
  layer2Result: Layer2ClassifierResult
): Promise<Layer3LLMAnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (layer2Result.isInjection) {
    return {
      isMalicious: true,
      confidence: 0.97,
      aiExplanation:
        'Sənədin daxilində insan gözü ilə görünməyən və AI modelinin davranışını dəyişdirməyə yönəlmiş zərərli komandalar təsbit edildi.',
      recommendedAction:
        'Faylı dərhal karantinə alın, AI agentlərinə ötürülməsini bloklayın və şəbəkə administratoruna bildiriş göndərin.',
      mitigationSteps: [
        'Sənəddən vizual olmayan bütün daxili mətn qatlarını (text layer) silin.',
        'PDF sənədini təhlükəsiz OCR sanitizer ilə yenidən render edin.',
        'Sistem daxilində LLM Prompt Guard qaydalarını yeniləyin.',
      ],
    };
  }

  return {
    isMalicious: false,
    confidence: 0.99,
    aiExplanation:
      'Sənəd hərtərəfli analiz edildi. Hər hansı şübhəli kod, gizli prompt və ya manipulyasiya əlaməti aşkar edilmədi.',
    recommendedAction: 'Sənəd təhlükəsizdir, sistemlərə ötürülməsinə icazə verilir.',
    mitigationSteps: [],
  };
}
