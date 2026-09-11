import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRiskSummary } from './reports.controller.js';

const router = Router();

/**
 * @openapi
 * /api/reports/risk-summary:
 *   get:
 *     summary: Get overall risk summary, threat trends, and security metrics
 *     tags: [Analytics & Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Risk summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RiskSummary'
 */
router.get('/risk-summary', catchAsync(getRiskSummary));

export default router;

