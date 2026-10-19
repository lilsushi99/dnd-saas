import { AuthService } from './authService';

export const AUTH_EXPIRED_EVENT = 'nexus:auth-expired';

interface ExtendedRequestInit extends RequestInit {
  _isRetry?: boolean;
}

let isRenewing = false;
let renewalPromise: Promise<boolean> | null = null;

/**
 * Attempts a transparent session renewal for both the AI Studio container
 * auth bridge cookie and the backend JWT session token.
 */
export async function attemptSessionRenewal(): Promise<boolean> {
  if (renewalPromise) return renewalPromise;

  renewalPromise = (async () => {
    try {
      // 1. In browser environments, briefly trigger a background iframe request to refresh the AI Studio container cookie
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.setAttribute('aria-hidden', 'true');
          iframe.src = '/?__auth_renew=' + Date.now();
          document.body.appendChild(iframe);
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
              try { iframe.remove(); } catch {}
              resolve();
            }, 3000);
            iframe.onload = () => {
              clearTimeout(timer);
              setTimeout(() => {
                try { iframe.remove(); } catch {}
                resolve();
              }, 400);
            };
            iframe.onerror = () => {
              clearTimeout(timer);
              try { iframe.remove(); } catch {}
              resolve();
            };
          });
        } catch {
          // If iframe is blocked, continue to JWT refresh
        }
      }

      // 2. Refresh JWT session token against the backend
      const token = AuthService.getToken();
      if (token) {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success && json.token) {
          AuthService.setToken(json.token);
          return true;
        }
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

// Set up periodic session heartbeat every 2 minutes (120s) to keep AI Studio NGINX
// auth cache (which has a 300s TTL) and backend JWT tokens fresh indefinitely during active use.
if (typeof window !== 'undefined') {
  let lastHeartbeat = Date.now();

  const runHeartbeat = async () => {
    const token = AuthService.getToken();
    if (!token) return;
    try {
      await attemptSessionRenewal();
      lastHeartbeat = Date.now();
    } catch {
      // Fail silently on background heartbeat
    }
  };

  // Heartbeat interval (every 2 minutes)
  setInterval(runHeartbeat, 120000);

  // Trigger heartbeat when window regains focus or user becomes active after being away
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastHeartbeat > 90000) {
      runHeartbeat();
    }
  });

  window.addEventListener('focus', () => {
    if (Date.now() - lastHeartbeat > 90000) {
      runHeartbeat();
    }
  });
}

/**
 * Shared authenticated JSON request with automatic JWT token attachment,
 * server error extraction, container session renewal, and transparent retry on transient 403s.
 */
export async function apiRequest<T = any>(url: string, options: ExtendedRequestInit = {}): Promise<T> {
  const token = AuthService.getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
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
    // Non-JSON response (e.g. HTML error page from NGINX or proxy)
    try {
      const text = await res.text();
      // Check if server sent a string error
      data = { rawText: text };
    } catch {
      data = null;
    }
  }

  // Handle 401 Unauthorized (expired or invalid JWT token)
  if (res.status === 401 && token) {
    AuthService.removeToken();
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason: 'unauthorized' } }));
    throw new Error((data && (data.error || data.message)) || 'Your session has expired. Please log in again.');
  }

  // Handle 403 Forbidden
  if (res.status === 403) {
    const isInfrastructureSessionExpiry =
      !data ||
      !data.message ||
      contentType.includes('text/html') ||
      (typeof data.rawText === 'string' && data.rawText.includes('<html'));

    // If it's an infrastructure/container session expiry and we haven't retried yet, attempt renewal
    if (isInfrastructureSessionExpiry && !options._isRetry) {
      const renewed = await attemptSessionRenewal();
      if (renewed) {
        return apiRequest<T>(url, { ...options, _isRetry: true });
      }
    }

    // Genuine backend permission or branch access error
    const backendMessage = (data && (data.message || data.error)) || 'Access denied: You do not have permission to view or modify this resource.';
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
