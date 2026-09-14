import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@stackbuild/types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export type { ApiEnvelope } from '@stackbuild/types';

function messageFrom(error: unknown) {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error))
    return error.response?.data?.message ?? 'ไม่สามารถเชื่อมต่อระบบได้';
  if (error instanceof SyntaxError && /JSON/i.test(error.message))
    return 'ข้อมูลจากระบบไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง';
  return error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อระบบได้';
}

export async function publicRequest<T>(
  path: string,
  options: AxiosRequestConfig = {},
): Promise<T> {
  try {
    const response = await apiClient.request<ApiEnvelope<T>>({
      url: path,
      ...options,
    });
    if (!response.data.success)
      throw new Error(response.data.message ?? 'ไม่สามารถเชื่อมต่อระบบได้');
    return response.data.data;
  } catch (error) {
    throw new Error(messageFrom(error));
  }
}

export async function secured<T>(
  path: string,
  options: AxiosRequestConfig = {},
): Promise<T> {
  try {
    const response = await apiClient.request<ApiEnvelope<T>>({
      url: path,
      ...options,
    });
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

export async function downloadSecuredPDF(path: string, filename: string) {
  try {
    const response = await apiClient.get(path, { responseType: 'blob' });
    if (response.data.type && !response.data.type.includes('pdf')) {
      const body = await response.data.text();
      try {
        const parsed = JSON.parse(body) as ApiEnvelope<unknown>;
        throw new Error(parsed.message ?? 'ไม่สามารถสร้างไฟล์ PDF ได้');
      } catch (error) {
        if (error instanceof Error && error.message !== body) throw error;
        throw new Error('ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    }
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Keep the object URL alive until the browser has started its download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const body = await error.response.data.text();
      try {
        const parsed = JSON.parse(body) as ApiEnvelope<unknown>;
        throw new Error(parsed.message ?? 'ไม่สามารถสร้างไฟล์ PDF ได้');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== body)
          throw parseError;
      }
    }
    throw new Error(messageFrom(error));
  }
}
