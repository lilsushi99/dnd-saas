import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { executeQuery } from '../database/db';

/**
 * Permission keys stored (as JSON) in user_roles_permissions.permissions.
 * These are the keys the frontend sidebar already uses.
 */
export const PERMISSION_KEYS = [
  'dashboard',
  'dailyLogger',
  'facilityRecords',
  'crm',
  'expenses',
  'reports',
  'administration',
  'settings',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type PermissionMap = Record<PermissionKey, boolean>;

/** Default role matrix, seeded with INSERT IGNORE so existing customised rows are never overwritten. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  Director: { dashboard: true, dailyLogger: true, facilityRecords: true, crm: true, expenses: true, reports: true, administration: true, settings: true },
  Manager: { dashboard: true, dailyLogger: true, facilityRecords: true, crm: true, expenses: true, reports: true, administration: true, settings: false },
  Receptionist: { dashboard: true, dailyLogger: true, facilityRecords: true, crm: true, expenses: false, reports: false, administration: false, settings: false },
  Accountant: { dashboard: true, dailyLogger: false, facilityRecords: true, crm: false, expenses: true, reports: true, administration: false, settings: false },
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  branchId: string | null;
  status: string;
  permissions: PermissionMap;
  /** null => user may access every branch */
  branchScope: { id: string | null; name: string } | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function emptyPermissions(): PermissionMap {
  return PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {} as PermissionMap);
}

/** Normalise a stored permissions JSON blob. Unknown/missing keys are DENIED (fail closed). */
export function normalizePermissions(raw: unknown): PermissionMap {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = {};
    }
  }
  const out = emptyPermissions();
  if (obj && typeof obj === 'object') {
    for (const k of PERMISSION_KEYS) out[k] = obj[k] === true;
  }
  return out;
}

export async function loadPermissionsForRole(role: string): Promise<PermissionMap> {
  // The Director role is always fully privileged so a bad permission edit can never lock out every administrator.
  if (role === 'Director') return { ...DEFAULT_ROLE_PERMISSIONS.Director };
  const rows = await executeQuery<any>(`SELECT permissions FROM user_roles_permissions WHERE role = ? LIMIT 1`, [role]);
  if (!rows || rows.length === 0) return emptyPermissions();
  return normalizePermissions(rows[0].permissions);
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.substring(7).trim() || null;
  return null;
}

export function isUnrestrictedBranch(branch: string | null | undefined): boolean {
  const b = (branch || '').trim().toLowerCase();
  return b === '' || b === 'all branches' || b === 'all';
}

/** Loads the user fresh from MySQL on every request so deactivation / role changes apply immediately. */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required.', message: 'Authentication required.' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired session.', message: 'Invalid or expired session.' });
      return;
    }

    const rows = await executeQuery<any>(
      `SELECT id, name, email, role, branch, branch_id AS branchId, status FROM users WHERE id = ? LIMIT 1`,
      [decoded.id]
    );
    const row = rows && rows[0];
    if (!row) {
      res.status(401).json({ success: false, error: 'Account no longer exists.', message: 'Account no longer exists.' });
      return;
    }
    if (row.status !== 'Active') {
      res.status(403).json({ success: false, error: 'Account is deactivated.', message: 'Account is deactivated.' });
      return;
    }

    const permissions = await loadPermissionsForRole(row.role);
    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      branch: row.branch,
      branchId: row.branchId || null,
      status: row.status,
      permissions,
      branchScope: isUnrestrictedBranch(row.branch) ? null : { id: row.branchId || null, name: row.branch },
    };
    next();
  } catch (err) {
    console.error('Authentication middleware error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Authentication service unavailable.', message: 'Authentication service unavailable.' });
  }
}

/** Allows the request if the user holds ANY of the given permissions. Must run after authenticate. */
export function requirePermission(...keys: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required.', message: 'Authentication required.' });
      return;
    }
    if (keys.some((k) => user.permissions[k] === true)) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'You do not have permission to perform this action.', message: 'You do not have permission to perform this action.' });
  };
}

/** Role gate for operations that must never be delegated through the permission matrix (e.g. editing roles). */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user && roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'You do not have permission to perform this action.', message: 'You do not have permission to perform this action.' });
  };
}

function matchesScope(value: unknown, scope: { id: string | null; name: string }): boolean {
  if (value === undefined || value === null || value === '') return true;
  const v = String(value).trim().toLowerCase();
  if (v === 'all' ) return false;
  return v === scope.name.toLowerCase() || (!!scope.id && v === scope.id.toLowerCase());
}

/**
 * Branch-level restriction. For users bound to one branch:
 *  - read filters (`?branch=`) are forced to their branch;
 *  - writes naming a different branch are rejected.
 */
export function enforceBranchScope(req: Request, res: Response, next: NextFunction): void {
  const scope = req.user?.branchScope;
  if (!scope) {
    next();
    return;
  }
  const requested = req.query.branch;
  if (requested !== undefined && requested !== 'all' && requested !== '' && !matchesScope(requested, scope)) {
    res.status(403).json({ success: false, error: 'You do not have access to that branch.', message: 'You do not have access to that branch.' });
    return;
  }
  req.query.branch = scope.id || scope.name;

  if (req.body && typeof req.body === 'object') {
    for (const key of ['branch', 'branchId', 'branch_id', 'branchName']) {
      if (key in req.body && !matchesScope(req.body[key], scope)) {
        res.status(403).json({ success: false, error: 'You do not have access to that branch.', message: 'You do not have access to that branch.' });
        return;
      }
    }
  }
  next();
}

/** Replaces 5xx error text (which can contain SQL / host details) with a generic message. Full detail stays in server logs. */
export function sanitizeServerErrors(req: Request, res: Response, next: NextFunction): void {
  // The health endpoint intentionally returns a structured (secret-free) status body on 503.
  if (req.path === '/health') {
    next();
    return;
  }
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 500 && body && typeof body === 'object') {
      console.error(`❌ [API ${res.statusCode}] ${req.method} ${req.originalUrl}:`, body.error || body.message);
      const generic = 'An internal server error occurred. Please try again or contact support.';
      return originalJson({ ...body, success: false, error: generic, message: generic });
    }
    return originalJson(body);
  }) as any;
  next();
}
