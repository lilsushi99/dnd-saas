import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../database/db';

/**
 * Prevents privilege escalation and administrative lock-out through user management:
 *  - only a Director may create/edit/deactivate a Director or assign the Director role;
 *  - nobody may deactivate their own account;
 *  - nobody may deactivate or reassign the last active Director account.
 */
export async function guardRoleAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.user!;
    const targetId = req.params.id;

    // 1. Prevent self-deactivation via PATCH toggle-status or PUT status=Inactive
    if (targetId && targetId === actor.id) {
      if (req.method === 'PATCH' || req.body?.status === 'Inactive') {
        res.status(400).json({
          success: false,
          error: 'You cannot deactivate your own account.',
          message: 'You cannot deactivate your own account.',
        });
        return;
      }
    }

    // 2. Fetch target user if modifying an existing user
    let targetUser: { role: string; status: string } | null = null;
    if (targetId) {
      const rows = await executeQuery<any>(`SELECT role, status FROM users WHERE id = ? LIMIT 1`, [targetId]);
      targetUser = rows[0] || null;
    }

    // 3. Non-Directors cannot manage Director accounts or escalate roles to Director
    if (actor.role !== 'Director') {
      if (req.body?.role === 'Director') {
        res.status(403).json({
          success: false,
          error: 'Only a Director can manage Director accounts.',
          message: 'Only a Director can manage Director accounts.',
        });
        return;
      }
      if (targetUser && targetUser.role === 'Director') {
        res.status(403).json({
          success: false,
          error: 'Only a Director can manage Director accounts.',
          message: 'Only a Director can manage Director accounts.',
        });
        return;
      }
    }

    // 4. Prevent deactivation or role stripping of the last active Director
    if (targetUser && targetUser.role === 'Director' && targetUser.status === 'Active') {
      const isDeactivating = req.method === 'PATCH' || req.body?.status === 'Inactive';
      const isDemoting = req.body?.role && req.body.role !== 'Director';

      if (isDeactivating || isDemoting) {
        const activeDirectors = await executeQuery<any>(
          `SELECT COUNT(*) AS cnt FROM users WHERE role = 'Director' AND status = 'Active'`
        );
        const count = Number(activeDirectors[0]?.cnt || 0);
        if (count <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot deactivate or reassign the last active Director account. Doing so would lock out the organization.',
            message: 'Cannot deactivate or reassign the last active Director account. Doing so would lock out the organization.',
          });
          return;
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
