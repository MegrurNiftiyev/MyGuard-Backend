import { Request, Response } from 'express';
import { getModelVersions, createModelVersion } from './admin.service.js';

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

