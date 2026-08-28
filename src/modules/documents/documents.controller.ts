import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import {
  processAndSaveDocument,
  getUserDocuments,
  getDocumentById,
  deleteDocumentRecord,
  updateDocumentLabel,
} from './documents.service.js';
import { AppError } from '../../errors/AppError.js';

import { parseLanguage } from '../../utils/i18n.js';

export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new AppError('Fayl tapılmadı (No file provided)', 400);
  }

  const userId = req.user?.uid || 'dev-user-123';
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  console.log(`[Document Controller] Processing upload for user ${userId} (lang: ${lang}): ${req.file.originalname}`);

  const result = await processAndSaveDocument(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    userId,
    lang
  );

  res.json({
    success: true,
    document: result.document,
  });
}


export async function listDocuments(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.uid || 'dev-user-123';
  const documents = await getUserDocuments(userId);
  res.json({ documents });
}

export async function getDocumentDetails(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);

  if (!document) {
    throw new AppError('Sənəd tapılmadı', 404);
  }

  res.json(document);
}


export async function getDocumentComparison(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);

  if (!document) {
    throw new AppError('Sənəd tapılmadı', 404);
  }

  res.json({
    documentId: docId,
    documentName: document.fileName,
    ocrText: document.layer1_ocrTextMatch?.ocrText || 'Məlumat yoxdur',
    pdfTextLayer: document.layer1_ocrTextMatch?.pdfTextLayer || 'Məlumat yoxdur',
    ocrPdfMatch: document.layer1_ocrTextMatch?.matchPercent || 100,
    hiddenTextDetected: document.layer1_ocrTextMatch?.hiddenTextDetected || false,
    textDifferenceFound: document.layer1_ocrTextMatch?.textDifferenceFound || false,
    flaggedSnippet: document.layer1_ocrTextMatch?.differenceSnippet || document.layer1_ocrTextMatch?.extraTextSegments?.[0] || '',
    flaggedMetadata: {
      pageNumber: 1,
      visibilityType: 'PDF Layer Only',
      location: 'Text Layer Comparison'
    },
  });
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  await deleteDocumentRecord(docId);
  res.json({ success: true, message: 'Sənəd uğurla silindi' });
}

export async function cleanInjection(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);
  const downloadUrl = document?.uploadUrl || `/api/documents/${docId}/download`;

  res.json({
    success: true,
    message: 'Sənəddəki prompt injection təhdidləri təmizləndi.',
    cleanedDocumentId: docId,
    downloadUrl
  });
}

export async function labelByUser(req: AuthenticatedRequest, res: Response) {
  const docId = String(req.params.id);
  const { isContainInjection } = req.body;

  if (typeof isContainInjection !== 'boolean') {
    throw new AppError('isContainInjection parametri mütləq və boolean tipində olmalıdır', 400);
  }

  const document = await updateDocumentLabel(docId, isContainInjection);

  res.json({
    success: true,
    message: 'Sənədin statusu istifadəçi tərəfindən uğurla yeniləndi.',
    document,
  });
}
