import { Response } from 'express';

/** An error whose status code and message are safe to show to the client. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
export const badRequest = (m: string) => new HttpError(400, m);
export const notFound = (m: string) => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

/**
 * HttpError => its status. Database errors (they carry a `code`/`sqlMessage`) => 500 (the 5xx sanitiser hides detail).
 * Plain Error => 400, preserving the existing "validation thrown as Error" behaviour.
 */
export function sendError(res: Response, err: any, key: 'message' | 'error' = 'message'): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message, message: err.message });
    return;
  }
  if (err && (err.sqlMessage || err.errno || (typeof err.code === 'string' && /^(ER_|ECONN|ETIMEDOUT|PROTOCOL)/.test(err.code)))) {
    res.status(500).json({ success: false, [key]: err.message });
    return;
  }
  res.status(400).json({ success: false, error: err?.message, message: err?.message });
}
