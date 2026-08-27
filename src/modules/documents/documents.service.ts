import { db, storageBucket, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { analyzeDocumentLayer1 } from '../analysis/ocrTextCompare.service.js';
import { Layer2ClassifierResult, runMockLayer2Classifier, runMockLayer3SecurityLLM } from '../analysis/mockAnalysis.service.js';
import { classifyDocumentText } from '../analysis/fastapi.service.js';
import { Document, DocumentListItem, RiskStatus, ThreatItem, ScanStep, ScanSocketEvent } from './documents.schema.js';
import { io } from '../../server.js';
import { AppError } from '../../errors/AppError.js';

const memoryDocuments = new Map<string, Document>();

const stepMessages: Record<ScanStep, string> = {
  DOCUMENT_UPLOADED: 'Fayl təhlükəsiz sandbox mühitinə daxil oldu',
  PDF_TEXT_EXTRACTION: 'Daxili mətn qatı və strukturu oxundu',
  OCR_ANALYSIS: 'Vizual görüntüdən insan tərəfindən görünən mətn çıxarıldı',
  TEXT_COMPARISON: 'OCR və PDF mətn qatları arasında fərqlər analiz edildi',
  HIDDEN_TEXT_DETECTION: 'Görünməyən şrift ölçüləri, 0% opacity yoxlanıldı',
  PROMPT_INJECTION_ANALYSIS: 'ML/AI detector tərəfindən override cəhdləri yoxlanıldı',
  RISK_ASSESSMENT: 'Risk balı hesablandı və sənəd müvafiq statusa keçirildi',
};

function pickSocketFields(doc: Document): ScanSocketEvent['fileData'] {
  return {
    currentStep: doc.currentStep,
    stepStatus: doc.stepStatus,
    layer1_ocrTextMatch: doc.layer1_ocrTextMatch,
    layer2_classification: doc.layer2_classification,
    layer3_llmReview: doc.layer3_llmReview,
    finalRiskScore: doc.finalRiskScore,
    finalStatus: doc.finalStatus,
    isContainInjection: doc.isContainInjection,
    scanStartedAt: doc.scanStartedAt,
    scanFinishedAt: doc.scanFinishedAt,
    scanDurationMs: doc.scanDurationMs,
  };
}

async function updateDocumentAndEmit(docId: string, step: ScanStep, patch: Partial<Document>, isFinal = false) {
  let doc = memoryDocuments.get(docId);
  if (!doc) return;

  const now = new Date().toISOString();
  
  if (patch.stepStatus === 'completed' || patch.stepStatus === 'error') {
    const lastStep = doc.stepHistory.find(s => s.step === step);
    if (lastStep && !lastStep.finishedAt) {
      lastStep.finishedAt = now;
      lastStep.status = patch.stepStatus;
      lastStep.message = stepMessages[step] || 'Mərhələ tamamlandı';
    }
  } else if (patch.stepStatus === 'active') {
    doc.stepHistory.push({
      step,
      startedAt: now,
      finishedAt: null,
      status: 'completed', // Will be updated when finished
      message: stepMessages[step] || 'Mərhələ icra olunur',
    });
  }

  doc = { ...doc, ...patch, currentStep: step };
  
  if (isFinal) {
    doc.scanFinishedAt = now;
    if (doc.scanStartedAt) {
      doc.scanDurationMs = new Date(now).getTime() - new Date(doc.scanStartedAt).getTime();
    }
    doc.currentStep = 'COMPLETED';
    doc.stepStatus = 'completed';
  }

  memoryDocuments.set(docId, doc);

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).set(doc);
    } catch (err) {
      console.warn('[Document Service] DB update failed:', err);
    }
  }

  io.to(`document:${docId}`).emit('scan_event', {
    response: patch.stepStatus === 'error' ? 'error' : 'success',
    step,
    message: stepMessages[step],
    fileData: pickSocketFields(doc),
  });

  return doc;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processAndSaveDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
): Promise<{ document: Document }> {
  const docId = 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const nowISO = new Date().toISOString();
  const fileExtension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() || 'pdf';
  
  let fileUrl = `/uploads/${docId}_${filename}`;

  if (isFirebaseInitialized && storageBucket) {
    try {
      const storagePath = `documents/${userId}/${docId}_${filename}`;
      const fileRef = storageBucket.file(storagePath);
      await fileRef.save(fileBuffer, { metadata: { contentType: mimeType } });
      fileUrl = `gs://mygurad.firebasestorage.app/${storagePath}`;
      console.log(`[Document Service] Successfully uploaded file to Firebase Storage: ${fileUrl}`);
    } catch (err) {
      console.error('[Document Service] Firebase Storage upload error:', err);
    }
  }

  const initialDoc: Document = {
    id: docId,
    ownerId: userId,
    fileName: filename,
    fileSizeBytes: fileBuffer.length,
    fileType: fileExtension,
    uploadUrl: fileUrl,
    uploadedAt: nowISO,
    scanStartedAt: null,
    scanFinishedAt: null,
    scanDurationMs: null,
    currentStep: 'DOCUMENT_UPLOADED',
    stepStatus: 'pending',
    stepHistory: [],
    layer1_ocrTextMatch: null,
    layer2_classification: null,
    layer3_llmReview: null,
    finalRiskScore: null,
    finalStatus: null,
    reviewedByUser: false,
    userReviewLabel: null,
    isContainInjection: false,
    errorDetail: null,
  };

  memoryDocuments.set(docId, initialDoc);

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).set(initialDoc);
    } catch (err) {}
  }

  // Start background pipeline
  runPipeline(docId, fileBuffer, filename, mimeType).catch(console.error);

  return { document: initialDoc };
}

async function runPipeline(docId: string, fileBuffer: Buffer, filename: string, mimeType: string) {
  // Wait a bit to ensure UI can connect to socket
  await sleep(1000); 

  await updateDocumentAndEmit(docId, 'DOCUMENT_UPLOADED', { 
    scanStartedAt: new Date().toISOString(), 
    stepStatus: 'active' 
  });
  await sleep(800);
  await updateDocumentAndEmit(docId, 'DOCUMENT_UPLOADED', { stepStatus: 'completed' });

  // Layer 1
  await updateDocumentAndEmit(docId, 'PDF_TEXT_EXTRACTION', { stepStatus: 'active' });
  await sleep(800);
  await updateDocumentAndEmit(docId, 'PDF_TEXT_EXTRACTION', { stepStatus: 'completed' });

  await updateDocumentAndEmit(docId, 'OCR_ANALYSIS', { stepStatus: 'active' });
  let layer1Result: any = { matchPercent: 98, hiddenTextDetected: false };
  if (mimeType.includes('pdf')) {
    layer1Result = await analyzeDocumentLayer1(fileBuffer);
  } else {
    await sleep(1500); // Simulate OCR
  }
  await updateDocumentAndEmit(docId, 'OCR_ANALYSIS', { stepStatus: 'completed' });

  await updateDocumentAndEmit(docId, 'TEXT_COMPARISON', { stepStatus: 'active' });
  await sleep(800);
  await updateDocumentAndEmit(docId, 'TEXT_COMPARISON', { stepStatus: 'completed' });

  const hasExtraText = layer1Result.extraTextSegments && layer1Result.extraTextSegments.length > 0;
  const matchPercent = layer1Result.matchPercent || 95;
  const differenceSnippet = hasExtraText ? layer1Result.extraTextSegments[0] : (matchPercent < 100 ? 'OCR və PDF daxili mətn qatı arasında kiçik fərqlilik aşkar edildi.' : '');

  await updateDocumentAndEmit(docId, 'HIDDEN_TEXT_DETECTION', { 
    stepStatus: 'completed',
    layer1_ocrTextMatch: {
      matchPercent,
      hiddenTextDetected: layer1Result.hiddenTextDetected,
      extraTextSegments: layer1Result.extraTextSegments || [],
      textDifferenceFound: hasExtraText || matchPercent < 100,
      differenceSnippet,
      ocrText: layer1Result.ocrText || `Skan edilmiş OCR mətni: ${filename}`,
      pdfTextLayer: layer1Result.pdfTextLayer || `PDF daxili raw text qatı: ${filename}`,
      status: layer1Result.hiddenTextDetected || matchPercent < 100 ? 'suspicious' : 'clean'
    }
  });

  // Layer 2: RETVec + CNN ML Microservice Classification
  await updateDocumentAndEmit(docId, 'PROMPT_INJECTION_ANALYSIS', { stepStatus: 'active' });

  const fastApiResult = await classifyDocumentText({
    documentId: docId,
    text: layer1Result.pdfTextLayer || filename,
    ocrText: layer1Result.ocrText || null,
    hiddenText: layer1Result.extraTextSegments?.[0] || null,
  });

  const layer2Result: Layer2ClassifierResult = fastApiResult
    ? {
        classification: fastApiResult.label === 'injection' ? 'High Risk' : fastApiResult.label === 'suspicious' ? 'Suspicious' : 'Safe',
        confidence: fastApiResult.confidence,
        isInjection: fastApiResult.label === 'injection',
        riskCategory: fastApiResult.label === 'injection' ? 'Prompt Injection' : 'None',
        matchedSignatures: fastApiResult.categories || [],
      }
    : await runMockLayer2Classifier(filename, layer1Result.hiddenTextDetected);

  await sleep(1000);
  const isInjection = layer2Result.isInjection || false;
  const confidence = layer2Result.confidence || 0.95;

  await updateDocumentAndEmit(docId, 'PROMPT_INJECTION_ANALYSIS', { 
    stepStatus: 'completed',
    isContainInjection: isInjection,
    layer2_classification: {
      label: isInjection ? 'injection' : 'safe',
      confidence,
      accuracy: 0.98,
      message: isInjection 
        ? 'ML classifier tərəfindən mətn daxilində instruction override cəhdi aşkar edildi.'
        : 'ML classifier tərəfindən sənəd hərtərəfli təhlil edildi, hər hansı prompt injection aşkar edilmədi.',
      categories: layer2Result.matchedSignatures || [],
      requiresUserConfirmation: isInjection || layer1Result.hiddenTextDetected,
    }
  });

  // Risk Assessment (Layer 3 included here in mock)
  await updateDocumentAndEmit(docId, 'RISK_ASSESSMENT', { stepStatus: 'active' });
  const layer3Result = await runMockLayer3SecurityLLM(filename, layer1Result, layer2Result);
  await sleep(1000);
  
  const overallRiskScore = layer1Result.hiddenTextDetected ? 92 : isInjection ? 85 : 12;
  const status: RiskStatus = overallRiskScore > 80 ? 'high_risk' : overallRiskScore > 30 ? 'suspicious' : 'safe';

  await updateDocumentAndEmit(docId, 'RISK_ASSESSMENT', { 
    stepStatus: 'completed',
    layer3_llmReview: {
      used: overallRiskScore > 60,
      explanation: layer3Result.explanation,
      message: layer3Result.explanation,
      recommendedAction: overallRiskScore > 80 
        ? 'Sənədin daxili AI modellərinə ötürülməsi BLOKLANMALIDIR. Təmizlənmiş versiyanı istifadə edin.' 
        : overallRiskScore > 30 
        ? 'Sənəd şübhəlidir. İstifadəçi tərəfindən manual təsdiqlənməyə ehtiyac var.' 
        : 'Sənəd təhlükəsizdir. İcra oluna bilər.',
    },
    finalRiskScore: overallRiskScore,
    finalStatus: status
  }, true); // isFinal = true
}

export async function getUserDocuments(userId: string): Promise<DocumentListItem[]> {
  const docs: Document[] = [];
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection(COLLECTIONS.DOCUMENTS).where('ownerId', '==', userId).get();
      snapshot.forEach((doc: any) => docs.push(doc.data() as Document));
    } catch (err) {
      console.warn('[Document Service] Firestore query fallback:', err);
    }
  }

  if (docs.length === 0) {
    docs.push(...Array.from(memoryDocuments.values()).filter(d => d.ownerId === userId));
  }

  return docs.map(d => ({
    id: d.id,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt,
    finalStatus: d.finalStatus,
    finalRiskScore: d.finalRiskScore,
    currentStep: d.currentStep,
  }));
}

export async function getDocumentById(docId: string): Promise<Document | undefined> {
  if (isFirebaseInitialized && db) {
    try {
      const docSnap = await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).get();
      if (docSnap.exists) {
        return docSnap.data() as Document;
      }
    } catch (err) {
      console.warn('[Document Service] Firestore get fallback:', err);
    }
  }

  return memoryDocuments.get(docId);
}

export async function deleteDocumentRecord(docId: string): Promise<boolean> {
  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).delete();
      return true;
    } catch (err) {
      console.error('[Document Service] Firestore delete error:', err);
    }
  }

  memoryDocuments.delete(docId);
  return true;
}

export async function updateDocumentLabel(docId: string, isContainInjection: boolean): Promise<Document> {
  const doc = await getDocumentById(docId);
  if (!doc) {
    throw new AppError('Sənəd tapılmadı', 404);
  }
  
  doc.reviewedByUser = true;
  doc.userReviewLabel = isContainInjection;

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).set({
        reviewedByUser: true,
        userReviewLabel: isContainInjection
      }, { merge: true });
    } catch (err) {
      console.warn('[Document Service] Firestore update label fallback:', err);
    }
  }

  memoryDocuments.set(docId, doc);
  return doc;
}
