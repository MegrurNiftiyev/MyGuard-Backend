import { env } from '../../config/env.js';

export interface ClassifyRequestPayload {
  documentId: string;
  text: string;
  ocrText?: string | null;
  hiddenText?: string | null;
  language?: string;
}

export interface ClassifyResponseData {
  label: 'safe' | 'suspicious' | 'injection';
  confidence: number;
  categories: string[];
}

export interface TrainingJobResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  resultVersion?: string;
  metrics?: {
    f1: number;
    precision: number;
    recall: number;
    accuracy: number;
  };
}

/**
 * Classify document text via Python FastAPI RETVec + CNN ML service
 */
export async function classifyDocumentText(
  payload: ClassifyRequestPayload
): Promise<ClassifyResponseData | null> {
  const url = `${env.FASTAPI_ANALYSIS_URL}/classify`;
  console.log(`[FastAPI Service] Sending classification request to ${url} for doc: ${payload.documentId}`);

  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN,
          'Accept-Language': payload.language || 'az',
        },
        body: JSON.stringify({
          documentId: payload.documentId,
          text: payload.text || 'Empty document text',
          ocrText: payload.ocrText || null,
          hiddenText: payload.hiddenText || null,
          language: payload.language || 'en',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[FastAPI Service] Classification returned status ${response.status}: ${errorText}`);
        if (response.status >= 500 && attempt < maxRetries) {
            console.log(`[FastAPI Service] Retrying... (${attempt + 1}/${maxRetries})`);
            continue;
        }
        return null;
      }

      const data = (await response.json()) as ClassifyResponseData;
      console.log(`[FastAPI Service] Classification result for ${payload.documentId}: label=${data.label}, confidence=${data.confidence}`);
      return data;
    } catch (err: any) {
      console.warn(`[FastAPI Service] Connection failed to ${url} (Attempt ${attempt + 1}/${maxRetries + 1}): ${err?.message || err}`);
      if (attempt < maxRetries) {
         // Wait before retry
         await new Promise(resolve => setTimeout(resolve, 2000));
         continue;
      }
      console.error(`[FastAPI Service] All attempts failed to connect to ${url}.`);
      return null;
    }
  }
  return null;
}

/**
 * Trigger asynchronous model training in FastAPI ML microservice
 */
export async function triggerModelTraining(): Promise<TrainingJobResponse | null> {
  const url = `${env.FASTAPI_ANALYSIS_URL}/train`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as TrainingJobResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Trigger training failed:', err);
    return null;
  }
}

/**
 * Check training job status in FastAPI ML microservice
 */
export async function getTrainingJobStatus(jobId: string): Promise<TrainingJobResponse | null> {
  const url = `${env.FASTAPI_ANALYSIS_URL}/train/status/${jobId}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as TrainingJobResponse;
  } catch (err) {
    console.warn('[FastAPI Service] Get job status failed:', err);
    return null;
  }
}

/**
 * Liveness health probe check
 */
export async function checkFastApiHealth(): Promise<boolean> {
  const url = `${env.FASTAPI_ANALYSIS_URL}/health`;
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
