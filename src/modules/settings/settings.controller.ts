import { Request, Response } from 'express';
import { getPlatformSettings, updatePlatformSettings } from './settings.service.js';

export async function getSettings(req: Request, res: Response) {
  const settings = await getPlatformSettings();
  res.json({ settings });
}

export async function updateSettings(req: Request, res: Response) {
  const settings = await updatePlatformSettings(req.body);
  res.json({ success: true, settings });
}
