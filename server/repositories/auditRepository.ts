import { executeQuery } from '../database/db';

export interface AuditLogEntry {
  id?: number;
  user: string;
  action: string;
  ipAddress?: string;
  entity?: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  timestamp?: string;
}

export class AuditRepository {
  public async logAction(entry: AuditLogEntry): Promise<void> {
    const timestamp = entry.timestamp || new Date().toISOString();
    const ip = entry.ipAddress || '127.0.0.1';

    try {
      await executeQuery(
        `INSERT INTO audit_logs (user, action, ip_address, entity, entity_id, previous_value, new_value, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.user,
          entry.action,
          ip,
          entry.entity || null,
          entry.entityId || null,
          entry.previousValue ? JSON.stringify(entry.previousValue) : null,
          entry.newValue ? JSON.stringify(entry.newValue) : null,
          timestamp.replace('T', ' ').replace('Z', ''),
        ]
      );
    } catch (err) {
      console.error('❌ Failed to insert audit log into MySQL:', (err as Error).message);
    }
  }

  public async getLogs(limit = 100): Promise<AuditLogEntry[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, user, action, ip_address as ipAddress, entity, entity_id as entityId,
                previous_value as previousValue, new_value as newValue, timestamp
         FROM audit_logs
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit]
      );

      return rows.map((r) => {
        let prev = r.previousValue;
        let next = r.newValue;
        if (typeof prev === 'string') {
          try { prev = JSON.parse(prev); } catch (e) {}
        }
        if (typeof next === 'string') {
          try { next = JSON.parse(next); } catch (e) {}
        }
        return {
          ...r,
          previousValue: prev,
          newValue: next,
        };
      });
    } catch (err) {
      console.error('❌ Failed to fetch audit logs from MySQL:', (err as Error).message);
      return [];
    }
  }
}

export const auditRepository = new AuditRepository();
