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
 *     responses:
 *       200:
 *         description: List of deployed models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "mod-1"
 *                       name:
 *                         type: string
 *                         example: "STANDARD AI (Cloud Enterprise)"
 *                       mode:
 *                         type: string
 *                         example: "STANDARD AI"
 *                       status:
 *                         type: string
 *                         example: "Active"
 *                       isLocal:
 *                         type: boolean
 *                         example: false
 *                       provider:
 *                         type: string
 *                         example: "Cloud High-Performance LLM"
 *   post:
 *     summary: Change current ML model version
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterModelRequest'
 *     responses:
 *       201:
 *         description: Model registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 model:
 *                   type: object
 * 
 * /api/admin/models/change-version:
 *   post:
 *     summary: Change current ML model version
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterModelRequest'
 *     responses:
 *       200:
 *         description: Model version changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 model:
 *                   type: object
 * 
 * /api/admin/models/train:
 *   post:
 *     summary: Trigger asynchronous model training in FastAPI ML microservice
 *     tags: [Admin & Registry]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrainModelRequest'
 *     responses:
 *       200:
 *         description: Training job triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Model təlimi uğurla başladıldı."
 *                 job:
 *                   type: object
 */
router.get('/models', catchAsync(listModels));
router.post('/models', catchAsync(registerModel));
router.post('/models/change-version', catchAsync(registerModel));
router.post('/models/train', catchAsync(trainModel));

export default router;


