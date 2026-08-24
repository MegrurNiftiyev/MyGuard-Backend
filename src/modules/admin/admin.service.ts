import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { ModelVersion } from './admin.schema.js';

const defaultModels: ModelVersion[] = [
  {
    id: 'model-v1',
    name: 'MyGuard Prompt Injection Classifier v1.2',
    version: '1.2.0',
    type: 'classifier',
    status: 'active',
    accuracy: '96.4%',
    deployedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'model-ocr-v2',
    name: 'MyGuard PDF/OCR Sanitizer Engine',
    version: '2.0.1',
    type: 'ocr_sanitizer',
    status: 'active',
    accuracy: '98.1%',
    deployedAt: '2026-08-20T14:30:00Z',
  },
];

export async function getModelVersions(): Promise<ModelVersion[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection(COLLECTIONS.MODEL_VERSIONS).get();
      if (!snapshot.empty) {
        const models: ModelVersion[] = [];
        snapshot.forEach((doc: any) => models.push(doc.data() as ModelVersion));
        return models;
      }
    } catch (err) {
      console.warn('[Admin Service] Firestore get models error:', err);
    }
  }

  return defaultModels;
}

export async function createModelVersion(name: string, version: string, type: string): Promise<ModelVersion> {
  const modelId = 'model-' + Date.now();
  const newModel: ModelVersion = {
    id: modelId,
    name,
    version,
    type,
    status: 'active',
    accuracy: '97.5%',
    deployedAt: new Date().toISOString(),
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
