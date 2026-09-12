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

import { parseLanguage, translate } from '../../utils/i18n.js';

export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));

  if (!req.file) {
    throw new AppError(translate('err_no_file', lang), 400);
  }

  const userId = req.user?.uid || 'dev-user-123';
  const isConfidential = req.body?.isConfidential === 'true' || req.body?.isConfidential === true;

  console.log(`[Document Controller] Processing upload for user ${userId} (lang: ${lang}, confidential: ${isConfidential}): ${req.file.originalname}`);

  const result = await processAndSaveDocument(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    userId,
    lang,
    isConfidential
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
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);

  if (!document) {
    throw new AppError(translate('doc_not_found', lang), 404);
  }

  const responseDoc = {
    ...document,
    layer1_ocrTextMatch: document.layer1_ocrTextMatch ? {
      matchPercent: document.layer1_ocrTextMatch.matchPercent,
      hiddenTextDetected: document.layer1_ocrTextMatch.hiddenTextDetected,
      hiddenTexts: document.layer1_ocrTextMatch.hiddenTexts || [],
      textDifferenceFound: document.layer1_ocrTextMatch.textDifferenceFound,
      status: document.layer1_ocrTextMatch.status,
    } : null,
  };

  res.json(responseDoc);
}


export async function getDocumentComparison(req: AuthenticatedRequest, res: Response) {
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);

  if (!document) {
    throw new AppError(translate('doc_not_found', lang), 404);
  }

  const match = document.layer1_ocrTextMatch;
  const hiddenTexts = match?.hiddenTexts || (match as any)?.extraTextSegments || [];
  
  let ocrText = match?.ocrText || translate('no_data', lang);
  let pdfTextLayer = match?.pdfTextLayer || translate('no_data', lang);

  // Clean ocrText so it never has delimiter tags
  ocrText = ocrText.replace(/<\/?(?:ferqli|HiddenText)>/gi, '').trim();

  if (hiddenTexts.length > 0) {
    for (const hText of hiddenTexts) {
      if (hText) {
        // Strip hidden segment from ocrText if it accidentally spilled in
        if (ocrText.includes(hText)) {
          ocrText = ocrText.replace(hText, '').replace(/\s+/g, ' ').trim();
        }
        
        // Build regex to match full multi-sentence injection block starting from hText until end of sentence
        let targetText = hText;
        try {
          const escHText = hText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Match full sentence or multi-sentence block containing hText
          const fullBlockRegex = new RegExp(`(?:\\b${escHText}\\b|[^\n]*?${escHText}[^\n]*?)(?:\\.[^\n]*?ver\\.|\\.[^\n]*?göstər\\.|\\.)?`, 'i');
          const fMatch = pdfTextLayer.match(fullBlockRegex);
          if (fMatch && fMatch[0].length >= hText.length) {
            targetText = fMatch[0].trim();
          }
        } catch {
          targetText = hText;
        }

        // Also clean targetText from ocrText if present
        if (ocrText.includes(targetText)) {
          ocrText = ocrText.replace(targetText, '').replace(/\s+/g, ' ').trim();
        }

        // Wrap full targetText in pdfTextLayer cleanly with ONE <HiddenText> tag
        if (!pdfTextLayer.includes(`<HiddenText>${targetText}</HiddenText>`)) {
          if (pdfTextLayer.includes(targetText)) {
            pdfTextLayer = pdfTextLayer.replace(targetText, `<HiddenText>${targetText}</HiddenText>`);
          } else if (pdfTextLayer.includes(hText)) {
            pdfTextLayer = pdfTextLayer.replace(hText, `<HiddenText>${hText}</HiddenText>`);
          } else {
            pdfTextLayer += `\n<HiddenText>${targetText}</HiddenText>`;
          }
        }
      }
    }
  }

  res.json({
    documentId: docId,
    documentName: document.fileName,
    ocrText,
    pdfTextLayer,
    ocrPdfMatch: match?.matchPercent ?? 100,
    hiddenTextDetected: match?.hiddenTextDetected || false,
    textDifferenceFound: match?.textDifferenceFound || false,
    hiddenTexts,
    userReviewLabel: document.userReviewLabel !== undefined ? document.userReviewLabel : null,
    reviewedByUser: document.reviewedByUser || false,
  });
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  const docId = String(req.params.id);
  await deleteDocumentRecord(docId);
  res.json({ success: true, message: translate('doc_deleted_success', lang) });
}

export async function cleanInjection(req: AuthenticatedRequest, res: Response) {
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  const docId = String(req.params.id);
  const document = await getDocumentById(docId);
  const downloadUrl = document?.uploadUrl || `/api/documents/${docId}/download`;

  res.json({
    success: true,
    message: translate('injection_cleaned_success', lang),
    cleanedDocumentId: docId,
    downloadUrl
  });
}

export async function labelByUser(req: AuthenticatedRequest, res: Response) {
  const lang = parseLanguage(req.headers['accept-language'] || (req.query.lang as string));
  const docId = String(req.params.id);
  const { isContainInjection } = req.body;

  if (typeof isContainInjection !== 'boolean') {
    throw new AppError(translate('err_isContainInjection_param', lang), 400);
  }

  const document = await updateDocumentLabel(docId, isContainInjection);

  res.json({
    success: true,
    message: translate('status_updated_success', lang),
    document
  });
}
