import { badRequest } from './errors';

export const CATEGORY_PALETTE = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
export const DEFAULT_CATEGORY_COLOR = '#6B7280';
export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export interface TextRules { label: string; min?: number; max: number; required?: boolean }

export function cleanText(value: unknown, rules: TextRules): string | undefined {
  if (value === undefined || value === null) {
    if (rules.required) throw badRequest(`${rules.label} is required.`);
    return undefined;
  }
  if (typeof value !== 'string') throw badRequest(`${rules.label} must be text.`);
  const v = value.replace(/\s+/g, ' ').trim();
  if (v.length === 0) {
    if (rules.required) throw badRequest(`${rules.label} is required.`);
    return '';
  }
  if (rules.min && v.length < rules.min) throw badRequest(`${rules.label} must be at least ${rules.min} characters.`);
  if (v.length > rules.max) throw badRequest(`${rules.label} must be at most ${rules.max} characters.`);
  return v;
}

export function cleanStatus(value: unknown): 'Active' | 'Inactive' | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value !== 'Active' && value !== 'Inactive') throw badRequest('Status must be Active or Inactive.');
  return value;
}

export function cleanColor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !HEX_COLOR_RE.test(value.trim())) throw badRequest('Category color must be a hex value like #3B82F6.');
  return value.trim().toUpperCase();
}

export function cleanNonNegativeNumber(value: unknown, label: string, opts: { integer?: boolean; max?: number } = {}): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) throw badRequest(`${label} must be a non-negative number.`);
  if (opts.integer && !Number.isInteger(n)) throw badRequest(`${label} must be a whole number.`);
  if (opts.max !== undefined && n > opts.max) throw badRequest(`${label} is too large.`);
  return n;
}

/** Color to give a new category when none is chosen: first palette colour not already used, else cycle. */
export function pickDefaultColor(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toUpperCase()));
  return CATEGORY_PALETTE.find((c) => !used.has(c)) ?? CATEGORY_PALETTE[usedColors.length % CATEGORY_PALETTE.length];
}
