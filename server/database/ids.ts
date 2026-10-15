import { executeQuery } from './db';

/** Next ID like PREFIX-001 based on the highest existing number (count-based IDs collide after any delete). */
export async function nextSequentialId(prefix: string, table: string, width = 3): Promise<string> {
  if (!/^[a-z_]+$/i.test(table) || !/^[A-Z]+$/.test(prefix)) throw new Error('Invalid id generator arguments');
  const rows = await executeQuery<any>(`SELECT id FROM \`${table}\` WHERE id LIKE ?`, [`${prefix}-%`]);
  const max = rows.reduce((m, r) => Math.max(m, parseInt(String(r.id).slice(prefix.length + 1), 10) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
}

/** Generates an id and runs the insert; retries when a concurrent request grabbed the same id (ER_DUP_ENTRY). */
export async function insertWithGeneratedId(
  prefix: string,
  table: string,
  insert: (id: string) => Promise<void>,
  width = 3
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = await nextSequentialId(prefix, table, width);
    try {
      await insert(id);
      return id;
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_ENTRY' || !/PRIMARY/i.test(err.message || 'PRIMARY')) throw err;
    }
  }
  throw new Error(`Could not allocate a unique ${prefix} id`);
}
