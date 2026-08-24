import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  processAndSaveDocument,
  getUserDocuments,
  getDocumentById,
  deleteDocumentRecord,
  getScanStepsForDocument,
  getPipelineForDocument,
} from './documents.service.js';
import { AppError } from '../../errors/AppError.js';

export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new AppError('Fayl tapılmadı (No file provided)', 400);
  }

  const userId = req.user?.uid || 'dev-user-123';
  console.log(`[Document Controller] Processing upload for user ${userId}: ${req.file.originalname}`);

  const result = await processAndSaveDocument(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    userId
  );

  res.json({
    success: true,
    document: result.document,
    analysis: result.analysis,
  });
}

export async function analyzeDocumentLegacy(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new AppError('Fayl tapılmadı', 400);
  }

  const userId = req.user?.uid || 'dev-user-123';
  const result = await processAndSaveDocument(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    userId
  );

  res.json({
    documentId: result.document.id,
    status: result.analysis.riskStatus,
    layer1_ocrTextMatch: {
      matchPercent: result.analysis.ocrPdfMatch,
      hiddenTextDetected: result.analysis.hiddenTextDetected,
    },
    layer2_classification: {
      confidence: result.analysis.promptInjectionProb / 100,
      label: result.analysis.riskStatus === 'safe' ? 'safe' : 'injection',
    },
    layer3_llmAnalysis: {
      explanation: result.analysis.plainExplanation,
    },
    overallRiskScore: result.analysis.riskScore,
  });
}

export async function listDocuments(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.uid || 'dev-user-123';
  const documents = await getUserDocuments(userId);
  res.json({ documents });
}

export async function getDocumentDetails(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const data = await getDocumentById(docId);

  if (!data.document) {
    throw new AppError('Sənəd tapılmadı', 404);
  }

  res.json(data);
}

export async function getDocumentScanSteps(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const steps = await getScanStepsForDocument(docId);
  res.json({ documentId: docId, steps });
}

export async function getDocumentPipeline(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const pipeline = await getPipelineForDocument(docId);
  res.json({ pipeline });
}

export async function getDocumentComparison(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const data = await getDocumentById(docId);

  if (!data.analysis) {
    throw new AppError('Analiz məlumatı tapılmadı', 404);
  }

  res.json({
    documentId: docId,
    documentName: data.analysis.documentName,
    ocrText: data.analysis.ocrText,
    pdfTextLayer: data.analysis.pdfTextLayer,
    ocrPdfMatch: data.analysis.ocrPdfMatch,
    hiddenTextDetected: data.analysis.hiddenTextDetected,
    flaggedSnippet: data.analysis.flaggedSnippet,
    flaggedMetadata: data.analysis.flaggedMetadata,
  });
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  await deleteDocumentRecord(docId);
  res.json({ success: true, message: 'Sənəd uğurla silindi' });
}
