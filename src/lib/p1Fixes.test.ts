import { describe, expect, it } from 'vitest';
import { buildGenerationWarnings, isFailedLinkScrape, isVisionModel } from './generationWarnings';
import {
  getRichTextPartClassName,
  getRichTextPartStyle,
  splitRichTextParagraph,
} from './richText';

describe('isVisionModel', () => {
  it('detects common vision-capable models', () => {
    expect(isVisionModel('gpt-4o')).toBe(true);
    expect(isVisionModel('claude-3-5-sonnet')).toBe(true);
    expect(isVisionModel('deepseek-chat')).toBe(false);
  });
});

describe('buildGenerationWarnings', () => {
  it('warns when images are ignored by non-vision model', () => {
    const warnings = buildGenerationWarnings({
      links: [],
      scrapedContents: [],
      imageCount: 2,
      modelName: 'deepseek-chat',
    });
    expect(warnings.some(w => w.includes('不支持图片'))).toBe(true);
  });

  it('warns for failed link scrapes', () => {
    const warnings = buildGenerationWarnings({
      links: ['https://example.com/a'],
      scrapedContents: ['[无法获取该链接内容: https://example.com/a]'],
      imageCount: 0,
      modelName: 'gpt-4o',
    });
    expect(warnings.some(w => w.includes('参考链接 1'))).toBe(true);
  });
});

describe('richText parsing', () => {
  it('splits markup parts correctly', () => {
    const parts = splitRichTextParagraph('普通<tag>标签</tag>和**加粗**');
    expect(parts.map(p => p.kind)).toEqual(['plain', 'tag', 'plain', 'bold']);
  });

  it('uses forced color for tag text when provided', () => {
    expect(getRichTextPartClassName('tag', '#ef4444')).toBe('font-semibold');
    expect(getRichTextPartStyle('tag', '#ef4444')).toEqual({ color: '#ef4444' });
  });

  it('keeps highlight background without overriding text color', () => {
    expect(getRichTextPartStyle('highlight', '#ef4444')).toBeUndefined();
  });
});

describe('isFailedLinkScrape', () => {
  it('detects scrape failure marker', () => {
    expect(isFailedLinkScrape('[无法获取该链接内容: https://x.com]')).toBe(true);
    expect(isFailedLinkScrape('正常正文')).toBe(false);
  });
});
