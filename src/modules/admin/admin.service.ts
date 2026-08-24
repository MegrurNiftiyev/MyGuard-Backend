import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { ModelConfig, AgentAction } from './admin.schema.js';

const defaultModels: ModelConfig[] = [
  {
    id: 'mod-1',
    name: 'STANDARD AI (Cloud Enterprise)',
    mode: 'STANDARD AI',
    status: 'Active',
    isLocal: false,
    lastUpdate: 'Bugün 12:00',
    provider: 'Cloud High-Performance LLM',
    description: 'Aşağı və orta həssaslıqlı sənədlər üçün yüksək sürətli xarici bulud modeli.',
    latency: '140ms',
    maxContext: '128k tokens',
  },
  {
    id: 'mod-2',
    name: 'CONFIDENTIAL AI (On-Premise Defense)',
    mode: 'CONFIDENTIAL AI',
    status: 'Active',
    isLocal: true,
    lastUpdate: 'Bugün 09:30',
    provider: 'Local Air-Gapped Model',
    description: 'Yüksək məxfiliyə malik və daxili müdafiə sənədləri üçün lokal serverdə çalışan izolyasiya olunmuş AI modeli.',
    latency: '220ms',
    maxContext: '64k tokens',
  },
];

const defaultAgentActions: AgentAction[] = [
  {
    id: 'act-101',
    action: 'Send document by email',
    file: 'internal_salary_report.pdf',
    destination: 'external@gmail.com',
    sensitivity: 'Critical',
    decision: 'BLOCKED',
    timestamp: '14:28:10',
    reason: 'Kritik məfili olan daxili əməkhaqqı hesabatının xarici gmail ünvanına göndərilməsi avtomatik bloka alındı.',
  },
  {
    id: 'act-102',
    action: 'Upload confidential file',
    file: 'Defense_Strategy_2026.docx',
    destination: 'External cloud server (api.untrusted.com)',
    sensitivity: 'Critical',
    decision: 'BLOCKED',
    timestamp: '13:15:44',
    reason: 'İzolyasiya olunmuş konfidensial faylın xarici serverə yüklənməsi cəhdi dayandırıldı.',
  },
  {
    id: 'act-103',
    action: 'Query Knowledge Base',
    file: 'Public_HR_Policy_2025.pdf',
    destination: 'Internal Vector Database',
    sensitivity: 'Low',
    decision: 'ALLOWED',
    timestamp: '11:40:02',
    reason: 'İctimai HR qaydalarının daxili bazada sorğulanması təhlükəsiz hesab edildi.',
  },
];

export async function getModelVersions(): Promise<ModelConfig[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection(COLLECTIONS.MODEL_VERSIONS).get();
      if (!snapshot.empty) {
        const models: ModelConfig[] = [];
        snapshot.forEach((doc: any) => models.push(doc.data() as ModelConfig));
        return models;
      }
    } catch (err) {
      console.warn('[Admin Service] Firestore get models error:', err);
    }
  }

  return defaultModels;
}

export async function getAgentActions(): Promise<AgentAction[]> {
  return defaultAgentActions;
}

export async function createModelVersion(name: string, provider: string, mode: any): Promise<ModelConfig> {
  const modelId = 'mod-' + Date.now();
  const newModel: ModelConfig = {
    id: modelId,
    name,
    mode: mode || 'STANDARD AI',
    status: 'Active',
    isLocal: false,
    lastUpdate: 'İndi',
    provider: provider || 'Custom LLM Provider',
    description: 'Yenilənmiş təhlükəsizlik modeli',
    latency: '150ms',
    maxContext: '128k tokens',
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.MODEL_VERSIONS).doc(modelId).set(newModel);
    } catch (err) {
      console.warn('[Admin Service] Firestore set model error:', err);
    }
  }

  return newModel;
}
