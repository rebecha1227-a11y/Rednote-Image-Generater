import type { CSSProperties } from 'react';
import type { CardEditorField } from '../types/cardEditor';

export type FieldFormatting = {
  fontSize?: 's' | 'm' | 'l' | 'xl';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
};

const INDEXED_FIELDS = new Set<CardEditorField>([
  'listItem',
  'terminalLine',
  'gridName',
  'gridDesc',
  'blockText',
]);

export const FIELD_FONT_BASE_PX: Partial<Record<CardEditorField, number>> = {
  title: 58,
  subtitle: 30,
  hookText: 28,
  content: 36,
  listItem: 28,
  terminalLine: 26,
  gridName: 22,
  gridDesc: 22,
  blockText: 36,
};

export const FONT_SIZE_SCALE: Record<NonNullable<FieldFormatting['fontSize']>, number> = {
  s: 0.8,
  m: 1,
  l: 1.15,
  xl: 1.3,
};

export const DEFAULT_TEXT_COLOR = '#0f1419';

export function getFormattingKey(field: CardEditorField, itemIndex?: number): string {
  if (itemIndex !== undefined && INDEXED_FIELDS.has(field)) {
    return `${field}:${itemIndex}`;
  }
  return field;
}

export function resolveFieldFormatting(
  fieldFormatting: Record<string, FieldFormatting> | undefined,
  field: CardEditorField,
  itemIndex?: number,
): FieldFormatting | undefined {
  if (!fieldFormatting) return undefined;
  const indexedKey = getFormattingKey(field, itemIndex);
  if (fieldFormatting[indexedKey]) return fieldFormatting[indexedKey];
  if (itemIndex !== undefined && INDEXED_FIELDS.has(field) && fieldFormatting[field]) {
    return fieldFormatting[field];
  }
  return fieldFormatting[field];
}

export function computeFontSizePx(
  field: CardEditorField,
  fontSize: FieldFormatting['fontSize'] | undefined,
  fontBasePx?: number,
): string | undefined {
  if (!fontSize) return undefined;
  const base = fontBasePx ?? FIELD_FONT_BASE_PX[field] ?? 36;
  return `${Math.round(base * FONT_SIZE_SCALE[fontSize])}px`;
}

export function buildFieldStyle(
  field: CardEditorField,
  fmt: FieldFormatting | undefined,
  baseStyle: CSSProperties = {},
  fontBasePx?: number,
): CSSProperties {
  return {
    ...baseStyle,
    ...(fmt?.color ? { color: fmt.color } : {}),
    ...(fmt?.textAlign ? { textAlign: fmt.textAlign } : {}),
    ...(computeFontSizePx(field, fmt?.fontSize, fontBasePx)
      ? { fontSize: computeFontSizePx(field, fmt?.fontSize, fontBasePx) }
      : {}),
  };
}

export function patchFieldFormatting(
  fieldFormatting: Record<string, FieldFormatting> | undefined,
  field: CardEditorField,
  itemIndex: number | undefined,
  patch: Partial<FieldFormatting>,
): Record<string, FieldFormatting> {
  const next = { ...(fieldFormatting || {}) };
  const key = getFormattingKey(field, itemIndex);
  const current = { ...(next[key] || {}) };

  if ('fontSize' in patch) {
    if (patch.fontSize) current.fontSize = patch.fontSize;
    else delete current.fontSize;
  }
  if ('color' in patch) {
    if (patch.color && patch.color !== DEFAULT_TEXT_COLOR) current.color = patch.color;
    else delete current.color;
  }
  if ('textAlign' in patch) {
    if (patch.textAlign) current.textAlign = patch.textAlign;
    else delete current.textAlign;
  }

  if (Object.keys(current).length === 0) delete next[key];
  else next[key] = current;
  return next;
}
