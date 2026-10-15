import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../database/db';

/**
 * Prevents privilege escalation through user management:
 *  - only a Director may create/edit/deactivate a Director or assign the Director role;
 *  - nobody may deactivate themselves (administrative recovery safety).
 */
export async function guardRoleAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.user!;
    if (actor.role === 'Director') {
      if (req.method === 'PATCH' && req.params.id === actor.id) {
        res.status(400).json({ success: false, error: 'You cannot deactivate your own account.', message: 'You cannot deactivate your own account.' });
        return;
      }
      next();
      return;
    }
    const deny = () =>
      res.status(403).json({ success: false, error: 'Only a Director can manage Director accounts.', message: 'Only a Director can manage Director accounts.' });

    if (req.body?.role === 'Director') return void deny();
    if (req.params.id) {
      const rows = await executeQuery<any>(`SELECT role FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
      if (rows[0]?.role === 'Director') return void deny();
      if (req.method === 'PATCH' && req.params.id === actor.id) {
        res.status(400).json({ success: false, error: 'You cannot deactivate your own account.', message: 'You cannot deactivate your own account.' });
        return;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
