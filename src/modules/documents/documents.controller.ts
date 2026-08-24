import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  processAndSaveDocument,
  getUserDocuments,
  getDocumentById,
  deleteDocumentRecord,
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
    status: result.analysis.status,
    layer1_ocrTextMatch: result.analysis.layer1_ocrTextMatch,
    layer2_classification: result.analysis.layer2_classification,
    layer3_llmAnalysis: result.analysis.layer3_llmAnalysis,
    overallRiskScore: result.analysis.overallRiskScore,
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

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  await deleteDocumentRecord(docId);
  res.json({ success: true, message: 'Sənəd uğurla silindi' });
}
