import type { ContentBlock } from '../types/cardEditor';
import type { FieldFormatting } from './fieldFormatting';

export type CardRenderDoc = {
  images: string[];
  tags: string[];
  authorInfo: {
    name: string;
    handle: string;
    avatarImage: string;
  };
  generatedAt?: number;
};

export type CardRenderSource = {
  title: string;
  subtitle?: string;
  hookText?: string;
  content: string;
  imageIndex?: number;
  imageIndex2?: number;
  imageData?: string;
  image2Data?: string;
  isCover?: boolean;
  layout?: 'cover' | 'text' | 'list' | 'terminal' | 'grid';
  listItems?: string[];
  terminalLines?: { type: string; text: string }[];
  gridItems?: { name: string; desc: string }[];
  blocks?: ContentBlock[];
  fieldFormatting?: Record<string, FieldFormatting>;
};

export function buildCardRenderProps(
  card: CardRenderSource,
  doc: CardRenderDoc,
  cardIndex: number,
  total: number,
  options: { editable?: boolean } = {},
) {
  return {
    cardIndex,
    index: cardIndex + 1,
    total,
    title: card.title,
    subtitle: card.subtitle,
    hookText: card.hookText,
    content: card.content,
    isCover: card.isCover,
    layout: card.layout,
    listItems: card.listItems,
    terminalLines: card.terminalLines,
    gridItems: card.gridItems,
    blocks: card.blocks,
    blockImages: card.blocks?.map(block =>
      block.type === 'image'
        ? block.imageData || (block.imageIndex !== undefined ? doc.images[block.imageIndex] : undefined)
        : undefined,
    ),
    coverTags: card.isCover ? doc.tags : undefined,
    fieldFormatting: card.fieldFormatting,
    image: card.imageData || (card.imageIndex !== undefined ? doc.images[card.imageIndex] : undefined),
    image2: card.image2Data || (card.imageIndex2 !== undefined ? doc.images[card.imageIndex2] : undefined),
    authorInfo: doc.authorInfo,
    generatedAt: doc.generatedAt || Date.now(),
    editable: options.editable ?? false,
  };
}
