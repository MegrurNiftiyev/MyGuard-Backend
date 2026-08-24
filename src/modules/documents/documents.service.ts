import { db, storageBucket, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { analyzeDocumentLayer1 } from '../analysis/ocrTextCompare.service.js';
import { runMockLayer2Classifier, runMockLayer3SecurityLLM } from '../analysis/mockAnalysis.service.js';
import { DocumentRecord, AnalysisRecord } from './documents.schema.js';

const memoryDocuments = new Map<string, DocumentRecord>();
const memoryAnalyses = new Map<string, AnalysisRecord>();

export async function processAndSaveDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
): Promise<{ document: DocumentRecord; analysis: AnalysisRecord }> {
  const docId = 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  let layer1Result: any = { matchPercent: 100, hiddenTextDetected: false };
  try {
    if (mimeType.includes('pdf')) {
      layer1Result = await analyzeDocumentLayer1(fileBuffer);
    }
  } catch (err) {
    console.warn('[Document Service] Layer 1 PDF analysis fallback:', err);
  }

  const layer2Result = await runMockLayer2Classifier(
    filename,
    layer1Result.hiddenTextDetected
  );

  const layer3Result = await runMockLayer3SecurityLLM(
    filename,
    layer1Result,
    layer2Result
  );

  const overallRiskScore = layer1Result.hiddenTextDetected ? 92 : layer2Result.isInjection ? 85 : 12;
  const riskLevel: DocumentRecord['riskLevel'] =
    overallRiskScore > 80 ? 'Critical' : overallRiskScore > 50 ? 'High' : overallRiskScore > 20 ? 'Medium' : 'Low';
  const status: DocumentRecord['status'] = overallRiskScore > 50 ? 'blocked' : 'completed';

  let fileUrl = `/uploads/${docId}_${filename}`;

  if (isFirebaseInitialized && storageBucket) {
    try {
      const fileRef = storageBucket.file(`documents/${userId}/${docId}_${filename}`);
      await fileRef.save(fileBuffer, { metadata: { contentType: mimeType } });
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });
      fileUrl = signedUrl;
    } catch (err) {
      console.warn('[Document Service] Firebase Storage upload skipped (using default path):', err);
    }
  }

  const documentRecord: DocumentRecord = {
    id: docId,
    userId,
    name: filename,
    sizeBytes: fileBuffer.length,
    mimeType,
    uploadDate: now,
    status,
    riskLevel,
    riskScore: overallRiskScore,
    fileUrl,
  };

  const analysisRecord: AnalysisRecord = {
    documentId: docId,
    analyzedAt: now,
    overallRiskScore,
    status: status === 'blocked' ? 'blocked' : 'safe',
    layer1_ocrTextMatch: layer1Result,
    layer2_classification: layer2Result,
    layer3_llmAnalysis: layer3Result,
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).set(documentRecord);
      await db.collection(COLLECTIONS.DOCUMENT_ANALYSES).doc(docId).set(analysisRecord);
      await db.collection(COLLECTIONS.RISK_ASSESSMENTS).doc(docId).set({
        documentId: docId,
        riskScore: overallRiskScore,
        riskLevel,
        assessedAt: now,
      });
    } catch (err) {
      console.error('[Document Service] Firestore set error:', err);
      memoryDocuments.set(docId, documentRecord);
      memoryAnalyses.set(docId, analysisRecord);
    }
  } else {
    memoryDocuments.set(docId, documentRecord);
    memoryAnalyses.set(docId, analysisRecord);
  }

  return { document: documentRecord, analysis: analysisRecord };
}

export async function getUserDocuments(userId: string): Promise<DocumentRecord[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection(COLLECTIONS.DOCUMENTS).where('userId', '==', userId).get();
      const docs: DocumentRecord[] = [];
      snapshot.forEach((doc: any) => docs.push(doc.data() as DocumentRecord));
      return docs;
    } catch (err) {
      console.warn('[Document Service] Firestore query fallback to memory:', err);
    }
  }

  return Array.from(memoryDocuments.values()).filter((d) => d.userId === userId || userId === 'dev-user-123');
}

export async function getDocumentById(docId: string): Promise<{ document?: DocumentRecord; analysis?: AnalysisRecord }> {
  if (isFirebaseInitialized && db) {
    try {
      const docSnap = await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).get();
      const analysisSnap = await db.collection(COLLECTIONS.DOCUMENT_ANALYSES).doc(docId).get();

      if (docSnap.exists) {
        return {
          document: docSnap.data() as DocumentRecord,
          analysis: analysisSnap.exists ? (analysisSnap.data() as AnalysisRecord) : undefined,
        };
      }
    } catch (err) {
      console.warn('[Document Service] Firestore get fallback to memory:', err);
    }
  }

  return {
    document: memoryDocuments.get(docId),
    analysis: memoryAnalyses.get(docId),
  };
}

export async function deleteDocumentRecord(docId: string): Promise<boolean> {
  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).delete();
      await db.collection(COLLECTIONS.DOCUMENT_ANALYSES).doc(docId).delete();
      await db.collection(COLLECTIONS.RISK_ASSESSMENTS).doc(docId).delete();
      return true;
    } catch (err) {
      console.error('[Document Service] Firestore delete error:', err);
    }
  }

  memoryDocuments.delete(docId);
  memoryAnalyses.delete(docId);
  return true;
}
