import { Request, Response } from 'express';
import {
  getActiveModel,
  getAllModels,
  changeActiveModelVersion,
  triggerModelTraining,
  AllModelsQueryFilters,
} from '../analysis/fastapi.service.js';
import { AppError } from '../../errors/AppError.js';

/**
 * 1. GET /api/admin/models/active -> Direct proxy to FastAPI GET /model/active
 */
export async function getActiveModelController(req: Request, res: Response) {
  const result = await getActiveModel();
  if (!result) {
    throw new AppError('FastAPI ML mikroservisinə qoşulmaq və ya aktiv modeli almaq mümkün olmadı.', 503);
  }
  res.json(result);
}

/**
 * 2. GET /api/admin/models/all-models -> Direct proxy to FastAPI GET /model/all-models
 */
export async function getAllModelsController(req: Request, res: Response) {
  const filters: AllModelsQueryFilters = {
    version: req.query.version as string,
    version_min: req.query.version_min as string,
    version_max: req.query.version_max as string,
    min_accuracy: req.query.min_accuracy ? parseFloat(req.query.min_accuracy as string) : undefined,
    max_accuracy: req.query.max_accuracy ? parseFloat(req.query.max_accuracy as string) : undefined,
    min_date: req.query.min_date as string,
    max_date: req.query.max_date as string,
    status: req.query.status as string,
  };

  const result = await getAllModels(filters);
  if (!result) {
    throw new AppError('FastAPI ML mikroservisinə qoşulmaq və ya modellər siyahısını almaq mümkün olmadı.', 503);
  }
  res.json(result);
}

/**
 * 3. POST /api/admin/models/change-version/:version_id -> Direct proxy to FastAPI POST /model/change-version/{version_id}
 */
export async function changeModelVersionController(req: Request, res: Response) {
  const versionId = req.params.version_id || req.body.version_id || req.body.version;
  if (!versionId) {
    throw new AppError('Model versiyası (version_id) mütləq təyin edilməlidir.', 400);
  }

  const result = await changeActiveModelVersion(versionId);
  if (!result) {
    throw new AppError(`Model versiyasını (${versionId}) aktivləşdirmək mümkün olmadı və ya model tapılmadı.`, 400);
  }
  res.json(result);
}

/**
 * 4. POST /api/admin/models/train -> Direct proxy to FastAPI POST /train
 */
export async function trainModelController(req: Request, res: Response) {
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
