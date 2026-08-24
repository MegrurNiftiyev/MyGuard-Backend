import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/index.js';
import { getRiskSummaryReport } from './reports.service.js';

export async function getRiskSummary(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.uid || 'dev-user-123';
  const summary = await getRiskSummaryReport(userId);
  res.json(summary);
}
