const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !payload.success) {
      throw new ApiRequestError(
        payload.message ?? 'ไม่สามารถเชื่อมต่อระบบได้',
        response.status,
      );
    }
    return payload.data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('ไม่สามารถเชื่อมต่อระบบได้');
    }
    throw error;
  }
}

export const publicRequest = request;

export function secured<T>(path: string, options: RequestInit = {}) {
  return request<T>(path, options);
}

export async function securedBlob(path: string) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!response.ok) {
    let message = 'ไม่สามารถเปิดเอกสารใบลาได้';
    try {
      const payload = (await response.json()) as ApiEnvelope<never>;
      message = payload.message ?? message;
    } catch {
      // Keep the staff-facing error message for non-JSON proxy responses.
    }
    throw new ApiRequestError(message, response.status);
  }
  return response.blob();
}
