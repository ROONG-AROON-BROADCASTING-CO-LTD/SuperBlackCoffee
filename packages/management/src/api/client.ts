import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@stackbuild/types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

type PlatformSessionRole = 'admin' | 'franchise_owner';

let platformSessionRole: PlatformSessionRole | null = null;

// Each app configures its own module instance before rendering protected pages.
// This makes requests deterministic when the browser holds both platform cookies.
export function setManagementSessionRole(role: PlatformSessionRole | null) {
  platformSessionRole = role;
}

function messageFrom(error: unknown) {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error))
    return error.response?.data?.message ?? 'ไม่สามารถเชื่อมต่อระบบได้';
  return error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อระบบได้';
}

export async function secured<T>(
  path: string,
  options: AxiosRequestConfig = {},
): Promise<T> {
  try {
    const response = await apiClient.request<ApiEnvelope<T>>({
      url: path,
      ...options,
      headers: {
        ...options.headers,
        ...(platformSessionRole
          ? { 'X-SBC-Session-Role': platformSessionRole }
          : {}),
      },
    });
    if (response.status === 204) return undefined as T;
    if (!response.data.success)
      throw new Error(response.data.message ?? 'ไม่สามารถเชื่อมต่อระบบได้');
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new Event('sbc:session-expired'));
      throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    throw new Error(messageFrom(error));
  }
}
