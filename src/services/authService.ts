import { User, RolePermission } from '../types';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User & {
    id: string;
    branch?: string;
    status?: string;
    profilePhoto?: string;
    permissions?: RolePermission['permissions'];
  };
  message?: string;
}

export class AuthService {
  public static getToken(): string | null {
    return localStorage.getItem('nexus_token');
  }

  public static setToken(token: string): void {
    localStorage.setItem('nexus_token', token);
  }

  public static removeToken(): void {
    localStorage.removeItem('nexus_token');
  }

  public static async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public static async signup(userData: { name: string; email: string; password: string; role?: string; branch?: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public static async getCurrentUser(): Promise<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      return { success: false, message: 'No authentication token stored.' };
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        this.removeToken();
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error verifying session.' };
    }
  }

  public static async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (e) {}
    }
    this.removeToken();
  }
}
