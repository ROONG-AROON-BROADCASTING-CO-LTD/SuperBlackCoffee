import { publicRequest, secured } from './client';

export type AuthSession = {
  user: { id: number; name?: string; role: string };
};
export const login = (username: string, password: string) =>
  publicRequest<AuthSession>('/auth/login', {
    method: 'POST',
    data: { username, password },
  });

export const restoreSession = () =>
  secured<AuthSession>('/auth/session', {
    headers: { 'X-SBC-Session-Role': 'admin' },
  });
export const logout = () =>
  publicRequest<void>('/auth/logout', {
    method: 'POST',
    headers: { 'X-SBC-Session-Role': 'admin' },
  });
