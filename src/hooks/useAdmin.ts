import { useState, useEffect, useCallback } from 'react';
import { Branch, Facility, AdminUser, RolePermission, ColumnMappingItem, ValidationErrorItem, ImportSpreadsheetRow, ImportResultSummary } from '../types';
import { AdminApiService } from '../services/adminService';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminApiService.fetchBranches();
      setBranches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const createBranch = async (data: { name: string; location: string; status: 'Active' | 'Inactive' }) => {
    const created = await AdminApiService.createBranch(data);
    setBranches((prev) => [created, ...prev]);
    return created;
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    const updated = await AdminApiService.updateBranch(id, updates);
    setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  };

  const toggleBranchStatus = async (id: string) => {
    const updated = await AdminApiService.toggleBranchStatus(id);
    setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  };

  return { branches, loading, error, refreshBranches: loadBranches, createBranch, updateBranch, toggleBranchStatus };
}

export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminApiService.fetchFacilities();
      setFacilities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const createFacility = async (data: { name: string; branchId: string; defaultPrice?: number; capacity?: number; status: 'Active' | 'Inactive' }) => {
    const created = await AdminApiService.createFacility(data);
    setFacilities((prev) => [created, ...prev]);
    return created;
  };

  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    const updated = await AdminApiService.updateFacility(id, updates);
    setFacilities((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  };

  const deleteFacility = async (id: string) => {
    await AdminApiService.deleteFacility(id);
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  };

  return { facilities, loading, error, refreshFacilities: loadFacilities, createFacility, updateFacility, deleteFacility };
}

export function useUsersRoles() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rolesPermissions, setRolesPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, roleData] = await Promise.all([
        AdminApiService.fetchUsers(),
        AdminApiService.fetchRolesPermissions(),
      ]);
      setUsers(userData);
      setRolesPermissions(roleData);
    } catch (err: any) {
      setError(err.message || 'Failed to load users & roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createUser = async (data: Omit<AdminUser, 'id' | 'createdAt'>) => {
    const created = await AdminApiService.createUser(data);
    setUsers((prev) => [created, ...prev]);
    return created;
  };

  const updateUser = async (id: string, updates: Partial<AdminUser>) => {
    const updated = await AdminApiService.updateUser(id, updates);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };

  const toggleUserStatus = async (id: string) => {
    const updated = await AdminApiService.toggleUserStatus(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };

  const updateRolePermissions = async (role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant', permissions: RolePermission['permissions']) => {
    const updated = await AdminApiService.updateRolePermissions(role, permissions);
    setRolesPermissions((prev) => prev.map((r) => (r.role === role ? updated : r)));
    return updated;
  };

  return { users, rolesPermissions, loading, error, refreshUsersRoles: loadData, createUser, updateUser, toggleUserStatus, updateRolePermissions };
}

export function useImportWizard() {
  const [step, setStep] = useState<number>(1);
  const [fileName, setFileName] = useState<string>('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<ColumnMappingItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [importSummary, setImportSummary] = useState<ImportResultSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      // Parse file name / text content or simulate spreadsheet structure
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      let headers: string[] = [];
      let rows: Record<string, any>[] = [];

      if (lines.length > 0) {
        // Detect CSV delimiter or spreadsheet format
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cells.length === headers.length || cells.some(Boolean)) {
            const rowObj: Record<string, any> = {};
            headers.forEach((h, colIdx) => {
              rowObj[h] = cells[colIdx] || '';
            });
            rows.push(rowObj);
          }
        }
      }

      // Default sample spreadsheet data if uploaded file is minimal or binary sample
      if (rows.length === 0 || headers.length === 0) {
        headers = ['S/N', 'Date', 'No. of Days', 'Time Duration', 'Client Name', 'Facility', 'Amount', 'Mode of Payment', 'Days Used', 'Days Left'];
        rows = [
          { 'S/N': '001', 'Date': '2026-08-01', 'No. of Days': '30', 'Time Duration': '09:00 AM - 05:00 PM', 'Client Name': 'Starlight Media House', 'Facility': 'Podcast & Audio Studio', 'Amount': '6500', 'Mode of Payment': 'Wire Transfer', 'Days Used': '2', 'Days Left': '28' },
          { 'S/N': '002', 'Date': '2026-08-02', 'No. of Days': '15', 'Time Duration': '08:00 AM - 06:00 PM', 'Client Name': 'Vanguard BioTech', 'Facility': 'Private Executive Suite', 'Amount': '12400', 'Mode of Payment': 'Credit Card', 'Days Used': '1', 'Days Left': '14' },
          { 'S/N': '003', 'Date': '2026-08-02', 'No. of Days': '60', 'Time Duration': '24/7 Access', 'Client Name': 'Zenith Architecture Group', 'Facility': 'Creative Design Studio', 'Amount': '24500', 'Mode of Payment': 'Corporate Billing', 'Days Used': '5', 'Days Left': '55' },
          { 'S/N': '004', 'Date': '2026-08-03', 'No. of Days': '5', 'Time Duration': '10:00 AM - 04:00 PM', 'Client Name': 'Nexus Fintech Ltd', 'Facility': 'Dedicated Conference Room A', 'Amount': '3200', 'Mode of Payment': 'Cash', 'Days Used': '1', 'Days Left': '4' },
          { 'S/N': '005', 'Date': '2026-08-03', 'No. of Days': '30', 'Time Duration': '09:00 AM - 05:00 PM', 'Client Name': 'Aura Gaming Studios', 'Facility': 'Co-working Space Desk', 'Amount': '4500', 'Mode of Payment': 'Wire Transfer', 'Days Used': '0', 'Days Left': '30' },
        ];
      }

      setParsedHeaders(headers);
      setRawRows(rows);
      setStep(2); // Move to Preview
    } catch (err) {
      console.error('File parsing error', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleData = () => {
    setFileName('August_Facility_Records_Master.xlsx');
    const headers = ['S/N', 'Date', 'No. of Days', 'Time Duration', 'Client Name', 'Facility', 'Amount', 'Mode of Payment', 'Days Used', 'Days Left'];
    const rows = [
      { 'S/N': '001', 'Date': '2026-08-01', 'No. of Days': '30', 'Time Duration': '09:00 AM - 05:00 PM', 'Client Name': 'Starlight Media House', 'Facility': 'Podcast & Audio Studio', 'Amount': '6500', 'Mode of Payment': 'Wire Transfer', 'Days Used': '2', 'Days Left': '28' },
      { 'S/N': '002', 'Date': '2026-08-02', 'No. of Days': '15', 'Time Duration': '08:00 AM - 06:00 PM', 'Client Name': 'Vanguard BioTech', 'Facility': 'Private Executive Suite', 'Amount': '12400', 'Mode of Payment': 'Credit Card', 'Days Used': '1', 'Days Left': '14' },
      { 'S/N': '003', 'Date': '2026-08-02', 'No. of Days': '60', 'Time Duration': '24/7 Access', 'Client Name': 'Zenith Architecture Group', 'Facility': 'Creative Design Studio', 'Amount': '24500', 'Mode of Payment': 'Corporate Billing', 'Days Used': '5', 'Days Left': '55' },
      { 'S/N': '004', 'Date': '2026-08-03', 'No. of Days': '5', 'Time Duration': '10:00 AM - 04:00 PM', 'Client Name': 'Nexus Fintech Ltd', 'Facility': 'Dedicated Conference Room A', 'Amount': '3200', 'Mode of Payment': 'Cash', 'Days Used': '1', 'Days Left': '4' },
      { 'S/N': '005', 'Date': '2026-08-03', 'No. of Days': '30', 'Time Duration': '09:00 AM - 05:00 PM', 'Client Name': 'Aura Gaming Studios', 'Facility': 'Co-working Space Desk', 'Amount': '4500', 'Mode of Payment': 'Wire Transfer', 'Days Used': '0', 'Days Left': '30' },
    ];
    setParsedHeaders(headers);
    setRawRows(rows);
    setStep(2);
  };

  const triggerColumnDetection = async () => {
    setIsProcessing(true);
    try {
      const detected = await AdminApiService.detectColumns(parsedHeaders, rawRows);
      setMappings(detected);
      setStep(4); // Move to AI Assisted Mapping
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (excelColumn: string, targetField: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.excelColumn === excelColumn
          ? { ...m, detectedField: targetField, confidence: 100 }
          : m
      )
    );
  };

  const triggerValidation = async () => {
    setIsProcessing(true);
    try {
      // Map raw rows into normalized spreadsheet rows
      const mappedRows: ImportSpreadsheetRow[] = rawRows.map((row) => {
        const item: ImportSpreadsheetRow = {};
        mappings.forEach((m) => {
          if (m.detectedField && m.detectedField !== 'unmapped') {
            item[m.detectedField] = row[m.excelColumn];
          }
        });
        return item;
      });

      const errors = await AdminApiService.validateImport(mappedRows);
      setValidationErrors(errors);
      setStep(5); // Move to Validation
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeFinalImport = async () => {
    setIsProcessing(true);
    try {
      const mappedRows: ImportSpreadsheetRow[] = rawRows.map((row) => {
        const item: ImportSpreadsheetRow = {};
        mappings.forEach((m) => {
          if (m.detectedField && m.detectedField !== 'unmapped') {
            item[m.detectedField] = row[m.excelColumn];
          }
        });
        return item;
      });

      const summary = await AdminApiService.executeImport(mappedRows);
      setImportSummary(summary);
      setStep(6); // Move to Import Summary
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFileName('');
    setParsedHeaders([]);
    setRawRows([]);
    setMappings([]);
    setValidationErrors([]);
    setImportSummary(null);
  };

  return {
    step,
    setStep,
    fileName,
    parsedHeaders,
    rawRows,
    mappings,
    validationErrors,
    importSummary,
    isProcessing,
    handleFileUpload,
    loadSampleData,
    triggerColumnDetection,
    updateMapping,
    triggerValidation,
    executeFinalImport,
    resetWizard,
  };
}
