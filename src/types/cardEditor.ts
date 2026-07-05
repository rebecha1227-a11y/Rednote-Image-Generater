export type CardEditorField =
  | 'title'
  | 'subtitle'
  | 'hookText'
  | 'content'
  | 'listItem'
  | 'terminalLine'
  | 'gridName'
  | 'gridDesc'
  | 'blockText';

export type ContentBlock = {
  type: 'text' | 'image';
  text?: string;
  imageIndex?: number;
  imageData?: string;
  imageHeight?: number;
};
