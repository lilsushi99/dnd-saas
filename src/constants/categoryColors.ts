/** Suggested swatches for the Category Color picker. The database value is authoritative everywhere else. */
export const CATEGORY_COLOR_SWATCHES = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
export const FALLBACK_CATEGORY_COLOR = '#6B7280';
export const isHexColor = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
