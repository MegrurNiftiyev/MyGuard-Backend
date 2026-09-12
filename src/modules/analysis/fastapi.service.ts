import { env } from '../../config/env.js';

export interface ClassifyRequestPayload {
  documentId?: string;
  fullText: string;
}

export interface ClassifyResponseData {
  label: 'safe' | 'suspicious' | 'injection';
  confidence: number;
}

export interface MlApiErrorResponse {
  code: string;
  message: string;
}

export interface ActiveModelMetrics {
  test_acc?: number;
  recall?: number;
  train_loss?: number;
  correct_test?: string;
  [key: string]: any;
}

export interface ActiveModelResponse {
  version: string;
  status: string;
  isCurrentVersion?: boolean;
  metrics?: ActiveModelMetrics;
  description?: string;
  sourceCommit?: string;
  storagePath?: string;
  createdAt?: string;
}

export interface AllModelsQueryFilters {
  version?: string;
  version_min?: string;
  version_max?: string;
  min_accuracy?: number;
  max_accuracy?: number;
  min_date?: string;
  max_date?: string;
  status?: string;
}

export interface AllModelsResponse {
  total: number;
  models: ActiveModelResponse[];
}

export interface ChangeVersionResponse {
  version: string;
  status: string;
}

export interface TrainingJobResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
}

/**
 * Helper to get authorization headers for FastAPI microservice
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN,
  };
}

/**
 * 1. Document Text Injection Analysis — POST /analyze-injection
 * Sends extracted document text to RETVec+CNN ML microservice.
 * Payload strictly enforces no extra fields (documentId, fullText).
 */
export async function classifyDocumentText(
  payload: ClassifyRequestPayload
): Promise<ClassifyResponseData | null> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/analyze-injection`;

  const docId = payload.documentId || 'N/A';
  console.log(`[FastAPI Service] Sending classification request for doc: ${docId}`);

  // Build body with strictly allowed fields only (Pydantic extra: forbid)
  const body: Record<string, any> = {
    fullText: payload.fullText || '',
  };
  if (payload.documentId) {
    body.documentId = payload.documentId;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 503) {
      const errorData = (await response.json().catch(() => null)) as MlApiErrorResponse | null;
      if (errorData?.message === 'insufficient_text') {
        console.warn(`[FastAPI Service] Document ${docId} has under 5 words. Returning safe classification.`);
        return { label: 'safe', confidence: 1.0 };
      }
      console.warn(`[FastAPI Service] ML model unavailable (503): ${errorData?.message || 'Classification model unavailable'}`);
      return null;
    }

    if (response.status === 401) {
      console.error(`[FastAPI Service] 401 Unauthorized: Invalid X-Internal-Token header.`);
      return null;
    }

    if (response.status === 403) {
      console.error(`[FastAPI Service] 403 Forbidden: Client IP banned due to invalid token attempts.`);
      return null;
    }

    if (response.status === 422) {
      const errorData = await response.json().catch(() => null);
      console.error(`[FastAPI Service] 422 Unprocessable Entity:`, errorData);
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[FastAPI Service] Classification returned status ${response.status}: ${errorText}`);
      return null;
    }

    const data = (await response.json()) as ClassifyResponseData;
    console.log(`[FastAPI Service] Classification result for ${docId}: label=${data.label}, confidence=${data.confidence}`);
    return {
      label: data.label,
      confidence: data.confidence,
    };
  } catch (err: any) {
    console.error(`[FastAPI Service] Connection failed to ${url}: ${err?.message || err}`);
    return null;
  }
}

/**
 * 2. Active Model Status — GET /model/active
 */
export async function getActiveModel(): Promise<ActiveModelResponse | null> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/model/active`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) return null;
    return (await response.json()) as ActiveModelResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Get active model failed:', err);
    return null;
  }
}

/**
 * 2.1 List All Models — GET /model/all-models
 */
export async function getAllModels(filters?: AllModelsQueryFilters): Promise<AllModelsResponse | null> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        queryParams.append(key, String(val));
      }
    });
  }

  const queryString = queryParams.toString();
  const url = `${baseUrl}/model/all-models${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) return null;
    return (await response.json()) as AllModelsResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Get all models failed:', err);
    return null;
  }
}

/**
 * 3. Change Active Model Version — POST /model/change-version/{version_id}
 */
export async function changeActiveModelVersion(versionId: string): Promise<ChangeVersionResponse | null> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/model/change-version/${encodeURIComponent(versionId)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) return null;
    return (await response.json()) as ChangeVersionResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Change active model version failed:', err);
    return null;
  }
}

/**
 * 4. Trigger Model Retraining — POST /train
 */
export async function triggerModelTraining(): Promise<TrainingJobResponse | null> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/train`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) return null;
    return (await response.json()) as TrainingJobResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Trigger training failed:', err);
    return null;
  }
}

/**
 * 5. Health Check Probe — GET /health
 */
export async function checkFastApiHealth(): Promise<boolean> {
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/health`;

  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
