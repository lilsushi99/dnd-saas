/**
 * Centralized API client for Nexus ERP frontend.
 * Automatically attaches JWT authentication tokens from localStorage.
 */

export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem('nexus_token');
  }

  public static async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      const errorMsg = data.message || data.error || `HTTP ${res.status}: API request failed`;
      throw new Error(errorMsg);
    }

    return data;
  }
}
