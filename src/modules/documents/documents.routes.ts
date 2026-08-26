import { Router } from 'express';
import { upload } from '../../middlewares/upload.js';
import { catchAsync } from '../../utils/catchAsync.js';
import {
  uploadDocument,
  listDocuments,
  getDocumentDetails,
  getDocumentComparison,
  deleteDocument,
  cleanInjection,
  labelByUser,
} from './documents.controller.js';

const router = Router();

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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.get('/:id', catchAsync(getDocumentDetails));


/**
 * @openapi
 * /api/documents/{id}/comparison:
 *   get:
 *     summary: Get side-by-side OCR vs PDF text comparison and diffs
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.get('/:id/comparison', catchAsync(getDocumentComparison));

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
 * /api/documents/{id}/clean-injection:
 *   post:
 *     summary: Clean injected prompts from a document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.post('/:id/clean-injection', catchAsync(cleanInjection));

/**
 * @openapi
 * /api/documents/{id}/label-by-user:
 *   patch:
 *     summary: User overrides or confirms if the document contains injection
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isContainInjection]
 *             properties:
 *               isContainInjection:
 *                 type: boolean
 */
router.patch('/:id/label-by-user', catchAsync(labelByUser));

/**
 * @openapi
 * /api/documents/{id}:
 *   delete:
 *     summary: Delete a document and its security analysis record
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 */
router.delete('/:id', catchAsync(deleteDocument));

export default router;
