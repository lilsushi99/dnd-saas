import { AuthService } from './authService';

export const AUTH_EXPIRED_EVENT = 'nexus:auth-expired';
export const SESSION_TIMEOUT_EVENT = 'nexus:session-timeout';

interface ExtendedRequestInit extends RequestInit {
  _isRetry?: boolean;
}

let lastUserActivity = typeof window !== 'undefined' ? Date.now() : 0;

// Track active user activity to avoid wasteful background polling while sleeping
if (typeof window !== 'undefined') {
  const markActive = () => {
    lastUserActivity = Date.now();
  };
  window.addEventListener('mousemove', markActive, { passive: true });
  window.addEventListener('keydown', markActive, { passive: true });
  window.addEventListener('click', markActive, { passive: true });
  window.addEventListener('scroll', markActive, { passive: true });
  window.addEventListener('touchstart', markActive, { passive: true });
}

let isRenewing = false;
let renewalPromise: Promise<boolean> | null = null;

/**
 * Attempts transparent session renewal for the backend JWT session token.
 */
export async function attemptSessionRenewal(): Promise<boolean> {
  if (renewalPromise) return renewalPromise;

  renewalPromise = (async () => {
    try {
      const token = AuthService.getToken();
      if (!token) return false;

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return false;
      }

      const json = await res.json().catch(() => null);
      if (json && json.success && json.token) {
        AuthService.setToken(json.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      renewalPromise = null;
    }
  })();

  return renewalPromise;
}

/**
 * Proactive background heartbeat: keeps the backend JWT and AI Studio container auth
 * warm every 90 seconds while the user is actively using the application.
 */
if (typeof window !== 'undefined') {
  let lastHeartbeat = Date.now();

  const runHeartbeat = async () => {
    const token = AuthService.getToken();
    if (!token) return;

    // Only ping if user has interacted within the last 15 minutes
    if (Date.now() - lastUserActivity > 15 * 60 * 1000) return;

    try {
      await attemptSessionRenewal();
      lastHeartbeat = Date.now();
    } catch {
      // Fail silently on background heartbeat
    }
  };

  // Heartbeat interval (every 60s to ensure session stays actively warm)
  setInterval(runHeartbeat, 60000);

  // When tab regains focus after being hidden, verify session freshness
  const onFocusOrVisibility = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastHeartbeat > 45000) {
      runHeartbeat();
    }
  };

  window.addEventListener('visibilitychange', onFocusOrVisibility);
  window.addEventListener('focus', onFocusOrVisibility);
}

/**
 * Shared authenticated JSON request with automatic JWT token attachment,
 * container cookie credential forwarding, infrastructure timeout detection,
 * and transparent session recovery.
 */
export async function apiRequest<T = any>(url: string, options: ExtendedRequestInit = {}): Promise<T> {
  const token = AuthService.getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Always include credentials so container cookies (__SECURE-aistudio_auth_token) are preserved
  const fetchOptions: ExtendedRequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers,
  };

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (netErr: any) {
    if (typeof window !== 'undefined' && !options._isRetry && url !== '/api/auth/refresh') {
      const renewed = await attemptSessionRenewal();
      if (renewed) {
        return apiRequest<T>(url, { ...options, _isRetry: true });
      }
    }
    throw new Error(netErr.message || 'Network request failed. Please check your connection.');
  }

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // Non-JSON response (e.g. HTML error page from NGINX or auth bridge proxy)
    try {
      const text = await res.text();
      data = { rawText: text };
    } catch {
      data = null;
    }
  }

  // Handle 401 Unauthorized (expired or invalid backend JWT token)
  if (res.status === 401) {
    if (!options._isRetry && url !== '/api/auth/refresh') {
      const renewed = await attemptSessionRenewal();
      if (renewed) {
        return apiRequest<T>(url, { ...options, _isRetry: true });
      }
    }
    if (token) {
      AuthService.removeToken();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason: 'unauthorized' } }));
    }
    const message = (data && (data.error || data.message)) || 'Your session has expired. Please log in again.';
    const error: any = new Error(message);
    error.status = 401;
    throw error;
  }

  // Handle 403 Forbidden
  if (res.status === 403) {
    const isHtmlError =
      contentType.includes('text/html') ||
      (typeof data?.rawText === 'string' && (data.rawText.includes('<html') || data.rawText.includes('<!DOCTYPE') || data.rawText.includes('Forbidden')));

    const isInfrastructureSessionExpiry = isHtmlError || (!data?.message && !data?.error);

    // If it's an infrastructure/container session timeout (e.g. Google Cloud Run auth bridge redirect):
    if (isInfrastructureSessionExpiry) {
      if (typeof window !== 'undefined') {
        const now = Date.now();
        const lastRecoveryStr = sessionStorage.getItem('nexus_last_recovery_time');
        const lastRecovery = lastRecoveryStr ? parseInt(lastRecoveryStr, 10) : 0;

        if (now - lastRecovery > 15000) {
          sessionStorage.setItem('nexus_last_recovery_time', String(now));
          window.location.reload();
        } else {
          window.dispatchEvent(new CustomEvent(SESSION_TIMEOUT_EVENT, { detail: { reason: 'infrastructure' } }));
        }
        // Return a pending promise to prevent throwing errors to components while reload executes
        return new Promise<T>(() => {});
      }
    }

    // Genuine backend permission or branch access error (structured JSON from API middleware)
    const backendMessage =
      (data && (data.message || data.error)) ||
      'Access denied: You do not have permission to view or modify this resource.';
    const error: any = new Error(backendMessage);
    error.status = 403;
    error.isForbidden = true;
    throw error;
  }

  if (!res.ok || !data || data.success === false) {
    const errorMessage = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const error: any = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }

  return data as T;
}
