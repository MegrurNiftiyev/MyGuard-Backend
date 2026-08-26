import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { listModels } from './admin.controller.js';

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



export default router;
