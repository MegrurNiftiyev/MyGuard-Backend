import { env } from '../../config/env.js';

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
