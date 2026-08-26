import { Request, Response } from 'express';
import { getModelVersions } from './admin.service.js';

export async function listModels(req: Request, res: Response) {
  const models = await getModelVersions();
  res.json({ models });
}

