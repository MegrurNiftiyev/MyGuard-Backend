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
  explanation: string;
  recommendedAction: string;
  attackVector?: string;
  mitigationSteps: string[];
}

export async function runMockLayer2Classifier(
  text: string,
  hiddenTextDetected: boolean
): Promise<Layer2ClassifierResult> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const lowerText = text.toLowerCase();
  const containsKeywords =
    lowerText.includes('ignore') ||
    lowerText.includes('system prompt') ||
    lowerText.includes('override') ||
    lowerText.includes('developer mode') ||
    lowerText.includes('secret');

  if (hiddenTextDetected || containsKeywords) {
    return {
      classification: 'High Risk',
      confidence: 0.94,
      isInjection: true,
      riskCategory: 'Prompt Injection',
      matchedSignatures: [
        'ignore_previous_instructions',
        'hidden_white_text_overlay',
        'system_override_attempt',
      ],
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

  if (layer2Result.isInjection || layer1Result?.hiddenTextDetected) {
    return {
      isMalicious: true,
      confidence: 0.97,
      explanation:
        'Sənədin daxilində insan gözü ilə görünməyən və AI modelinin davranışını dəyişdirməyə yönəlmiş zərərli komandalar təsbit edildi.',
      recommendedAction:
        'Faylı dərhal karantinə alın, AI agentlərinə ötürülməsini bloklayın və şəbəkə administratoruna bildiriş göndərin.',
      attackVector: 'Indirect Prompt Injection (Steganographic Text Layer)',
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
    explanation:
      'Sənəd hərtərəfli analiz edildi. Hər hansı şübhəli kod, gizli prompt və ya manipulyasiya əlaməti aşkar edilmədi.',
    recommendedAction: 'Sənəd təhlükəsizdir, sistemlərə ötürülməsinə icazə verilir.',
    attackVector: 'N/A',
    mitigationSteps: [],
  };
}
