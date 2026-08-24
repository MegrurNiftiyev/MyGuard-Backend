import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { env } from './env.js';

let app: App | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storageBucket: any;
let isFirebaseInitialized = false;

try {
  if (getApps().length === 0) {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      app = initializeApp({
        credential: cert(credentials),
        storageBucket: env.FIREBASE_STORAGE_BUCKET || `${credentials.project_id}.appspot.com`,
      });
      isFirebaseInitialized = true;
      console.log('[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT_JSON env var');
    } else if (fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
      });
      isFirebaseInitialized = true;
      console.log(`[Firebase Admin] Initialized via service account file: ${env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
    } else {
      console.warn('[Firebase Admin] Notice: Operating in local memory/mock fallback mode until serviceAccountKey.json is provided.');
    }
  } else {
    app = getApps()[0];
    isFirebaseInitialized = true;
  }

  if (isFirebaseInitialized && app) {
    db = getFirestore(app);
    auth = getAuth(app);
    storageBucket = getStorage(app).bucket();
  }
} catch (error) {
  console.error('[Firebase Admin] Initialization error:', error);
  console.warn('[Firebase Admin] Falling back to memory state for local dev execution.');
}

export { app, db, auth, storageBucket, isFirebaseInitialized };
