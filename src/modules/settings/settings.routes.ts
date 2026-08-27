import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getSettings, updateSettings } from './settings.controller.js';

const router = Router();

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Retrieve platform security settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *   put:
 *     summary: Update platform security settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 */
router.get('/', catchAsync(getSettings));
router.put('/', catchAsync(updateSettings));

export default router;
