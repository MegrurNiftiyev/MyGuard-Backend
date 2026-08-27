export interface PlatformSettings {
  confidenceThreshold: number;
  enableOcrComparison: boolean;
  enableLlmReview: boolean;
  autoBlockHighRisk: boolean;
  notificationEmail: string;
  language: 'az' | 'en' | 'ru' | 'tr';
  maxUploadSizeBytes: number;
}
