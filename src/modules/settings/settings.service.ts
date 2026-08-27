import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { PlatformSettings } from './settings.schema.js';

let memorySettings: PlatformSettings = {
  confidenceThreshold: 0.85,
  enableOcrComparison: true,
  enableLlmReview: true,
  autoBlockHighRisk: true,
  notificationEmail: 'security@myguard.az',
  language: 'az',
  maxUploadSizeBytes: 10485760, // 10MB
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (isFirebaseInitialized && db) {
    try {
      const doc = await db.collection('settings').doc('global').get();
      if (doc.exists) {
        memorySettings = { ...memorySettings, ...(doc.data() as PlatformSettings) };
      }
    } catch (err) {
      console.warn('[Settings Service] Firestore get settings error:', err);
    }
  }

  return memorySettings;
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  memorySettings = { ...memorySettings, ...patch };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('settings').doc('global').set(memorySettings, { merge: true });
    } catch (err) {
      console.warn('[Settings Service] Firestore update settings error:', err);
    }
  }

  return memorySettings;
}
