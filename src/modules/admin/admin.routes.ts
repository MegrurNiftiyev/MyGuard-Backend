import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { listModels, registerModel, trainModel } from './admin.controller.js';

const router = Router();

/**
 * @openapi
 * /api/admin/models:
 *   get:
 *     summary: List deployed ML models and sanitizer engines
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 *   post:
 *     summary: Register or promote new ML model version
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 * 
 * /api/admin/models/train:
 *   post:
 *     summary: Trigger asynchronous model training in FastAPI ML microservice
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 */
router.get('/models', catchAsync(listModels));
router.post('/models', catchAsync(registerModel));
router.post('/models/train', catchAsync(trainModel));

export default router;
