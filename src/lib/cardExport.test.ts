import { describe, expect, it } from 'vitest';
import { buildCardRenderProps } from './buildCardRenderProps';
import {
  CARD_ASPECT_RATIO,
  CARD_HEIGHT,
  CARD_WIDTH,
  getExportPreviewScale,
  getScaledCardSize,
} from './cardExport';

describe('cardExport', () => {
  it('keeps 3:4 card dimensions', () => {
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(3 / 4, 2);
    expect(CARD_ASPECT_RATIO).toBeCloseTo(0.75, 2);
  });

  it('scales preview to fit container while preserving ratio', () => {
    const scale = getExportPreviewScale(480, 720);
    const size = getScaledCardSize(scale);
    expect(size.width / size.height).toBeCloseTo(CARD_ASPECT_RATIO, 2);
    expect(size.width).toBeLessThanOrEqual(480);
    expect(size.height).toBeLessThanOrEqual(720);
  });

  it('never scales preview above 1', () => {
    expect(getExportPreviewScale(2000, 3000)).toBeLessThanOrEqual(1);
  });
});

describe('buildCardRenderProps', () => {
  it('resolves block and cover images from doc', () => {
    const props = buildCardRenderProps(
      {
        title: '标题',
        content: '正文',
        isCover: true,
        blocks: [{ type: 'image', imageIndex: 0 }],
        imageIndex: 1,
      },
      {
        images: ['block.png', 'cover.png'],
        tags: ['tag1'],
        authorInfo: { name: 'Jinger', handle: '@j', avatarImage: '' },
        generatedAt: 1000,
      },
      0,
      2,
    );

    expect(props.image).toBe('cover.png');
    expect(props.blockImages).toEqual(['block.png']);
    expect(props.coverTags).toEqual(['tag1']);
    expect(props.index).toBe(1);
    expect(props.total).toBe(2);
  });
});
