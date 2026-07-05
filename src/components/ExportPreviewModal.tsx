import React from 'react';
import { X, Download } from 'lucide-react';
import { TweetCard } from './TweetCard';
import { buildCardRenderProps, type CardRenderDoc, type CardRenderSource } from '../lib/buildCardRenderProps';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  getExportPreviewScale,
  getScaledCardSize,
} from '../lib/cardExport';

type ExportPreviewModalProps = {
  cards: CardRenderSource[];
  doc: CardRenderDoc;
  mode: 'all' | 'single';
  cardIndex?: number;
  isExporting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ExportPreviewModal({
  cards,
  doc,
  mode,
  cardIndex = 0,
  isExporting = false,
  onClose,
  onConfirm,
}: ExportPreviewModalProps) {
  const previewScale = React.useMemo(() => {
    if (typeof window === 'undefined') return 0.45;
    const maxWidth = Math.min(window.innerWidth * 0.82, 520);
    const maxHeight = Math.min(window.innerHeight * 0.62, 720);
    return getExportPreviewScale(maxWidth, maxHeight);
  }, []);

  const previewSize = getScaledCardSize(previewScale);
  const indices = mode === 'single' ? [cardIndex] : cards.map((_, i) => i);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-[15px] font-black tracking-tight text-gray-900">导出预览 / EXPORT PREVIEW</h2>
            <p className="mt-1 text-[11px] text-gray-500">
              3:4 比例 · {CARD_WIDTH}×{CARD_HEIGHT} · 预览与导出 PNG 比例一致
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
            aria-label="关闭预览"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6">
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-8">
            {indices.map(i => {
              const card = cards[i];
              if (!card) return null;
              return (
                <div key={`preview-${i}`} className="flex w-full flex-col items-center gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {card.isCover ? 'COVER' : `CARD ${i + 1}`} · {Math.round(previewScale * 100)}% 预览
                  </div>
                  <div
                    className="relative overflow-hidden rounded-2xl border border-white/80 bg-white shadow-xl ring-1 ring-black/5"
                    style={{ width: previewSize.width, height: previewSize.height }}
                  >
                    <div
                      className="absolute left-0 top-0 origin-top-left"
                      style={{
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        transform: `scale(${previewScale})`,
                      }}
                    >
                      <TweetCard {...buildCardRenderProps(card, doc, i, cards.length)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-[12px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            返回编辑
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[12px] font-bold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : mode === 'single' ? '确认导出此卡 PNG' : '确认导出全部 PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}
