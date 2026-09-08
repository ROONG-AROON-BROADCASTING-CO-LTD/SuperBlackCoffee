export type FranchiseSession = {
  user: { id: number; name?: string; role: string; plan?: 'S' | 'M' | 'L' };
};

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

async function requestSession(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    credentials: 'include',
    ...options,
  });
  const body = await response.json();
  if (!response.ok || !body.success)
    throw new Error(body.message ?? 'ไม่สามารถตรวจสอบเซสชันได้');
  return body.data as FranchiseSession;
}

export async function login(username: string, password: string) {
  return requestSession('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export const restoreSession = () =>
  requestSession('/auth/session', {
    headers: { 'X-SBC-Session-Role': 'franchise_owner' },
  });
export const logout = () =>
  requestSession('/auth/logout', {
    method: 'POST',
    headers: { 'X-SBC-Session-Role': 'franchise_owner' },
  });
