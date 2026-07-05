export type RichTextPartKind = 'plain' | 'highlight' | 'tag' | 'bold' | 'italic';

export type RichTextPart = {
  kind: RichTextPartKind;
  text: string;
};

export function splitRichTextParagraph(para: string): RichTextPart[] {
  const parts = para.split(/(<highlight>.*?<\/highlight>|<tag>.*?<\/tag>|\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
  return parts.map(part => {
    const highlightMatch = part.match(/^<highlight>(.*?)<\/highlight>$/);
    if (highlightMatch) return { kind: 'highlight' as const, text: highlightMatch[1] };
    const tagMatch = part.match(/^<tag>(.*?)<\/tag>$/);
    if (tagMatch) return { kind: 'tag' as const, text: tagMatch[1] };
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
    if (boldMatch) return { kind: 'bold' as const, text: boldMatch[1] };
    const italicMatch = part.match(/^\*(.*?)\*$/);
    if (italicMatch) return { kind: 'italic' as const, text: italicMatch[1] };
    return { kind: 'plain' as const, text: part };
  });
}

export function getRichTextPartClassName(kind: RichTextPartKind, forceColor?: string): string {
  switch (kind) {
    case 'highlight':
      return 'bg-[linear-gradient(to_top,#fef08a_40%,transparent_40%)]';
    case 'tag':
      return forceColor ? 'font-semibold' : 'text-[#1d9bf0] font-semibold';
    case 'bold':
      return 'font-black';
    case 'italic':
      return '';
    default:
      return '';
  }
}

export function getRichTextPartStyle(kind: RichTextPartKind, forceColor?: string): { color?: string } | undefined {
  if (!forceColor || kind === 'highlight') return undefined;
  if (kind === 'tag' || kind === 'plain' || kind === 'bold' || kind === 'italic') {
    return { color: forceColor };
  }
  return undefined;
}
