import { get, put } from './client';

export interface AiConfigDto {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiCompleteRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export const getAiConfig = (): Promise<AiConfigDto | null> =>
  get<AiConfigDto | null>('/api/ai/config');

export const setAiConfig = (config: AiConfigDto): Promise<void> =>
  put<void>('/api/ai/config', config);

export async function streamComplete(
  request: AiCompleteRequest,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/ai/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}
