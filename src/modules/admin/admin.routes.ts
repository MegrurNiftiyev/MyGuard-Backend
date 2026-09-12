import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import {
  getActiveModelController,
  getAllModelsController,
  changeModelVersionController,
  trainModelController,
} from './admin.controller.js';

const router = Router();

/**
 * @openapi
 * /api/admin/models/active:
 *   get:
 *     summary: Get active ML model metadata directly from FastAPI ML service
 *     tags: [Admin & Registry]
 *     responses:
 *       200:
 *         description: Currently active model metadata from FastAPI
 * 
 * /api/admin/models/all-models:
 *   get:
 *     summary: List all ML models with optional query filters directly from FastAPI ML service
 *     tags: [Admin & Registry]
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: Exact version string filter (e.g. run-10)
 *       - in: query
 *         name: version_min
 *         schema:
 *           type: string
 *       - in: query
 *         name: version_max
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_accuracy
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_accuracy
 *         schema:
 *           type: number
 *       - in: query
 *         name: min_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: max_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status ('active', 'archived', 'candidate')
 *     responses:
 *       200:
 *         description: List of all models from FastAPI
 * 
 * /api/admin/models/change-version/{version_id}:
 *   post:
 *     summary: Change active ML model version directly via FastAPI ML service
 *     tags: [Admin & Registry]
 *     parameters:
 *       - in: path
 *         name: version_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model version changed successfully via FastAPI
 * 
 * /api/admin/models/train:
 *   post:
 *     summary: Trigger asynchronous model training in FastAPI ML microservice
 *     tags: [Admin & Registry]
 *     responses:
 *       200:
 *         description: Training job triggered successfully
 */

router.get('/models/active', catchAsync(getActiveModelController));
router.get('/models/all-models', catchAsync(getAllModelsController));
router.post('/models/change-version/:version_id', catchAsync(changeModelVersionController));
router.post('/models/change-version', catchAsync(changeModelVersionController));
router.post('/models/train', catchAsync(trainModelController));

export default router;
