/**
 * Utility functions for hex color validation, manipulation, and theme presets.
 */

export const DEFAULT_PRIMARY_COLOR = '#1C64FF';

export const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export interface BrandColorPreset {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const PRESET_BRAND_COLORS: BrandColorPreset[] = [
  { id: 'nexus-blue', name: 'Nexus Blue', hex: '#1C64FF', description: 'Original enterprise blue' },
  { id: 'royal-indigo', name: 'Royal Indigo', hex: '#4F46E5', description: 'Deep tech indigo' },
  { id: 'emerald-green', name: 'Emerald Green', hex: '#059669', description: 'Growth & sustainable ops' },
  { id: 'teal-enterprise', name: 'Teal Enterprise', hex: '#0D9488', description: 'Balanced executive teal' },
  { id: 'amber-gold', name: 'Amber Gold', hex: '#D97706', description: 'Warm amber executive' },
  { id: 'violet-purple', name: 'Executive Violet', hex: '#7C3AED', description: 'Modern vibrant violet' },
  { id: 'corporate-slate', name: 'Corporate Slate', hex: '#334155', description: 'Minimalist neutral dark' },
  { id: 'crimson-rose', name: 'Crimson Rose', hex: '#E11D48', description: 'Energetic bold crimson' },
];

export function isValidHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  return HEX_COLOR_REGEX.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) return DEFAULT_PRIMARY_COLOR;
  const clean = hex.trim();
  if (clean.length === 4) {
    // #RGB -> #RRGGBB
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
  }
  return clean.substring(0, 7).toUpperCase();
}

/** Parse hex color to RGB numbers */
function parseRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.substring(1, 3), 16) || 0;
  const g = parseInt(norm.substring(3, 5), 16) || 0;
  const b = parseInt(norm.substring(5, 7), 16) || 0;
  return [r, g, b];
}

/** Darken a hex color by given percentage (0-100) */
export function darkenHex(hex: string, percent = 12): string {
  const [r, g, b] = parseRgb(hex);
  const factor = Math.max(0, 1 - percent / 100);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`.toUpperCase();
}

/** Lighten a hex color by given percentage (0-100) */
export function lightenHex(hex: string, percent = 15): string {
  const [r, g, b] = parseRgb(hex);
  const factor = Math.min(100, Math.max(0, percent)) / 100;
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`.toUpperCase();
}

/** Convert hex to rgba string */
export function hexToRgba(hex: string, alpha = 0.1): string {
  const [r, g, b] = parseRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Determine whether a hex color is perceived as light (true) or dark (false) */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = parseRgb(hex);
  // Using perceived luminance formula (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.65;
}
