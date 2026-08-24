import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { listModels, addModel } from './admin.controller.js';

const router = Router();

/**
 * @openapi
 * /api/admin/models:
 *   get:
 *     summary: List deployed ML models and sanitizer engines
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 */
router.get('/models', catchAsync(listModels));

/**
 * @openapi
 * /api/admin/models:
 *   post:
 *     summary: Register a new ML model version
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 */
router.post('/models', catchAsync(addModel));

export default router;
