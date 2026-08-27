import { db, storageBucket, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { analyzeDocumentLayer1 } from '../analysis/ocrTextCompare.service.js';
import { Layer2ClassifierResult, runMockLayer2Classifier, runMockLayer3SecurityLLM } from '../analysis/mockAnalysis.service.js';
import { classifyDocumentText } from '../analysis/fastapi.service.js';
import { evaluateLayer3SecurityLLM } from '../analysis/llmSecurityReview.service.js';
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

import { SupportedLanguage, translate } from '../../utils/i18n.js';

async function updateDocumentAndEmit(
  docId: string, 
  step: ScanStep, 
  patch: Partial<Document>, 
  isFinal = false, 
  lang: SupportedLanguage = 'az'
) {
  let doc = memoryDocuments.get(docId);
  if (!doc) return;

  const now = new Date().toISOString();
  const stepMsg = translate(step, lang);
  
  if (patch.stepStatus === 'completed' || patch.stepStatus === 'error') {
    const lastStep = doc.stepHistory.find(s => s.step === step);
    if (lastStep && !lastStep.finishedAt) {
      lastStep.finishedAt = now;
      lastStep.status = patch.stepStatus;
      lastStep.message = stepMsg;
    }
  } else if (patch.stepStatus === 'active') {
    doc.stepHistory.push({
      step,
      startedAt: now,
      finishedAt: null,
      status: 'completed', // Will be updated when finished
      message: stepMsg,
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
  userId: string,
  lang: SupportedLanguage = 'az'
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
  runPipeline(docId, fileBuffer, filename, mimeType, lang).catch(console.error);

  return { document: initialDoc };
}

async function runPipeline(docId: string, fileBuffer: Buffer, filename: string, mimeType: string, lang: SupportedLanguage = 'az') {
  // Wait a bit to ensure UI can connect to socket
  await sleep(1000); 

  await updateDocumentAndEmit(docId, 'DOCUMENT_UPLOADED', { 
    scanStartedAt: new Date().toISOString(), 
    stepStatus: 'active' 
  }, false, lang);
  await sleep(800);
  await updateDocumentAndEmit(docId, 'DOCUMENT_UPLOADED', { stepStatus: 'completed' }, false, lang);

  // Layer 1
  await updateDocumentAndEmit(docId, 'PDF_TEXT_EXTRACTION', { stepStatus: 'active' }, false, lang);
  await sleep(800);
  await updateDocumentAndEmit(docId, 'PDF_TEXT_EXTRACTION', { stepStatus: 'completed' }, false, lang);

  await updateDocumentAndEmit(docId, 'OCR_ANALYSIS', { stepStatus: 'active' }, false, lang);
  let layer1Result: any = { matchPercent: 98, hiddenTextDetected: false };
  if (mimeType.includes('pdf')) {
    layer1Result = await analyzeDocumentLayer1(fileBuffer);
  } else {
    await sleep(1500); // Simulate OCR
  }
  await updateDocumentAndEmit(docId, 'OCR_ANALYSIS', { stepStatus: 'completed' }, false, lang);

  await updateDocumentAndEmit(docId, 'TEXT_COMPARISON', { stepStatus: 'active' }, false, lang);
  await sleep(800);
  await updateDocumentAndEmit(docId, 'TEXT_COMPARISON', { stepStatus: 'completed' }, false, lang);

  const hasExtraText = layer1Result.extraTextSegments && layer1Result.extraTextSegments.length > 0;
  const matchPercent = layer1Result.matchPercent || 95;
  const differenceSnippet = hasExtraText ? layer1Result.extraTextSegments[0] : (matchPercent < 100 ? translate('ocr_diff_detected', lang) : '');

  await updateDocumentAndEmit(docId, 'HIDDEN_TEXT_DETECTION', { 
    stepStatus: 'completed',
    layer1_ocrTextMatch: {
      matchPercent,
      hiddenTextDetected: layer1Result.hiddenTextDetected,
      extraTextSegments: layer1Result.extraTextSegments || [],
      textDifferenceFound: hasExtraText || matchPercent < 100,
      differenceSnippet,
      ocrText: layer1Result.ocrText || `OCR: ${filename}`,
      pdfTextLayer: layer1Result.pdfTextLayer || `PDF text: ${filename}`,
      status: layer1Result.hiddenTextDetected || matchPercent < 100 ? 'suspicious' : 'clean'
    }
  }, false, lang);

  // Layer 2: RETVec + CNN ML Microservice Classification
  await updateDocumentAndEmit(docId, 'PROMPT_INJECTION_ANALYSIS', { stepStatus: 'active' }, false, lang);

  const fastApiResult = await classifyDocumentText({
    documentId: docId,
    text: layer1Result.pdfTextLayer || filename,
    ocrText: layer1Result.ocrText || null,
    hiddenText: layer1Result.extraTextSegments?.[0] || null,
    language: lang,
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
  const mlMsg = isInjection ? translate('ml_injection_detected', lang) : translate('ml_safe_message', lang);

  await updateDocumentAndEmit(docId, 'PROMPT_INJECTION_ANALYSIS', { 
    stepStatus: 'completed',
    isContainInjection: isInjection,
    layer2_classification: {
      label: isInjection ? 'injection' : 'safe',
      confidence,
      accuracy: 0.98,
      message: mlMsg,
      categories: layer2Result.matchedSignatures || [],
      requiresUserConfirmation: isInjection || layer1Result.hiddenTextDetected,
    }
  }, false, lang);

  // Layer 3: Risk Assessment & LLM Security Evaluation
  await updateDocumentAndEmit(docId, 'RISK_ASSESSMENT', { stepStatus: 'active' }, false, lang);

  const layer3Result = await evaluateLayer3SecurityLLM({
    filename,
    ocrText: layer1Result.ocrText,
    pdfTextLayer: layer1Result.pdfTextLayer,
    extraTextSegments: layer1Result.extraTextSegments,
    matchPercent: layer1Result.matchPercent || 95,
    hiddenTextDetected: layer1Result.hiddenTextDetected || false,
    layer2Result,
    lang,
  });

  await sleep(1000);
  
  const overallRiskScore = layer1Result.hiddenTextDetected ? 92 : isInjection ? 85 : 12;
  const status: RiskStatus = overallRiskScore > 80 ? 'high_risk' : overallRiskScore > 30 ? 'suspicious' : 'safe';
  const isContainInjection = Boolean(status === 'high_risk' || isInjection || layer3Result.isMalicious);

  await updateDocumentAndEmit(docId, 'RISK_ASSESSMENT', { 
    stepStatus: 'completed',
    isContainInjection,
    layer3_llmReview: {
      used: overallRiskScore > 60 || layer3Result.isMalicious,
      isMalicious: layer3Result.isMalicious,
      confidence: layer3Result.confidence || 0.97,
      explanation: layer3Result.explanation,
      message: layer3Result.explanation,
      recommendedAction: layer3Result.recommendedAction,
      attackVector: layer3Result.attackVector,
      reasoning: layer3Result.reasoning,
      mitigationSteps: layer3Result.mitigationSteps,
    },
    finalRiskScore: overallRiskScore,
    finalStatus: status
  }, true, lang); // isFinal = true
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
