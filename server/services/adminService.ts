import { AdminRepository } from '../repositories/adminRepository';
import { Branch, Facility, AdminUser, RolePermission, ImportSpreadsheetRow, ImportResultSummary, ColumnMappingItem, ValidationErrorItem } from '../../src/types';

export class AdminService {
  private adminRepo: AdminRepository;

  constructor() {
    this.adminRepo = new AdminRepository();
  }

  // --- BRANCHES ---
  public async getBranches(): Promise<Branch[]> {
    return await this.adminRepo.getBranches();
  }

  public async createBranch(data: { name: string; location: string; status: 'Active' | 'Inactive' }): Promise<Branch> {
    if (!data.name || !data.location) {
      throw new Error('Branch Name and Location are required.');
    }
    return await this.adminRepo.createBranch(data);
  }

  public async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    const updated = await this.adminRepo.updateBranch(id, updates);
    if (!updated) {
      throw new Error('Branch not found.');
    }
    return updated;
  }

  public async toggleBranchStatus(id: string): Promise<Branch> {
    const updated = await this.adminRepo.toggleBranchStatus(id);
    if (!updated) {
      throw new Error('Branch not found.');
    }
    return updated;
  }

  // --- FACILITIES ---
  public async getFacilities(): Promise<Facility[]> {
    return await this.adminRepo.getFacilities();
  }

  public async createFacility(data: { name: string; branchId: string; defaultPrice?: number; status: 'Active' | 'Inactive' }): Promise<Facility> {
    if (!data.name || !data.branchId) {
      throw new Error('Facility Name and Branch selection are required.');
    }
    return await this.adminRepo.createFacility(data);
  }

  public async updateFacility(id: string, updates: Partial<Facility>): Promise<Facility> {
    const updated = await this.adminRepo.updateFacility(id, updates);
    if (!updated) {
      throw new Error('Facility not found.');
    }
    return updated;
  }

  public async deleteFacility(id: string): Promise<boolean> {
    const success = await this.adminRepo.deleteFacility(id);
    if (!success) {
      throw new Error('Facility not found.');
    }
    return true;
  }

  // --- USERS & ROLES ---
  public async getUsers(): Promise<AdminUser[]> {
    return await this.adminRepo.getUsers();
  }

  public async createUser(data: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
    if (!data.name || !data.email || !data.role) {
      throw new Error('Name, Email, and Role are required.');
    }
    return await this.adminRepo.createUser(data);
  }

  public async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const updated = await this.adminRepo.updateUser(id, updates);
    if (!updated) {
      throw new Error('User not found.');
    }
    return updated;
  }

  public async toggleUserStatus(id: string): Promise<AdminUser> {
    const updated = await this.adminRepo.toggleUserStatus(id);
    if (!updated) {
      throw new Error('User not found.');
    }
    return updated;
  }

  public async getRolesPermissions(): Promise<RolePermission[]> {
    return await this.adminRepo.getRolesPermissions();
  }

  public async updateRolePermissions(role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant', permissions: RolePermission['permissions']): Promise<RolePermission> {
    const updated = await this.adminRepo.updateRolePermissions(role, permissions);
    if (!updated) {
      throw new Error('Role not found.');
    }
    return updated;
  }

  // --- IMPORT WIZARD AI-ASSISTED MAPPING & VALIDATION ---
  public autoDetectColumns(headers: string[], sampleRows: Record<string, any>[]): ColumnMappingItem[] {
    const mapping: ColumnMappingItem[] = [];

    const fieldPatterns: Record<string, string[]> = {
      sn: ['s/n', 'sn', 's.n', 's_n', 'serial', 'no', '#', 'id'],
      date: ['date', 'booking date', 'transaction date', 'day', 'created at'],
      noOfDays: ['no. of days', 'no of days', 'days', 'duration (days)', 'total days', 'days count'],
      timeDuration: ['time duration', 'duration', 'time', 'hours', 'slot'],
      clientName: ['client name', 'client', 'customer', 'company', 'organization', 'billed to', 'account'],
      facility: ['facility', 'space', 'room', 'facility name', 'desk', 'unit', 'location facility'],
      amount: ['amount', 'price', 'total', 'revenue', 'fee', 'cost', 'amount paid', 'price ($)'],
      modeOfPayment: ['mode of payment', 'payment mode', 'payment method', 'type', 'channel', 'payment'],
      daysUsed: ['days used', 'used', 'consumed', 'days active'],
      daysLeft: ['days left', 'left', 'remaining', 'balance days', 'days remaining'],
    };

    headers.forEach((header) => {
      const cleanHeader = header.trim().toLowerCase();
      let detectedField = 'unmapped';
      let confidence = 0;

      for (const [fieldKey, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some((p) => cleanHeader === p)) {
          detectedField = fieldKey;
          confidence = 98;
          break;
        } else if (patterns.some((p) => cleanHeader.includes(p))) {
          detectedField = fieldKey;
          confidence = 85;
          break;
        }
      }

      const samples = sampleRows
        .slice(0, 3)
        .map((r) => String(r[header] ?? ''))
        .filter(Boolean);

      mapping.push({
        excelColumn: header,
        detectedField,
        confidence,
        sampleValues: samples,
      });
    });

    return mapping;
  }

  public validateImportData(rows: ImportSpreadsheetRow[]): ValidationErrorItem[] {
    const errors: ValidationErrorItem[] = [];
    const clientSet = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;

      const client = row.clientName || row.client;
      if (!client) {
        errors.push({
          row: rowNum,
          field: 'Client Name',
          issue: 'Missing Client Name in record',
          severity: 'error',
          value: null,
        });
      } else {
        if (clientSet.has(client.toString().toLowerCase())) {
          errors.push({
            row: rowNum,
            field: 'Client Name',
            issue: `Duplicate client name "${client}" found in batch`,
            severity: 'warning',
            value: client,
          });
        }
        clientSet.add(client.toString().toLowerCase());
      }

      const amt = row.amount;
      if (amt === undefined || amt === null || amt === '') {
        errors.push({
          row: rowNum,
          field: 'Amount',
          issue: 'Missing payment amount, defaulting to facility rate',
          severity: 'warning',
          value: null,
        });
      } else if (isNaN(Number(amt))) {
        errors.push({
          row: rowNum,
          field: 'Amount',
          issue: `Invalid numeric value for amount: "${amt}"`,
          severity: 'error',
          value: amt,
        });
      }

      if (row.daysUsed && row.noOfDays && Number(row.daysUsed) > Number(row.noOfDays)) {
        errors.push({
          row: rowNum,
          field: 'Days Used',
          issue: `Days used (${row.daysUsed}) exceeds total booked days (${row.noOfDays})`,
          severity: 'warning',
          value: row.daysUsed,
        });
      }
    });

    return errors;
  }

  public async processImport(rows: ImportSpreadsheetRow[]): Promise<ImportResultSummary> {
    return await this.adminRepo.executeImport(rows);
  }
}
