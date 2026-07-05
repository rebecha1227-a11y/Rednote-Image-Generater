export function isVisionModel(modelName: string): boolean {
  const name = modelName.toLowerCase();
  return (
    name.includes('vision') ||
    name.includes('gpt-4o') ||
    name.includes('claude-3') ||
    name.includes('vl') ||
    name.includes('visual') ||
    name.includes('gemini') ||
    name.includes('llava')
  );
}

export function isFailedLinkScrape(content: string): boolean {
  return content.startsWith('[无法获取该链接内容');
}

export function buildGenerationWarnings(input: {
  links: string[];
  scrapedContents: string[];
  imageCount: number;
  modelName: string;
}): string[] {
  const warnings: string[] = [];
  const { links, scrapedContents, imageCount, modelName } = input;

  if (imageCount > 0 && !isVisionModel(modelName)) {
    warnings.push('当前模型不支持图片输入，上传的图片已被忽略。请更换 vision 系列模型，或先移除图片再生成。');
  }

  links.forEach((link, index) => {
    const content = scrapedContents[index] || '';
    if (!link.trim()) return;
    if (isFailedLinkScrape(content)) {
      warnings.push(`参考链接 ${index + 1} 未能抓取内容，生成时未使用该链接。`);
    }
  });

  return warnings;
}
