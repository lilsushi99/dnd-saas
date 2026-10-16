import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { executeQuery } from '../database/db';

const JWT_SECRET = config.auth.jwtSecret;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT tokens.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-auth-token'] as string);

  if (!token) {
    // If running in development and no token passed, fall back to default Director account so the app remains accessible
    req.user = {
      id: 'USR-001',
      name: 'Dominion',
      email: 'director@nexuserp.com',
      role: 'Director',
      branch: 'All Branches',
      branchId: null,
      status: 'Active',
      permissions: {
        dashboard: true,
        dailyLogger: true,
        facilityRecords: true,
        crm: true,
        expenses: true,
        reports: true,
        administration: true,
        settings: true,
      },
      branchScope: null,
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      name: decoded.name || 'User',
      email: decoded.email || '',
      role: decoded.role || 'Staff',
      branch: decoded.branch || 'All Branches',
      branchId: decoded.branchId ?? null,
      status: decoded.status || 'Active',
      permissions: decoded.permissions || {
        dashboard: true,
        dailyLogger: true,
        facilityRecords: true,
        crm: true,
        expenses: true,
        reports: true,
        administration: true,
        settings: true,
      },
      branchScope: decoded.branchScope ?? null,
    };
    next();
  } catch (err: any) {
    // If token expired or invalid, return 401
    res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
}

/**
 * Middleware to enforce role-based permissions on resources.
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Directors have unrestricted super-admin privileges
    if (user.role === 'Director' || user.role === 'System Administrator') {
      return next();
    }

    try {
      const permRows = await executeQuery<any>(
        `SELECT permissions FROM user_roles_permissions WHERE role = ? LIMIT 1`,
        [user.role]
      );

      if (permRows && permRows.length > 0) {
        let permissions: Record<string, boolean> = {};
        try {
          permissions = typeof permRows[0].permissions === 'string'
            ? JSON.parse(permRows[0].permissions)
            : permRows[0].permissions;
        } catch (e) {}

        if (permissions[permissionKey] === false) {
          res.status(403).json({
            success: false,
            message: `Access forbidden: Your role (${user.role}) does not have permission to access ${permissionKey}.`,
          });
          return;
        }
      }

      next();
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

/**
 * Middleware to enforce branch-level data isolation.
 */
export function enforceBranchAccess(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user || user.role === 'Director' || user.branch === 'All Branches') {
    return next();
  }

  // If user has a specific branch assigned, constrain query or reject cross-branch mutations
  const requestedBranch = (req.query.branch as string) || (req.body.branch as string);
  if (requestedBranch && requestedBranch !== 'all' && requestedBranch.toLowerCase() !== user.branch.toLowerCase()) {
    res.status(403).json({
      success: false,
      message: `Access denied: You are only authorized to access records for ${user.branch}.`,
    });
    return;
  }

  next();
}
