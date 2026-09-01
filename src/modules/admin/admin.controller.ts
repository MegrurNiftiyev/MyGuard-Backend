import { Request, Response } from 'express';
import { getModelVersions, createModelVersion } from './admin.service.js';
import { triggerModelTraining } from '../analysis/fastapi.service.js';
import { AppError } from '../../errors/AppError.js';

export async function listModels(req: Request, res: Response) {
  const models = await getModelVersions();
  res.json({ models });
}

export async function registerModel(req: Request, res: Response) {
  const { name, provider, mode } = req.body;
  const model = await createModelVersion(
    name || 'New Model Version',
    provider || 'FastAPI RETVec + CNN',
    mode || 'CONFIDENTIAL AI'
  );
  res.status(201).json({ success: true, model });
}

export async function trainModel(req: Request, res: Response) {
  const result = await triggerModelTraining();
  
  if (!result) {
    throw new AppError('Xəta: Model təlimi başladıla bilmədi və ya FastAPI servisinə qoşulmaq mümkün deyil.', 500);
  }

  res.json({
    success: true,
    message: 'Model təlimi uğurla başladıldı.',
    job: result,
  });
}
