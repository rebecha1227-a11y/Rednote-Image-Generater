export const CARD_WIDTH = 1242;
export const CARD_HEIGHT = 1660;
export const CARD_ASPECT_RATIO = CARD_WIDTH / CARD_HEIGHT;
export const EDITOR_PREVIEW_SCALE = 0.35;

export function getExportPreviewScale(maxWidth: number, maxHeight: number): number {
  const scaleByWidth = maxWidth / CARD_WIDTH;
  const scaleByHeight = maxHeight / CARD_HEIGHT;
  return Math.min(scaleByWidth, scaleByHeight, 1);
}

export function getScaledCardSize(scale: number) {
  return {
    width: Math.round(CARD_WIDTH * scale),
    height: Math.round(CARD_HEIGHT * scale),
  };
}
