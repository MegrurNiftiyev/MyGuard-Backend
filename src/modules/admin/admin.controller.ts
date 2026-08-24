import { Request, Response } from 'express';
import { getModelVersions, createModelVersion } from './admin.service.js';

export async function listModels(req: Request, res: Response) {
  const models = await getModelVersions();
  res.json({ models });
}

export async function addModel(req: Request, res: Response) {
  const { name, version, type } = req.body;
  const model = await createModelVersion(name, version, type);
  res.json({ success: true, model });
}
