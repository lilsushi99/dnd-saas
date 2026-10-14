import { AuthService } from './authService';

export const AUTH_EXPIRED_EVENT = 'nexus:auth-expired';

/**
 * Shared authenticated JSON request. Attaches the session token, surfaces the server's real error message
 * (the previous per-service wrappers read `data.error` only, hiding `message`), and signals the app when a session expires.
 */
export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const token = AuthService.getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (res.status === 401 && token) {
    AuthService.removeToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  if (!res.ok || !data || data.success === false) {
    throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
  }
  return data as T;
}
