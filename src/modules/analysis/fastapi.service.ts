import { env } from '../../config/env.js';

export interface ClassifyRequestPayload {
  documentId: string;
  fullText: string;
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
  const baseUrl = env.FASTAPI_ANALYSIS_URL.replace(/\/+$/, '');
  const primaryUrl = `${baseUrl}/analyze-injection`;
  const fallbackUrl = `${baseUrl}/classify`;

  console.log(`[FastAPI Service] Sending classification request for doc: ${payload.documentId}`);

  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const url = attempt === 0 ? primaryUrl : fallbackUrl;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({
          documentId: payload.documentId,
          fullText: payload.fullText || '',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 503) {
        const errorText = await response.text().catch(() => '');
        if (errorText.includes('insufficient_text')) {
          console.warn(`[FastAPI Service] Document ${payload.documentId} has under 5 words. Returning safe classification.`);
          return { label: 'safe', confidence: 1.0, categories: [] };
        }
        console.warn(`[FastAPI Service] ML model unavailable (503): ${errorText}`);
        return null;
      }

      if (response.status === 404 && attempt === 0) {
        console.log(`[FastAPI Service] ${primaryUrl} returned 404, falling back to ${fallbackUrl}...`);
        continue;
      }

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
      return {
        label: data.label,
        confidence: data.confidence,
        categories: data.categories || [],
      };
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
