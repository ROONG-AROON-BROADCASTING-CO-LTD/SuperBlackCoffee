const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  headers.set('X-SBC-Session-Role', 'stock');
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    const raw = await response.text();
    let payload: ApiEnvelope<T>;
    try {
      payload = JSON.parse(raw) as ApiEnvelope<T>;
    } catch {
      throw new ApiRequestError(
        response.status === 404
          ? 'ระบบสต๊อกยังไม่พร้อมใช้งาน กรุณาแจ้งผู้ดูแลให้รีสตาร์ต API'
          : 'ระบบตอบกลับผิดรูปแบบ กรุณาลองใหม่อีกครั้ง',
        response.status,
      );
    }
    if (!response.ok || !payload.success)
      throw new ApiRequestError(
        payload.message ?? 'ไม่สามารถเชื่อมต่อระบบได้',
        response.status,
      );
    return payload.data;
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error('ไม่สามารถเชื่อมต่อระบบได้');
    throw error;
  }
}
