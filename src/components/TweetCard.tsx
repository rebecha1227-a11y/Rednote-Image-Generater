import React, { forwardRef } from 'react';
import { MoreHorizontal, Sparkles, ImagePlus, UserRound, Plus, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CardEditorField = 'title' | 'subtitle' | 'hookText' | 'content' | 'listItem' | 'terminalLine' | 'gridName' | 'gridDesc' | 'blockText';

export type ContentBlock = {
  type: 'text' | 'image';
  text?: string;
  imageIndex?: number;
  imageData?: string;
};

type CardProps = {
  cardIndex?: number;
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  hookText?: string;
  content: string;
  image?: string;
  image2?: string;
  isCover?: boolean;
  layout?: 'cover' | 'text' | 'list' | 'terminal' | 'grid';
  listItems?: string[];
  terminalLines?: { type: string; text: string }[];
  gridItems?: { name: string; desc: string }[];
  blocks?: ContentBlock[];
  blockImages?: (string | undefined)[];
  coverTags?: string[];
  generatedAt?: number;
  fieldFormatting?: Record<string, { fontSize?: string; color?: string; textAlign?: string }>;
  authorInfo?: {
    name: string;
    handle: string;
    avatarImage: string;
  };
  className?: string;
  editable?: boolean;
  activeEditor?: {
    cardIndex: number;
    field: CardEditorField;
    itemIndex?: number;
  } | null;
  editingValue?: string;
  onEditingValueChange?: (value: string) => void;
  onStartEdit?: (field: CardEditorField, itemIndex?: number) => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
  onSelectText?: (field: CardEditorField, selectedText: string, itemIndex?: number) => void;
  onPickImage?: (blockIndex?: number) => void;
  onMoveBlock?: (fromIndex: number, toIndex: number) => void;
  onAddBlock?: (type: 'text' | 'image', afterIndex: number) => void;
  onDeleteBlock?: (index: number) => void;
};

type RenderCtx = {
  title: string;
  content: string;
  image?: string;
  image2?: string;
  subtitle?: string;
  hookText?: string;
  listItems?: string[];
  terminalLines?: { type: string; text: string }[];
  gridItems?: { name: string; desc: string }[];
  blocks?: ContentBlock[];
  blockImages?: (string | undefined)[];
  coverTags?: string[];
  fieldFormatting?: Record<string, { fontSize?: string; color?: string; textAlign?: string }>;
};

type EditHelpers = {
  editable?: boolean;
  activeEditor?: CardProps['activeEditor'];
  editingValue?: string;
  onEditingValueChange?: (value: string) => void;
  onStartEdit?: (field: CardEditorField, itemIndex?: number) => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
  onSelectText?: (field: CardEditorField, selectedText: string, itemIndex?: number) => void;
  onPickImage?: (blockIndex?: number) => void;
  onMoveBlock?: (fromIndex: number, toIndex: number) => void;
  onAddBlock?: (type: 'text' | 'image', afterIndex: number) => void;
  onDeleteBlock?: (index: number) => void;
  fieldFormatting?: Record<string, { fontSize?: string; color?: string; textAlign?: string }>;
};

function IconReply() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-[#536471] stroke-[1.8] stroke-linecap-round stroke-linejoin-round">
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.306-2.394 5.862l-3.609 3.742c-.305.316-.757.428-1.166.295-.41-.133-.69-.506-.69-.94v-3.32a.752.752 0 00-.75-.75H9.756c-4.421 0-8.005-3.58-8.005-8.02z" />
    </svg>
  );
}

function IconRetweet() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-[#536471] stroke-[1.8] stroke-linecap-round stroke-linejoin-round">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h4v2h-4c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46L18.5 16.45V8c0-1.1-.896-2-2-2h-4V4h4c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-[#536471] stroke-[1.8] stroke-linecap-round stroke-linejoin-round">
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.1-.806-1.1C10.082 6.01 8.625 5.44 7.403 5.5 5.203 5.56 3.5 7.38 3.5 9.58c0 3.54 3.94 6.97 7.737 9.87.276.21.592.32.763.32.17 0 .488-.11.763-.32C16.56 16.55 20.5 13.12 20.5 9.58c0-2.2-1.703-4.02-3.803-4.08z" />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-[#536471] stroke-[1.8] stroke-linecap-round stroke-linejoin-round">
      <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-[#536471] stroke-[1.8] stroke-linecap-round stroke-linejoin-round">
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5V15h2z" />
    </svg>
  );
}

function renderRichText(text: string) {
  const paragraphs = text.split('\n');
  return paragraphs.map((para, pIdx) => {
    const parts = para.split(/(<highlight>.*?<\/highlight>|<tag>.*?<\/tag>|\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
    const elements = parts.map((part, index) => {
      const highlightMatch = part.match(/^<highlight>(.*?)<\/highlight>$/);
      if (highlightMatch) {
        return <span key={index} className="bg-[linear-gradient(to_top,#fef08a_40%,transparent_40%)]">{highlightMatch[1]}</span>;
      }
      const tagMatch = part.match(/^<tag>(.*?)<\/tag>$/);
      if (tagMatch) {
        return <span key={index} className="text-[#1d9bf0] font-semibold">{tagMatch[1]}</span>;
      }
      const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (boldMatch) {
        return <strong key={index} className="font-black">{boldMatch[1]}</strong>;
      }
      const italicMatch = part.match(/^\*(.*?)\*$/);
      if (italicMatch) {
        return <em key={index}>{italicMatch[1]}</em>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
    return <div key={pIdx} className={pIdx > 0 ? 'mt-6' : ''}>{elements}</div>;
  });
}

function handleSelection(field: CardEditorField, onSelectText?: EditHelpers['onSelectText'], itemIndex?: number) {
  const selected = window.getSelection()?.toString() || '';
  if (selected.trim()) onSelectText?.(field, selected, itemIndex);
}

const FONT_SIZE_MAP: Record<string, string> = {
  s: '24px',
  m: '32px',
  l: '44px',
  xl: '58px',
};

function renderEditableText(field: CardEditorField, value: string, className: string, style: React.CSSProperties, helpers: EditHelpers, itemIndex?: number) {
  const fmt = helpers.fieldFormatting?.[field];
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(fmt?.color ? { color: fmt.color } : {}),
    ...(fmt?.textAlign ? { textAlign: fmt.textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(fmt?.fontSize ? { fontSize: FONT_SIZE_MAP[fmt.fontSize] } : {}),
  };
  const isEditing = !!helpers.activeEditor && helpers.activeEditor.field === field && helpers.activeEditor.itemIndex === itemIndex;
  if (!helpers.editable) {
    return <div className={className} style={mergedStyle}>{renderRichText(value)}</div>;
  }
  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={helpers.editingValue || ''}
        onChange={e => helpers.onEditingValueChange?.(e.target.value)}
        onBlur={helpers.onCommitEdit}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') helpers.onCommitEdit?.();
          if (e.key === 'Escape') helpers.onCancelEdit?.();
        }}
        className={cn(className, 'rounded-2xl border-2 border-[#1d9bf0] bg-white/95 p-3 outline-none resize-none')}
        style={mergedStyle}
      />
    );
  }
  return (
    <div
      className={cn(className, 'cursor-text hover:ring-2 hover:ring-[#1d9bf0]/20 hover:rounded-2xl transition-all')}
      style={mergedStyle}
      onClick={() => helpers.onStartEdit?.(field, itemIndex)}
      onMouseUp={() => handleSelection(field, helpers.onSelectText, itemIndex)}
    >
      {renderRichText(value || '点击编辑')}
    </div>
  );
}

function renderCover(ctx: RenderCtx, helpers: EditHelpers) {
  const { title, subtitle, hookText, image, image2, coverTags } = ctx;
  return (
    <div className="flex flex-col h-full" style={{ justifyContent: 'flex-start', gap: 0 }}>
      {renderEditableText('title', title, 'text-[88px] font-black text-[#0f1419] leading-none tracking-tighter mb-2', { letterSpacing: '-0.04em', lineHeight: 1.15 }, helpers)}
      {renderEditableText('subtitle', subtitle || '', 'text-[30px] text-[#536471] mt-4 leading-snug', {}, helpers)}

      <div className="relative w-full mt-7" style={{ height: '580px' }}>
        {image ? (
          <>
            <img
              src={image}
              className="absolute rounded-[20px] object-cover shadow-lg border border-gray-200"
              style={{ width: '55%', height: '90%', top: '5%', left: 0, zIndex: 2, transform: 'rotate(-2deg)' }}
              alt=""
            />
            <button
              onClick={() => helpers.onPickImage?.(-1)}
              className="absolute rounded-[20px] border border-gray-200 shadow-lg overflow-hidden cursor-pointer flex items-center justify-center"
              style={{ width: '55%', height: '90%', top: 0, right: 0, zIndex: 1, transform: 'rotate(2deg)' }}
            >
              {image2 ? (
                <img src={image2} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fef2f2 0%, #fde2c8 100%)' }}>
                  <ImagePlus className="w-16 h-16 mt-20 text-gray-300" />
                  <span className="text-xl font-bold text-gray-400">点击上传</span>
                </div>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => helpers.onPickImage?.()}
              className="absolute rounded-[20px] shadow-lg border border-dashed border-gray-300 flex items-center justify-center bg-gradient-to-br from-[#fef2f2] to-[#fee2e2]"
              style={{ width: '55%', height: '90%', top: '5%', left: 0, zIndex: 2, transform: 'rotate(-2deg)' }}
            >
              <div className="flex flex-col items-center gap-4 text-red-200">
                <ImagePlus className="w-24 h-24" />
                <span className="text-2xl font-bold text-[#0f1419]">点击插入图片</span>
              </div>
            </button>
            <button
              onClick={() => helpers.onPickImage?.(-1)}
              className="absolute rounded-[20px] shadow-lg border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden"
              style={{ width: '55%', height: '90%', top: 0, right: 0, zIndex: 1, transform: 'rotate(2deg)' }}
            >
              {image2 ? (
                <img src={image2} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)' }}>
                  <ImagePlus className="w-16 h-16 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-600">点击上传图片</span>
                </div>
              )}
            </button>
          </>
        )}

        <svg className="absolute w-12 h-12 z-3" style={{ top: '8%', right: '12%' }} viewBox="0 0 24 24" fill="#fbbf24">
          <path d="M12 2l2.4 7.2L22 9.5l-5.8 5.1 1.7 7.4L12 17.8 6.1 22l1.7-7.4L2 9.5l7.6-.3L12 2z" />
        </svg>
        <div className="absolute z-3 bg-[#0f1419] text-white font-bold px-5 py-2.5 rounded-xl text-xl whitespace-nowrap tracking-wide" style={{ bottom: '12%', left: '8%' }}>
          AI VIBE CODING
        </div>
        <div className="absolute z-3 w-4 h-4 rounded-full bg-[#f38ba8]" style={{ top: '18%', left: '62%' }} />
        <div className="absolute z-3 w-3 h-3 rounded-full bg-[#89b4fa]" style={{ top: '14%', left: '68%' }} />
      </div>

      {/* hookText 引导语 */}
      {(hookText || helpers.editable) && (
        <div className="mt-6">
          {renderEditableText('hookText', hookText || '', 'text-[28px] text-[#536471] leading-relaxed', { lineHeight: 1.6 }, helpers)}
        </div>
      )}

      {/* coverTags 标签 */}
      {coverTags && coverTags.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-auto pt-6">
          {coverTags.map((tag, i) => (
            <span key={i} className="px-5 py-2 rounded-full text-[22px] font-bold" style={{ background: '#fef2f2', color: '#ef4444' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function renderBlockSequence(ctx: RenderCtx, helpers: EditHelpers) {
  const blocks = ctx.blocks;
  return (
    <div className="flex flex-col gap-5 flex-1 overflow-hidden min-h-0">
      {blocks && blocks.map((block, i) => {
        const isEditingThis = helpers.activeEditor?.field === 'blockText' && helpers.activeEditor?.itemIndex === i;
        if (block.type === 'image') {
          const imgSrc = ctx.blockImages?.[i];
          return (
            <div key={i} className="relative group/block">
              {imgSrc ? (
                <div className="rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                  <img src={imgSrc} className="w-full object-cover max-h-[500px]" alt="" />
                </div>
              ) : helpers.editable ? (
                <button
                  onClick={() => helpers.onPickImage?.(i)}
                  className="w-full rounded-3xl border-2 border-dashed border-gray-300 h-[240px] flex items-center justify-center text-gray-400"
                >
                  <div className="flex flex-col items-center gap-3">
                    <ImagePlus className="w-12 h-12" />
                    <span className="text-[28px] font-bold">点击插图</span>
                  </div>
                </button>
              ) : null}
              {helpers.editable && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                  {i > 0 && <button onClick={() => helpers.onMoveBlock?.(i, i - 1)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 text-[20px] font-bold">↑</button>}
                  {i < blocks.length - 1 && <button onClick={() => helpers.onMoveBlock?.(i, i + 1)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 text-[20px] font-bold">↓</button>}
                  <button onClick={() => helpers.onDeleteBlock?.(i)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-red-400 hover:text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          );
        }
        return (
          <div key={i} className="relative group/block">
            {isEditingThis ? (
              <textarea
                autoFocus
                value={helpers.editingValue || ''}
                onChange={e => helpers.onEditingValueChange?.(e.target.value)}
                onBlur={helpers.onCommitEdit}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') helpers.onCommitEdit?.();
                  if (e.key === 'Escape') helpers.onCancelEdit?.();
                }}
                className="w-full rounded-2xl border-2 border-[#1d9bf0] bg-white/95 p-3 outline-none resize-none text-[36px] text-[#0f1419]"
                style={{ lineHeight: 1.65 }}
              />
            ) : (
              <div
                className={cn('text-[36px] text-[#0f1419]', helpers.editable && 'cursor-text hover:ring-2 hover:ring-[#1d9bf0]/20 hover:rounded-2xl transition-all')}
                style={{ lineHeight: 1.65, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                onClick={() => helpers.onStartEdit?.('blockText', i)}
                onMouseUp={() => handleSelection('blockText', helpers.onSelectText, i)}
              >
                {renderRichText(block.text || '点击编辑')}
              </div>
            )}
            {helpers.editable && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                {i > 0 && <button onClick={() => helpers.onMoveBlock?.(i, i - 1)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 text-[20px] font-bold">↑</button>}
                {i < blocks.length - 1 && <button onClick={() => helpers.onMoveBlock?.(i, i + 1)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 text-[20px] font-bold">↓</button>}
                <button onClick={() => helpers.onDeleteBlock?.(i)} className="w-10 h-10 rounded-lg bg-white/90 shadow flex items-center justify-center text-red-400 hover:text-red-600">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {helpers.editable && (
        <div className="flex gap-3 mt-2">
          <button onClick={() => helpers.onAddBlock?.('text', blocks ? blocks.length - 1 : -1)} className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all text-[24px]">
            <Plus className="w-6 h-6" /> 文字块
          </button>
          <button onClick={() => helpers.onAddBlock?.('image', blocks ? blocks.length - 1 : -1)} className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all text-[24px]">
            <ImagePlus className="w-6 h-6" /> 图片块
          </button>
        </div>
      )}
    </div>
  );
}

function renderText(ctx: RenderCtx, helpers: EditHelpers) {
  const blocks = ctx.blocks;
  if (blocks && blocks.length > 0) {
    return (
      <>
        {renderEditableText('title', ctx.title, 'text-[58px] font-black text-[#0f1419] leading-tight mb-6 shrink-0', { letterSpacing: '-0.02em', lineHeight: 1.25 }, helpers)}
        {renderBlockSequence(ctx, helpers)}
      </>
    );
  }
  return (
    <>
      {renderEditableText('title', ctx.title, 'text-[58px] font-black text-[#0f1419] leading-tight mb-6 shrink-0', { letterSpacing: '-0.02em', lineHeight: 1.25 }, helpers)}
      {renderEditableText('content', ctx.content, 'flex-1 min-h-0 overflow-hidden text-[36px] text-[#0f1419]', { lineHeight: 1.65, wordBreak: 'keep-all', overflowWrap: 'break-word' }, helpers)}
      {ctx.image ? (
        <div className="mt-6 mb-4 rounded-3xl overflow-hidden shadow-lg border-4 border-white">
          <img src={ctx.image} className="w-full object-cover max-h-[550px]" alt="" />
        </div>
      ) : null}
      {renderBlockSequence(ctx, helpers)}
    </>
  );
}

function renderList(ctx: RenderCtx, helpers: EditHelpers) {
  const items = ctx.listItems || ctx.content.split('\n').filter(Boolean);
  return (
    <>
      {renderEditableText('title', ctx.title, 'text-[58px] font-black text-[#0f1419] leading-tight mb-6 shrink-0', { letterSpacing: '-0.02em', lineHeight: 1.25 }, helpers)}
      {renderEditableText('content', ctx.content, 'text-[36px] text-[#0f1419] mb-6 shrink-0', { lineHeight: 1.65 }, helpers)}
      <div className="flex flex-col gap-5 flex-1 overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-9 h-9 rounded-full bg-[#0f1419] flex items-center justify-center text-white font-bold shrink-0 mt-1" style={{ fontSize: '18px' }}>
              {i + 1}
            </div>
            {renderEditableText('listItem', item, 'text-[28px] text-[#0f1419] leading-relaxed flex-1', { wordBreak: 'keep-all' }, helpers, i)}
          </div>
        ))}
      </div>
      {ctx.image && (
        <div className="mt-6 rounded-3xl overflow-hidden shadow-lg border-4 border-white shrink-0">
          <img src={ctx.image} className="w-full object-cover max-h-[550px]" alt="" />
        </div>
      )}
      {renderBlockSequence(ctx, helpers)}
    </>
  );
}

function renderTerminal(ctx: RenderCtx, helpers: EditHelpers) {
  const lines = ctx.terminalLines || [];
  return (
    <>
      {ctx.title && renderEditableText('title', ctx.title, 'text-[58px] font-black text-[#0f1419] leading-tight mb-6 shrink-0', { letterSpacing: '-0.02em', lineHeight: 1.25 }, helpers)}
      {ctx.content && renderEditableText('content', ctx.content, 'text-[36px] text-[#0f1419] mb-6 shrink-0', { lineHeight: 1.65 }, helpers)}
      <div className="rounded-[20px] overflow-hidden shadow-lg shrink-0" style={{ background: '#1e1e2e' }}>
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: '#313244' }}>
          <div className="w-4 h-4 rounded-full bg-[#f38ba8]" />
          <div className="w-4 h-4 rounded-full bg-[#f9e2af]" />
          <div className="w-4 h-4 rounded-full bg-[#a6e3a1]" />
          <div className="flex-1 text-center text-lg text-[#6c7086]">Terminal — zsh</div>
        </div>
        <div className="px-9 py-8 font-mono text-[26px] leading-relaxed" style={{ color: '#cdd6f4' }}>
          {lines.length > 0 ? lines.map((line, i) => {
            let colorClass = '';
            let prefix = '';
            switch (line.type) {
              case 'command': colorClass = 'text-[#89b4fa]'; prefix = '~ '; break;
              case 'output': colorClass = 'text-[#6c7086]'; break;
              case 'success': colorClass = 'text-[#a6e3a1]'; prefix = '✓ '; break;
              case 'prompt': colorClass = 'text-[#a6e3a1]'; break;
              default: colorClass = 'text-[#6c7086]';
            }
            return (
              <div key={i} className={colorClass} onClick={() => helpers.onStartEdit?.('terminalLine', i)} onMouseUp={() => handleSelection('terminalLine', helpers.onSelectText, i)}>
                {helpers.activeEditor?.field === 'terminalLine' && helpers.activeEditor?.itemIndex === i ? (
                  <textarea
                    autoFocus
                    value={helpers.editingValue || ''}
                    onChange={e => helpers.onEditingValueChange?.(e.target.value)}
                    onBlur={helpers.onCommitEdit}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') helpers.onCommitEdit?.();
                      if (e.key === 'Escape') helpers.onCancelEdit?.();
                    }}
                    className="w-full rounded-lg border border-[#89b4fa] bg-[#11111b] p-2 outline-none resize-none"
                  />
                ) : (
                  <span className="cursor-text">{prefix}{line.text}</span>
                )}
              </div>
            );
          }) : <div className="text-[#6c7086]">No output</div>}
        </div>
      </div>
      {ctx.image && (
        <div className="mt-6 rounded-3xl overflow-hidden shadow-lg border-4 border-white shrink-0">
          <img src={ctx.image} className="w-full object-cover max-h-[550px]" alt="" />
        </div>
      )}
      {renderBlockSequence(ctx, helpers)}
    </>
  );
}

function renderGrid(ctx: RenderCtx, helpers: EditHelpers) {
  const items = ctx.gridItems || [];
  return (
    <>
      {renderEditableText('title', ctx.title, 'text-[58px] font-black text-[#0f1419] leading-tight mb-6 shrink-0', { letterSpacing: '-0.02em', lineHeight: 1.25 }, helpers)}
      {ctx.content && renderEditableText('content', ctx.content, 'text-[36px] text-[#0f1419] mb-6 shrink-0', { lineHeight: 1.65 }, helpers)}
      <div className="grid grid-cols-2 gap-5 flex-1 overflow-hidden content-start">
        {items.map((item, i) => (
          <div key={i} className="rounded-[20px] p-7 border" style={{ background: '#f7f9f9', borderColor: '#eff3f4' }}>
            {renderEditableText('gridName', item.name, 'font-mono text-[22px] text-[#1d9bf0] font-semibold mb-2.5', {}, helpers, i)}
            {renderEditableText('gridDesc', item.desc, 'text-[22px] text-[#536471] leading-relaxed', {}, helpers, i)}
          </div>
        ))}
      </div>
      {ctx.image && (
        <div className="mt-6 rounded-3xl overflow-hidden shadow-lg border-4 border-white shrink-0">
          <img src={ctx.image} className="w-full object-cover max-h-[550px]" alt="" />
        </div>
      )}
      {renderBlockSequence(ctx, helpers)}
    </>
  );
}

function formatBeijingTime(ts: number) {
  const d = new Date(ts);
  const parts = Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: 'numeric', minute: '2-digit', hour12: true,
    month: 'short', day: 'numeric', year: 'numeric',
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('dayPeriod')} · ${get('month')} ${get('day')}, ${get('year')} · 522.9K Views`;
}

export const TweetCard = forwardRef<HTMLDivElement, CardProps>(({
  cardIndex = 0,
  index,
  total,
  title,
  subtitle,
  hookText,
  content,
  image,
  image2,
  isCover = false,
  layout = 'text',
  listItems,
  terminalLines,
  gridItems,
  blocks,
  blockImages,
  coverTags,
  generatedAt,
  fieldFormatting,
  authorInfo = { name: 'Jinger', handle: '@Jinger_Vibe', avatarImage: '' },
  className,
  editable,
  activeEditor,
  editingValue,
  onEditingValueChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onSelectText,
  onPickImage,
  onMoveBlock,
  onAddBlock,
  onDeleteBlock,
}, ref) => {
  const ctx: RenderCtx = { title, content, image, image2, subtitle, hookText, listItems, terminalLines, gridItems, blocks, blockImages, coverTags, fieldFormatting };
  const helpers: EditHelpers = {
    editable,
    activeEditor: activeEditor?.cardIndex === cardIndex ? activeEditor : null,
    editingValue,
    onEditingValueChange,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    onSelectText,
    onPickImage,
    onMoveBlock,
    onAddBlock,
    onDeleteBlock,
    fieldFormatting,
  };
  const dateStr = generatedAt ? formatBeijingTime(generatedAt) : formatBeijingTime(Date.now());

  return (
    <div ref={ref} className={cn('relative bg-white overflow-hidden flex flex-col', 'w-[1242px] h-[1660px] shrink-0', className)}>
      <div className="flex items-start px-20 pt-16 gap-4 shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-red-50 flex-shrink-0 border border-gray-100">
          {authorInfo.avatarImage ? (
            <img src={authorInfo.avatarImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
              <UserRound className="w-9 h-9" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[28px] font-bold text-[#0f1419] leading-tight">{authorInfo.name}</span>
            <svg viewBox="0 0 22 22" className="w-7 h-7 shrink-0">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.646-.018 1.273-.215 1.813-.569.54-.354.97-.853 1.24-1.438.608.226 1.267.276 1.902.143.635-.131 1.22-.437 1.69-.883.445-.469.749-1.054.878-1.69.131-.633.08-1.29-.14-1.896.587-.273 1.084-.705 1.438-1.245.355-.54.553-1.17.57-1.817z" fill="#1d9bf0"/>
              <path d="M9.585 14.929l-3.28-3.28 1.168-1.168 2.112 2.112 5.06-5.06 1.168 1.168-6.228 6.228z" fill="#fff"/>
            </svg>
          </div>
          <span className="text-[24px] text-[#536471]">{authorInfo.handle}</span>
        </div>
        <MoreHorizontal className="w-10 h-10 text-[#536471] ml-auto mt-1 shrink-0" />
      </div>

      <div className="flex-1 px-20 pt-8 flex flex-col overflow-hidden">
        {isCover || layout === 'cover'
          ? renderCover(ctx, helpers)
          : layout === 'list'
            ? renderList(ctx, helpers)
            : layout === 'terminal'
              ? renderTerminal(ctx, helpers)
              : layout === 'grid'
                ? renderGrid(ctx, helpers)
                : renderText(ctx, helpers)}
      </div>

      <div className="px-20 pb-7 flex flex-col gap-5 shrink-0 mt-auto">
        <div className="flex justify-between items-center pt-4">
          <div className="text-[22px] text-[#536471]">{dateStr}</div>
          <div className="text-[22px] text-[#536471] font-semibold">{index}/{total}</div>
        </div>
        <div className="h-px w-full" style={{ background: '#eff3f4' }} />
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2.5 text-[22px]" style={{ color: '#536471' }}>
            <IconReply /> <span>83</span>
          </div>
          <div className="flex items-center gap-2.5 text-[22px]" style={{ color: '#536471' }}>
            <IconRetweet /> <span>1K</span>
          </div>
          <div className="flex items-center gap-2.5 text-[22px]" style={{ color: '#536471' }}>
            <IconHeart /> <span>5.8K</span>
          </div>
          <div className="flex items-center gap-2.5 text-[22px]" style={{ color: '#536471' }}>
            <IconBookmark /> <span>198</span>
          </div>
          <div className="flex items-center gap-2.5" style={{ color: '#536471' }}>
            <IconShare />
          </div>
        </div>
      </div>

    </div>
  );
});

TweetCard.displayName = 'TweetCard';
