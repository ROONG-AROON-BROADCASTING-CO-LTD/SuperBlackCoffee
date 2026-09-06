const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? 'ไม่สามารถเชื่อมต่อระบบได้');
  }
  return payload.data;
}

export const publicRequest = request;

export function secured<T>(
  token: string | undefined,
  path: string,
  options: RequestInit = {},
) {
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}
