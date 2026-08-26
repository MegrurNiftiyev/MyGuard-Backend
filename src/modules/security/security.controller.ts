import { Request, Response } from 'express';
import { getAgentActionsList, updateActionDecision } from './security.service.js';
import { AppError } from '../../errors/AppError.js';

export async function listAgentActions(req: Request, res: Response) {
  const actions = await getAgentActionsList();
  res.json({ actions });
}

export async function updateDecision(req: Request, res: Response) {
  const actionId = String(req.params.id);
  const { decision } = req.body;

  if (!['ALLOWED', 'BLOCKED'].includes(decision)) {
    throw new AppError('Yolverilməz qərar statusu', 400);
  }

  const updated = await updateActionDecision(actionId, decision);
  if (!updated) {
    throw new AppError('Təhlükəsizlik əməliyyatı tapılmadı', 404);
  }

  res.json({ success: true, action: updated });
}
