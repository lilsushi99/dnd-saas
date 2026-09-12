import { Branch, Facility, AdminUser, RolePermission, ColumnMappingItem, ValidationErrorItem, ImportSpreadsheetRow, ImportResultSummary } from '../types';

export class AdminApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'API Request failed');
    }
    return data.data;
  }

  // --- BRANCHES ---
  public static async fetchBranches(): Promise<Branch[]> {
    return this.request<Branch[]>('/api/admin/branches');
  }

  public static async createBranch(branch: { name: string; location: string; status: 'Active' | 'Inactive' }): Promise<Branch> {
    return this.request<Branch>('/api/admin/branches', {
      method: 'POST',
      body: JSON.stringify(branch),
    });
  }

  public static async updateBranch(id: string, branch: Partial<Branch>): Promise<Branch> {
    return this.request<Branch>(`/api/admin/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branch),
    });
  }

  public static async toggleBranchStatus(id: string): Promise<Branch> {
    return this.request<Branch>(`/api/admin/branches/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // --- FACILITIES ---
  public static async fetchFacilities(): Promise<Facility[]> {
    return this.request<Facility[]>('/api/admin/facilities');
  }

  public static async createFacility(facility: { name: string; branchId: string; defaultPrice?: number; status: 'Active' | 'Inactive' }): Promise<Facility> {
    return this.request<Facility>('/api/admin/facilities', {
      method: 'POST',
      body: JSON.stringify(facility),
    });
  }

  public static async updateFacility(id: string, facility: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>(`/api/admin/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(facility),
    });
  }

  public static async deleteFacility(id: string): Promise<void> {
    await this.request<void>(`/api/admin/facilities/${id}`, {
      method: 'DELETE',
    });
  }

  // --- USERS & ROLES ---
  public static async fetchUsers(): Promise<AdminUser[]> {
    return this.request<AdminUser[]>('/api/admin/users');
  }

  public static async createUser(user: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
    return this.request<AdminUser>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  public static async updateUser(id: string, user: Partial<AdminUser>): Promise<AdminUser> {
    return this.request<AdminUser>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  public static async toggleUserStatus(id: string): Promise<AdminUser> {
    return this.request<AdminUser>(`/api/admin/users/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  public static async fetchRolesPermissions(): Promise<RolePermission[]> {
    return this.request<RolePermission[]>('/api/admin/roles');
  }

  public static async updateRolePermissions(role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant', permissions: RolePermission['permissions']): Promise<RolePermission> {
    return this.request<RolePermission>(`/api/admin/roles/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  // --- IMPORT WIZARD ---
  public static async detectColumns(headers: string[], sampleRows: Record<string, any>[]): Promise<ColumnMappingItem[]> {
    return this.request<ColumnMappingItem[]>('/api/admin/import/detect-columns', {
      method: 'POST',
      body: JSON.stringify({ headers, sampleRows }),
    });
  }

  public static async validateImport(rows: ImportSpreadsheetRow[]): Promise<ValidationErrorItem[]> {
    return this.request<ValidationErrorItem[]>('/api/admin/import/validate', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  }

  public static async executeImport(rows: ImportSpreadsheetRow[]): Promise<ImportResultSummary> {
    return this.request<ImportResultSummary>('/api/admin/import/execute', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  }

  // --- FILE UPLOADS ---
  public static async uploadFile(
    file: File,
    entityType: 'logo' | 'profile_photo' | 'document' = 'logo'
  ): Promise<{ url: string; fileName: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              entityType,
              fileData: base64Data,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'File upload failed');
          }
          resolve({ url: data.data.url, fileName: data.data.fileName });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file on client'));
      reader.readAsDataURL(file);
    });
  }
}
