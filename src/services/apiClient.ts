import { apiRequest } from './http';

/**
 * Centralized API client for Nexus ERP frontend.
 * Automatically attaches JWT authentication tokens from localStorage and shares unified error handling.
 */
export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem('nexus_token');
  }

  public static async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    return apiRequest<T>(url, options);
  }
}
