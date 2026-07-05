import { describe, expect, it } from 'vitest';
import {
  buildFieldStyle,
  computeFontSizePx,
  getFormattingKey,
  patchFieldFormatting,
  resolveFieldFormatting,
} from './fieldFormatting';

describe('getFormattingKey', () => {
  it('uses indexed keys for list and block fields', () => {
    expect(getFormattingKey('listItem', 2)).toBe('listItem:2');
    expect(getFormattingKey('blockText', 0)).toBe('blockText:0');
    expect(getFormattingKey('gridDesc', 1)).toBe('gridDesc:1');
  });

  it('uses plain field keys for single-value fields', () => {
    expect(getFormattingKey('title')).toBe('title');
    expect(getFormattingKey('content', undefined)).toBe('content');
  });
});

describe('resolveFieldFormatting', () => {
  it('reads indexed formatting first', () => {
    const record = {
      'listItem:0': { color: '#ef4444' },
      'listItem:1': { color: '#3b82f6' },
    };
    expect(resolveFieldFormatting(record, 'listItem', 0)?.color).toBe('#ef4444');
    expect(resolveFieldFormatting(record, 'listItem', 1)?.color).toBe('#3b82f6');
  });

  it('falls back to legacy field key for indexed fields', () => {
    const record = { listItem: { fontSize: 'l' as const } };
    expect(resolveFieldFormatting(record, 'listItem', 3)?.fontSize).toBe('l');
  });
});

describe('computeFontSizePx', () => {
  it('scales relative to field base size', () => {
    expect(computeFontSizePx('content', 'm')).toBe('36px');
    expect(computeFontSizePx('content', 'l')).toBe('41px');
    expect(computeFontSizePx('blockText', 'xl')).toBe('47px');
  });

  it('respects custom base size for cover titles', () => {
    expect(computeFontSizePx('title', 'm', 88)).toBe('88px');
    expect(computeFontSizePx('title', 'l', 88)).toBe('101px');
  });

  it('returns undefined when no size is selected', () => {
    expect(computeFontSizePx('content', undefined)).toBeUndefined();
  });
});

describe('buildFieldStyle', () => {
  it('applies color and scaled font size', () => {
    const style = buildFieldStyle('blockText', { color: '#ef4444', fontSize: 'l' }, { lineHeight: 1.65 });
    expect(style).toEqual({
      lineHeight: 1.65,
      color: '#ef4444',
      fontSize: '41px',
    });
  });

  it('leaves font size unset for default formatting', () => {
    const style = buildFieldStyle('content', {}, { lineHeight: 1.65 });
    expect(style).toEqual({ lineHeight: 1.65 });
  });
});

describe('patchFieldFormatting', () => {
  it('writes indexed keys without affecting siblings', () => {
    const next = patchFieldFormatting({}, 'blockText', 1, { color: '#ef4444' });
    expect(next['blockText:1']).toEqual({ color: '#ef4444' });
    expect(next.blockText).toBeUndefined();
  });

  it('clears default color and font size values', () => {
    const initial = { title: { color: '#ef4444', fontSize: 'l' as const } };
    const next = patchFieldFormatting(initial, 'title', undefined, {
      color: undefined,
      fontSize: undefined,
    });
    expect(next.title).toBeUndefined();
  });

  it('updates text alignment on indexed fields', () => {
    const next = patchFieldFormatting({}, 'listItem', 0, { textAlign: 'center' });
    expect(next['listItem:0']).toEqual({ textAlign: 'center' });
  });
});
