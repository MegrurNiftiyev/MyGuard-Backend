import { Router } from 'express';
import { upload } from '../../middlewares/upload.js';
import { catchAsync } from '../../utils/catchAsync.js';
import {
  uploadDocument,
  analyzeDocumentLegacy,
  listDocuments,
  getDocumentDetails,
  getDocumentScanSteps,
  getDocumentPipeline,
  getDocumentComparison,
  deleteDocument,
} from './documents.controller.js';

const router = Router();

/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     summary: Upload and analyze a document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded and security analysis completed
 */
router.post('/upload', upload.single('document'), catchAsync(uploadDocument));

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Legacy analysis endpoint (alias for document upload)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.post('/analyze', upload.single('document'), catchAsync(analyzeDocumentLegacy));

/**
 * @openapi
 * /api/documents:
 *   get:
 *     summary: Get all uploaded documents for the authenticated user
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.get('/', catchAsync(listDocuments));

/**
 * @openapi
 * /api/documents/{id}:
 *   get:
 *     summary: Get details and security analysis for a specific document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id', catchAsync(getDocumentDetails));

/**
 * @openapi
 * /api/documents/{id}/scan-steps:
 *   get:
 *     summary: Get real-time 7-step scan progress for a document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id/scan-steps', catchAsync(getDocumentScanSteps));

/**
 * @openapi
 * /api/documents/{id}/pipeline:
 *   get:
 *     summary: Get Layer 1, Layer 2, Layer 3 pipeline inspection data
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id/pipeline', catchAsync(getDocumentPipeline));

/**
 * @openapi
 * /api/documents/{id}/comparison:
 *   get:
 *     summary: Get side-by-side OCR vs PDF text comparison and diffs
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id/comparison', catchAsync(getDocumentComparison));

/**
 * @openapi
 * /api/documents/{id}:
 *   delete:
 *     summary: Delete a document and its security analysis record
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:id', catchAsync(deleteDocument));

export default router;
