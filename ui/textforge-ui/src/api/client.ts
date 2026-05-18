export interface ApiError {
  message: string;
  code?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let error: ApiError;
    try {
      error = (await response.json()) as ApiError;
    } catch {
      error = { message: `HTTP ${response.status} ${response.statusText}` };
    }
    throw error;
  }
  return response.json() as Promise<T>;
}

export const get = <T>(url: string): Promise<T> => request<T>(url);

export const post = <T>(url: string, body: unknown): Promise<T> =>
  request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const put = <T>(url: string, body: unknown): Promise<T> =>
  request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const del = (url: string): Promise<void> =>
  request<void>(url, { method: 'DELETE' });
