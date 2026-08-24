import { Request, Response } from 'express';
import { getAgentActionsList, getInterventionsList, updateActionDecision } from './security.service.js';
import { AppError } from '../../errors/AppError.js';

export async function listAgentActions(req: Request, res: Response) {
  const actions = await getAgentActionsList();
  res.json({ actions });
}

export async function listInterventions(req: Request, res: Response) {
  const interventions = await getInterventionsList();
  res.json({ interventions });
}

export async function updateDecision(req: Request, res: Response) {
  const actionId = String(req.params.id);
  const { decision } = req.body;

  if (!['ALLOWED', 'BLOCKED', 'REQUIRES_CONFIRMATION'].includes(decision)) {
    throw new AppError('Yolverilməz qərar statusu', 400);
  }

  const updated = await updateActionDecision(actionId, decision);
  if (!updated) {
    throw new AppError('Təhlükəsizlik əməliyyatı tapılmadı', 404);
  }

  res.json({ success: true, action: updated });
}
