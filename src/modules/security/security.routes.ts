import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { listAgentActions, listInterventions, updateDecision } from './security.controller.js';

const router = Router();

/**
 * @openapi
 * /api/security/actions:
 *   get:
 *     summary: List all monitored automated AI agent actions and security decisions
 *     tags: [Security Actions]
 *     security:
 *       - BearerAuth: []
 */
router.get('/actions', catchAsync(listAgentActions));

/**
 * @openapi
 * /api/security/interventions:
 *   get:
 *     summary: List blocked and allowed interventions
 *     tags: [Security Actions]
 *     security:
 *       - BearerAuth: []
 */
router.get('/interventions', catchAsync(listInterventions));

/**
 * @openapi
 * /api/security/actions/{id}/decision:
 *   patch:
 *     summary: Override or update action decision (ALLOWED / BLOCKED)
 *     tags: [Security Actions]
 *     security:
 *       - BearerAuth: []
 */
router.patch('/actions/:id/decision', catchAsync(updateDecision));

export default router;
