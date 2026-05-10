import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { toPng } from 'html-to-image';
import {
  Upload,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Clipboard,
  Type,
  Image as ImageIcon,
  Undo2,
  Redo2,
  UserRound,
  X,
} from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import { TweetCard, getAdaptiveImageBlockHeight, type CardEditorField, type ContentBlock } from './components/TweetCard';

type CardLayout = 'cover' | 'text' | 'list' | 'terminal' | 'grid';

type FieldFormatting = {
  fontSize?: 's' | 'm' | 'l' | 'xl';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
};

type BaseCardData = {
  title: string;
  subtitle?: string;
  hookText?: string;
  content: string;
  imageIndex?: number;
  imageIndex2?: number;
  imageData?: string;
  image2Data?: string;
  isCover?: boolean;
  layout?: CardLayout;
  listItems?: string[];
  terminalLines?: { type: string; text: string }[];
  gridItems?: { name: string; desc: string }[];
  blocks?: ContentBlock[];
  fieldFormatting?: Record<string, FieldFormatting>;
};

type CardData = BaseCardData & {
  id: string;
};

type ResultData = {
  caption: string;
  cards: BaseCardData[];
  tags: string[];
};

type AuthorInfo = {
  name: string;
  handle: string;
  avatarImage: string;
};

type EditorDoc = Omit<ResultData, 'cards'> & {
  cards: CardData[];
  images: string[];
  authorInfo: AuthorInfo;
  updatedAt: number;
  generatedAt: number;
};

type ActiveEditor = {
  cardIndex: number;
  field: CardEditorField;
  itemIndex?: number;
} | null;

type SelectionContext = {
  cardIndex: number;
  field: CardEditorField;
  itemIndex?: number;
  selectedText: string;
  anchorX: number;
  anchorY: number;
} | null;

type CardHistoryMap = Record<string, { past: CardData[]; future: CardData[] }>;

type DraftPayload = {
  doc: EditorDoc | null;
  globalPast: EditorDoc[];
  globalFuture: EditorDoc[];
  cardHistory: CardHistoryMap;
};

const DB_NAME = 'rednote-editor-db';
const DB_VERSION = 2;
const DEFAULT_AUTHOR: AuthorInfo = {
  name: 'Jinger',
  handle: '@Jinger_Vibe',
  avatarImage: '',
};

function openEditorDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts');
      if (!db.objectStoreNames.contains('globalHistory')) db.createObjectStore('globalHistory');
      if (!db.objectStoreNames.contains('cardHistory')) db.createObjectStore('cardHistory');
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets');
      if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(storeName: string, key: string) {
  const db = await openEditorDb();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(storeName: string, key: string, value: any) {
  const db = await openEditorDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function cloneDoc<T>(value: T): T {
  return structuredClone(value);
}

function createCardId(index: number) {
  return `card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeResultToEditorDoc(result: Omit<ResultData, 'cards'> & { cards: BaseCardData[] }, images: string[], authorInfo: AuthorInfo): EditorDoc {
  const now = Date.now();
  return {
    caption: result.caption,
    tags: result.tags,
    cards: result.cards.map((card, index) => ({
      ...card,
      id: createCardId(index),
      layout: card.isCover ? 'cover' : (card.layout || 'text'),
    })),
    images: [...images],
    authorInfo,
    updatedAt: now,
    generatedAt: now,
  };
}

function denormalizeEditorDoc(doc: EditorDoc): ResultData {
  return {
    caption: doc.caption,
    tags: doc.tags,
    cards: doc.cards.map(({ id, ...card }) => card),
  };
}

function replaceFirst(text: string, search: string, replacement: string) {
  const index = text.indexOf(search);
  if (index === -1) return text;
  return `${text.slice(0, index)}${replacement}${text.slice(index + search.length)}`;
}

function readFieldValue(card: CardData, field: CardEditorField, itemIndex?: number) {
  if (field === 'title') return card.title;
  if (field === 'subtitle') return card.subtitle || '';
  if (field === 'hookText') return card.hookText || '';
  if (field === 'content') return card.content;
  if (field === 'listItem') return card.listItems?.[itemIndex || 0] || '';
  if (field === 'terminalLine') return card.terminalLines?.[itemIndex || 0]?.text || '';
  if (field === 'gridName') return card.gridItems?.[itemIndex || 0]?.name || '';
  if (field === 'gridDesc') return card.gridItems?.[itemIndex || 0]?.desc || '';
  if (field === 'blockText' && typeof itemIndex === 'number') return card.blocks?.[itemIndex]?.text || '';
  return '';
}

function writeFieldValue(card: CardData, field: CardEditorField, itemIndex: number | undefined, value: string) {
  if (field === 'title') card.title = value;
  if (field === 'subtitle') card.subtitle = value;
  if (field === 'hookText') card.hookText = value;
  if (field === 'content') card.content = value;
  if (field === 'listItem' && typeof itemIndex === 'number' && card.listItems) card.listItems[itemIndex] = value;
  if (field === 'terminalLine' && typeof itemIndex === 'number' && card.terminalLines) card.terminalLines[itemIndex].text = value;
  if (field === 'gridName' && typeof itemIndex === 'number' && card.gridItems) card.gridItems[itemIndex].name = value;
  if (field === 'gridDesc' && typeof itemIndex === 'number' && card.gridItems) card.gridItems[itemIndex].desc = value;
  if (field === 'blockText' && typeof itemIndex === 'number' && card.blocks?.[itemIndex]) card.blocks[itemIndex].text = value;
}

function createMockResult(): ResultData {
  return {
    caption: '用了 Claude Code 三个月，做网页的速度翻了三倍，来分享几个真正有用的小技巧 👇\n\n✅ 技巧一：先把需求压小\n不要一上来就说"帮我做一个完整的网站"。先拆成最小可见步骤，比如"先做导航栏"，做完再说"再加内容区"。这样节奏轻松，方向也不容易跑偏。\n\n✅ 技巧二：列表卡片效率最高\n遇到步骤型内容，直接用 list 布局。读者一眼就能扫完，收藏率也更高。不要把所有东西都堆成一大段正文。\n\n✅ 技巧三：边改边预览，不要攒着看\n每改一小步就打开浏览器看一下效果。问题暴露得越早，返工越少。等全写完再看，往往发现方向就错了。\n\n这三个习惯用下来，做网页不只是快，最重要的是不会在一个问题上卡住很久。\n\n如果你也在 vibe coding，收藏这篇，下次用得上 ✨',
    tags: ['ClaudeCode', 'VibeCoding', '小红书排版'],
    cards: [
      {
        title: '3个 Claude Code 高效技巧',
        subtitle: '做网页更快，更顺手',
        content: '',
        isCover: true,
        layout: 'cover',
      },
      {
        title: '先把需求压小',
        content: '不要一上来就写一大坨代码。先拆成 <highlight>能马上看到效果</highlight> 的小步骤，节奏会轻松很多。',
        layout: 'text',
      },
      {
        title: '让信息更好扫',
        content: '列表卡适合放步骤型信息：',
        layout: 'list',
        listItems: ['先出可用版本', '再补细节体验', '最后统一打磨样式'],
      },
      {
        title: '命令别堆成一坨',
        content: '终端卡适合展示最短路径。',
        layout: 'terminal',
        terminalLines: [
          { type: 'command', text: 'npm run dev' },
          { type: 'output', text: 'Server running on http://localhost:3000' },
          { type: 'success', text: '预览已启动' },
        ],
      },
      {
        title: '常用动作做成卡片',
        content: '把常见操作做成一眼能看懂的网格。',
        layout: 'grid',
        gridItems: [
          { name: '/plan', desc: '先收紧方案' },
          { name: '/lint', desc: '先看类型是否干净' },
          { name: '/preview', desc: '先看效果再说' },
          { name: '/polish', desc: '最后统一打磨' },
        ],
      },
    ],
  }
}
function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const savedAuthor = JSON.parse(localStorage.getItem('authorInfo') || 'null');
  const savedConfig = JSON.parse(localStorage.getItem('apiConfig') || 'null');

  const [ideas, setIdeas] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<{ title: string; detail: string } | null>(null);
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo>(savedAuthor || DEFAULT_AUTHOR);
  const [apiConfig, setApiConfig] = useState(savedConfig || {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: '',
    style: 'twitter'
  });
  const [result, setResult] = useState<ResultData | null>(null);
  const [editorDoc, setEditorDoc] = useState<EditorDoc | null>(null);
  const [globalPast, setGlobalPast] = useState<EditorDoc[]>([]);
  const [globalFuture, setGlobalFuture] = useState<EditorDoc[]>([]);
  const [cardHistory, setCardHistory] = useState<CardHistoryMap>({});
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectionContext, setSelectionContext] = useState<SelectionContext>(null);
  const [showAiRewritePanel, setShowAiRewritePanel] = useState(false);
  const [aiCommentDraft, setAiCommentDraft] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [captionInstruction, setCaptionInstruction] = useState('');
  const [rewritingCaption, setRewritingCaption] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [versions, setVersions] = useState<{ key: string; doc: EditorDoc; savedAt: number }[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [cropState, setCropState] = useState<{ imageSrc: string; cardIndex: number; blockIndex?: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [activeEditorRect, setActiveEditorRect] = useState<DOMRect | null>(null);
  const [editorAnchorRect, setEditorAnchorRect] = useState<DOMRect | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardImageInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCardImageRef = useRef<{ cardIndex: number; blockIndex?: number } | null>(null);
  const editingValueRef = useRef(editingValue);
  const editorDocRef = useRef<EditorDoc | null>(null);

  const activeDoc = editorDoc;
  const getActiveTextarea = () => document.querySelector('textarea[data-card-editor-active="true"]') as HTMLTextAreaElement | null;
  const overlayRoot = typeof document !== 'undefined' ? document.body : null;

  React.useEffect(() => {
    localStorage.setItem('authorInfo', JSON.stringify(authorInfo));
  }, [authorInfo]);

  React.useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  React.useEffect(() => {
    let cancelled = false;
    const loadDraft = async () => {
      try {
        const draft = await idbGet('drafts', 'latest');
        const globalHistoryDraft = await idbGet('globalHistory', 'latest');
        const cardHistoryDraft = await idbGet('cardHistory', 'latest');
        const assetDraft = await idbGet('assets', 'latest');
        if (cancelled) return;
        if (draft?.doc) {
          const nextDoc: EditorDoc = {
            ...draft.doc,
            generatedAt: draft.doc.generatedAt || Date.now(),
            images: assetDraft?.images || draft.doc.images || [],
            authorInfo: {
              ...draft.doc.authorInfo,
              avatarImage: assetDraft?.avatarImage ?? draft.doc.authorInfo?.avatarImage ?? '',
            },
          };
          setEditorDoc(nextDoc);
          setResult(denormalizeEditorDoc(nextDoc));
          setImages(nextDoc.images || []);
          setAuthorInfo(nextDoc.authorInfo || DEFAULT_AUTHOR);
          setGlobalPast(globalHistoryDraft?.past || []);
          setGlobalFuture(globalHistoryDraft?.future || []);
          setCardHistory(cardHistoryDraft || {});
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    loadDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (apiConfig.provider === 'openai' && apiConfig.apiKey) {
      const timer = setTimeout(() => {
        fetchModels();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [apiConfig.apiKey, apiConfig.baseUrl]);

  React.useEffect(() => {
    if (!hydrated || !editorDoc) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      try {
        await idbSet('drafts', 'latest', {
          doc: editorDoc,
          globalPast,
          globalFuture,
          cardHistory,
        } satisfies DraftPayload);
        await idbSet('globalHistory', 'latest', { past: globalPast, future: globalFuture });
        await idbSet('cardHistory', 'latest', cardHistory);
        await idbSet('assets', 'latest', {
          images: editorDoc.images,
          avatarImage: editorDoc.authorInfo.avatarImage,
        });
        setSaveState('saved');
      } catch (error) {
        console.error(error);
        setSaveState('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [hydrated, editorDoc, globalPast, globalFuture, cardHistory]);

  React.useEffect(() => {
    if (!selectionContext) setShowAiRewritePanel(false);
  }, [selectionContext]);

  React.useEffect(() => {
    editingValueRef.current = editingValue;
  }, [editingValue]);

  React.useEffect(() => {
    editorDocRef.current = editorDoc;
  }, [editorDoc]);

  const updateEditingValue = (value: string) => {
    editingValueRef.current = value;
    setEditingValue(value);
  };

  const syncEditorDocState = (nextDoc: EditorDoc | null) => {
    editorDocRef.current = nextDoc;
    setEditorDoc(nextDoc);
  };

  React.useEffect(() => {
    if (!activeEditor) {
      setActiveEditorRect(null);
      return;
    }
    const updateRect = () => {
      const t = getActiveTextarea();
      setActiveEditorRect(t?.getBoundingClientRect() || null);
    };
    const id = requestAnimationFrame(updateRect);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeEditor]);

  React.useEffect(() => {
    if (!activeEditor) return;
    const t = getActiveTextarea();
    setActiveEditorRect(t?.getBoundingClientRect() || null);
  }, [activeEditor, editingValue]);

  const fetchModels = async () => {
    if (!apiConfig.apiKey || apiConfig.provider !== 'openai') return;
    setFetchingModels(true);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiConfig.apiKey,
          baseUrl: apiConfig.baseUrl
        })
      });
      const data = await response.json();
      if (data.models) {
        setAvailableModels(data.models);
        if (data.models.length > 0 && !data.models.includes(apiConfig.model)) {
          const defaultModel = data.models.find((m: string) => m.toLowerCase().includes('chat')) || data.models[0];
          setApiConfig(prev => ({ ...prev, model: defaultModel }));
        }
      } else {
        setErrorMsg({ title: '模型获取失败', detail: data.error || '请检查 API Key 和 Base URL 是否正确' });
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setErrorMsg({ title: '网络错误', detail: '无法连接到服务器，请稍后再试' });
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setFetchingModels(false);
    }
  };

  const pushGlobalSnapshot = (doc: EditorDoc) => {
    setGlobalPast(prev => [...prev, cloneDoc(doc)].slice(-30));
    setGlobalFuture([]);
  };

  const pushCardSnapshot = (card: CardData) => {
    setCardHistory(prev => ({
      ...prev,
      [card.id]: {
        past: [...(prev[card.id]?.past || []), cloneDoc(card)].slice(-20),
        future: [],
      },
    }));
  };

  const replaceDoc = (nextDoc: EditorDoc, pushHistory = true, previousCard?: CardData) => {
    const currentDoc = editorDocRef.current;
    if (currentDoc && pushHistory) {
      pushGlobalSnapshot(currentDoc);
      if (previousCard) pushCardSnapshot(previousCard);
    }
    editorDocRef.current = nextDoc;
    setEditorDoc(nextDoc);
    setResult(denormalizeEditorDoc(nextDoc));
    setImages(nextDoc.images);
    setAuthorInfo(nextDoc.authorInfo);
    setSelectionContext(null);
  };

  const applyCardUpdate = (cardIndex: number, updater: (card: CardData, doc: EditorDoc) => CardData) => {
    const currentDoc = editorDocRef.current;
    if (!currentDoc) return;
    const nextDoc = cloneDoc(currentDoc);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    nextDoc.cards[cardIndex] = updater(cloneDoc(nextDoc.cards[cardIndex]), nextDoc);
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
  };

  const handleAuthorUpdate = (patch: Partial<AuthorInfo>) => {
    const nextAuthor = { ...authorInfo, ...patch };
    setAuthorInfo(nextAuthor);
    if (editorDoc) {
      const nextDoc = { ...editorDoc, authorInfo: nextAuthor, updatedAt: Date.now() };
      replaceDoc(nextDoc);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] } } as any);

  const handleAddLink = () => setLinks([...links, '']);
  const handleRemoveLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const loadMockCards = () => {
    const nextResult = createMockResult();
    const nextDoc = normalizeResultToEditorDoc(nextResult, images, authorInfo);
    const initialSnapshots = Object.fromEntries(nextDoc.cards.map(c => [c.id, { past: [cloneDoc(c)], future: [] }]));
    setResult(denormalizeEditorDoc(nextDoc));
    setEditorDoc(nextDoc);
    setGlobalPast([cloneDoc(nextDoc)]);
    setGlobalFuture([]);
    setCardHistory(initialSnapshots);
    setActiveEditor(null);
    setSelectionContext(null);
    setAiCommentDraft('');
    idbSet('drafts', 'latest', { doc: nextDoc, globalPast: [cloneDoc(nextDoc)], globalFuture: [], cardHistory: initialSnapshots } satisfies DraftPayload).catch(console.error);
  };

  const handleGenerate = async () => {
    if (!ideas) return;
    setLoading(true);
    try {
      const stylePrompts = {
        twitter: `风格：推特金句风格。要求用词犀利、幽默、网感极强，文字极其精炼，每张卡片不超过3句话，像推特/X上的热门帖子。多用金句，少用废话。`,
        xhs: `风格：经典小红书风格。要求语气热情、亲切，多用富有感染力的形容词，适当加入表情包，文案稍微详细一点，照顾读者的情绪价值。`,
        tutorial: `风格：干货教学风格。要求逻辑极其清晰，分步讲解（第一步、第二步...），强调实用性和操作性，每张卡片聚焦一个知识点。`
      };

      const promptText = `你是一个深耕AI/Vibe Coding领域的博主。
      请根据提供的信息生成一篇小红书笔记素材。

      ${stylePrompts[apiConfig.style as keyof typeof stylePrompts]}

      文案要求：
      1. 开头2行钩子（要吸引人）
      2. 结尾给收藏理由

      卡片要求：
      1. 第一张必为封面 (isCover: true)
      2. 每张卡片内容精炼，像推特截图那样易于阅读
      3. imageIndex 是输入图片数组的索引，如果没有合适图片可不填
      4. 合理使用<highlight>荧光笔</highlight>和<tag>蓝色标签</tag>突出重点

      卡片结构要求：
      - 第一张必须是封面（isCover: true, layout: cover）
      - 封面之后为核心内容，使用 text / list / terminal / grid 混合搭配
      - 最后一张建议放总结/收藏理由（layout: text）
      - 卡片数量由内容决定，AI 根据灵感想法的多少自行判断（通常 3-8 张）

      输出必须是JSON格式：
      {
        "caption": "完整的小红书笔记正文（300-500字）。结构：开头2行吸睛钩子 → 主体内容（分段讲清核心观点，每段1-3句）→ 结尾收藏引导。语气符合所选风格。不要省略，写完整。",
        "tags": ["标签1", "标签2"],
        "cards": [
          {
            "title": "封面标题",
            "subtitle": "封面副标题",
            "hookText": "封面引导语/钩子文字（吸引读者继续看）",
            "content": "",
            "isCover": true,
            "layout": "cover",
            "imageIndex": 0
          },
          {
            "title": "卡片标题",
            "content": "卡片正文",
            "layout": "text",
            "blocks": [
              {"type": "text", "text": "第一段文字"},
              {"type": "image", "imageIndex": 0},
              {"type": "text", "text": "第二段文字"}
            ],
            "listItems": ["列表项1", "列表项2"],
            "terminalLines": [
              {"type": "command", "text": "npm install"},
              {"type": "output", "text": "installing..."},
              {"type": "success", "text": "Done!"}
            ],
            "gridItems": [
              {"name": "/command", "desc": "描述"}
            ]
          }
        ]
      }

      layout 可选值：text（纯文本）、list（带编号列表）、terminal（终端窗口）、grid（命令网格）。
      封面卡片：hookText 是引导语（放在图片下方）。
      text 类型请使用 blocks 字段（内容块序列）来组织正文，每个 block 格式：{"type": "text", "text": "内容"} 或 {"type": "image", "imageIndex": 图片索引}。blocks 里的文字即为卡片正文，不要再单独用 content 字段。
      list 类型用 listItems 字段加 content 作为小标题；terminal 类型用 terminalLines 字段；grid 类型用 gridItems 字段。
      封面必须是第一张卡片且 layout 固定为 cover。
      `;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `核心想法: ${ideas}\n\n指令: ${promptText}`,
          images,
          links: links.filter(l => l.trim().startsWith('http')),
          config: apiConfig
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `服务器错误 (HTTP ${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('浏览器不支持流式读取');

      const decoder = new TextDecoder();
      let chunk = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunk += decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        chunk = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setErrorMsg({ title: data.error, detail: data.details || '由于 API 限制，生成未能成功' });
                return;
              }
              const nextResult = data as Omit<ResultData, 'cards'> & { cards: BaseCardData[] };
              const nextDoc = normalizeResultToEditorDoc(nextResult, images, authorInfo);
              setResult(denormalizeEditorDoc(nextDoc));
              syncEditorDocState(nextDoc);
              setGlobalPast([]);
              setGlobalFuture([]);
              setCardHistory({});
              setActiveEditor(null);
              setSelectionContext(null);
              return;
            } catch (_) {}
          }
        }
      }

      try {
        const data = JSON.parse(chunk);
        if (data.error) {
          setErrorMsg({ title: data.error, detail: data.details || '生成失败' });
        } else {
          const nextResult = data as Omit<ResultData, 'cards'> & { cards: BaseCardData[] };
          const nextDoc = normalizeResultToEditorDoc(nextResult, images, authorInfo);
          setResult(denormalizeEditorDoc(nextDoc));
          syncEditorDocState(nextDoc);
          setGlobalPast([]);
          setGlobalFuture([]);
          setCardHistory({});
        }
      } catch (_) {
        setErrorMsg({ title: '生成失败', detail: '服务器响应异常，请重试' });
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg({ title: '生成失败', detail: error.message });
    } finally {
      setLoading(false);
    }
  };

  const exportImages = async () => {
    if (!activeDoc) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
      for (let i = 0; i < activeDoc.cards.length; i++) {
        const el = cardRefs.current[i];
        if (el) {
          const dataUrl = await toPng(el, {
            pixelRatio: 1,
            width: 1242,
            height: 1660,
          });
          const link = document.createElement('a');
          link.download = `card-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  const exportSingleCard = async (cardIndex: number) => {
    if (!activeDoc) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
      const el = cardRefs.current[cardIndex];
      if (el) {
        const dataUrl = await toPng(el, { pixelRatio: 1, width: 1242, height: 1660 });
        const link = document.createElement('a');
        link.download = `card-${cardIndex + 1}.png`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const copyCaption = () => {
    if (!activeDoc) return;
    const text = `${activeDoc.caption}\n\n${activeDoc.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const handleRewriteCaption = async () => {
    if (!activeDoc || !captionInstruction.trim()) return;
    setRewritingCaption(true);
    try {
      const res = await fetch('/api/rewrite-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: activeDoc.caption, instruction: captionInstruction, config: apiConfig }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`服务器响应异常：${text.slice(0, 100)}`); }
      if (!res.ok || data.error) { throw new Error(data.error || `HTTP ${res.status}`); }
      replaceDoc({ ...activeDoc, caption: data.caption, updatedAt: Date.now() });
      setCaptionInstruction('');
    } catch (e: any) {
      setErrorMsg({ title: 'AI 优化失败', detail: e.message || '' });
    } finally {
      setRewritingCaption(false);
    }
  };

  const startEditing = (cardIndex: number, field: CardEditorField, itemIndex?: number, anchorRect?: DOMRect) => {
    if (!activeDoc) return;
    const card = activeDoc.cards[cardIndex];
    setActiveEditor({ cardIndex, field, itemIndex });
    setEditorAnchorRect(anchorRect || null);
    updateEditingValue(readFieldValue(card, field, itemIndex));
    setSelectionContext(null);
  };

  const commitEditing = () => {
    if (!activeEditor || !activeDoc) return;
    const { cardIndex, field, itemIndex } = activeEditor;
    applyCardUpdate(cardIndex, card => {
      writeFieldValue(card, field, itemIndex, editingValue);
      return card;
    });
    setActiveEditor(null);
    setEditorAnchorRect(null);
    updateEditingValue('');
  };

  const cancelEditing = () => {
    setActiveEditor(null);
    setEditorAnchorRect(null);
    updateEditingValue('');
  };

  const handleTextSelection = (cardIndex: number, field: CardEditorField, selectedText: string, itemIndex?: number) => {
    if (!selectedText.trim()) return;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    const anchorX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const anchorY = rect ? rect.bottom : window.innerHeight / 2;
    setSelectionContext({ cardIndex, field, itemIndex, selectedText: selectedText.trim(), anchorX, anchorY });
    setShowAiRewritePanel(false);
    setAiCommentDraft('');
  };

  const syncSelectionFromActiveTextarea = () => {
    if (!activeEditor) return false;
    const t = getActiveTextarea();
    if (!t) return false;
    const s = t.selectionStart ?? 0;
    const e = t.selectionEnd ?? 0;
    if (e <= s) return false;
    const selectedText = (t.value || '').slice(s, e).trim();
    if (!selectedText) return false;
    const rect = t.getBoundingClientRect();
    setSelectionContext({
      cardIndex: activeEditor.cardIndex,
      field: activeEditor.field,
      itemIndex: activeEditor.itemIndex,
      selectedText,
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.bottom,
    });
    return true;
  };

  const handleCardImagePick = (cardIndex: number, blockIndex?: number) => {
    pendingCardImageRef.current = { cardIndex, blockIndex };
    cardImageInputRef.current?.click();
  };

  const handleCardImageChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const pending = pendingCardImageRef.current;
    event.target.value = '';
    if (!file || pending === null || !activeDoc) return;
    const dataUrl = await readFileAsDataUrl(file);
    const nextDoc = cloneDoc(activeDoc);
    const previousCard = cloneDoc(nextDoc.cards[pending.cardIndex]);
    if (pending.blockIndex !== undefined) {
      if (pending.blockIndex === -1) {
        nextDoc.cards[pending.cardIndex].image2Data = dataUrl;
      } else {
        const blocks = nextDoc.cards[pending.cardIndex].blocks;
        if (blocks && blocks[pending.blockIndex]) {
          blocks[pending.blockIndex].imageData = dataUrl;
        }
      }
    } else {
      nextDoc.cards[pending.cardIndex].imageData = dataUrl;
    }
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
    pendingCardImageRef.current = null;
  };

  const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context not available')); return; }
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      image.onerror = reject;
      image.src = imageSrc;
    });
  };

  const handleCropConfirm = async () => {
    if (!cropState || !croppedAreaPixels || !activeDoc) return;
    try {
      const { imageSrc, cardIndex, blockIndex } = cropState;
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const nextImageIndex = activeDoc.images.length;
      const nextDoc = cloneDoc(activeDoc);
      nextDoc.images.push(croppedImage);
      const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
      if (blockIndex !== undefined) {
        if (blockIndex === -1) {
          nextDoc.cards[cardIndex].imageIndex2 = nextImageIndex;
        } else {
          const blocks = nextDoc.cards[cardIndex].blocks;
          if (blocks && blocks[blockIndex]) {
            blocks[blockIndex].imageIndex = nextImageIndex;
          }
        }
      } else {
        nextDoc.cards[cardIndex].imageIndex = nextImageIndex;
      }
      nextDoc.updatedAt = Date.now();
      replaceDoc(nextDoc, true, previousCard);
    } catch (err) {
      console.error('Crop failed:', err);
      setErrorMsg({ title: '图片裁剪失败', detail: '请重试' });
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setCropState(null);
    }
  };

  const handleCropCancel = () => setCropState(null);

  const handleCropExistingImage = (cardIndex: number, blockIndex?: number) => {
    if (!activeDoc) return;
    const card = activeDoc.cards[cardIndex];
    let imageSrc: string | undefined;
    if (blockIndex === -1) {
      imageSrc = card.image2Data || (card.imageIndex2 !== undefined ? activeDoc.images[card.imageIndex2] : undefined);
    } else if (blockIndex !== undefined) {
      const block = card.blocks?.[blockIndex];
      imageSrc = block?.imageData || (block?.imageIndex !== undefined ? activeDoc.images[block.imageIndex] : undefined);
    } else {
      imageSrc = card.imageData || (card.imageIndex !== undefined ? activeDoc.images[card.imageIndex] : undefined);
    }
    if (!imageSrc) return;
    setCropState({ imageSrc, cardIndex, blockIndex });
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleSetCoverImage = (imageIndex: number, side: 'left' | 'right') => {
    if (!editorDoc || editorDoc.cards.length === 0) return;
    const nextDoc = cloneDoc(editorDoc);
    const previousCard = cloneDoc(nextDoc.cards[0]);
    if (side === 'left') {
      nextDoc.cards[0].imageIndex = imageIndex;
    } else {
      nextDoc.cards[0].imageIndex2 = imageIndex;
    }
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
  };

  const handleAvatarChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    handleAuthorUpdate({ avatarImage: dataUrl });
  };

  const handleMoveBlock = (cardIndex: number, fromIndex: number, toIndex: number) => {
    if (!activeDoc) return;
    const nextDoc = cloneDoc(activeDoc);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    const blocks = nextDoc.cards[cardIndex].blocks;
    if (!blocks || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) return;
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
  };

  const handleAddBlock = (cardIndex: number, type: 'text' | 'image', afterIndex: number) => {
    if (!activeDoc) return;
    const nextDoc = cloneDoc(activeDoc);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    if (!nextDoc.cards[cardIndex].blocks) {
      nextDoc.cards[cardIndex].blocks = [];
    }
    const newBlock: ContentBlock = type === 'text' ? { type: 'text', text: '' } : { type: 'image' };
    nextDoc.cards[cardIndex].blocks!.splice(afterIndex + 1, 0, newBlock);
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
    if (type === 'image') {
      // 立即触发图片选择
      pendingCardImageRef.current = { cardIndex, blockIndex: afterIndex + 1 };
      cardImageInputRef.current?.click();
    }
  };

  const handleDeleteBlock = (cardIndex: number, blockIndex: number) => {
    if (!activeDoc) return;
    const nextDoc = cloneDoc(activeDoc);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    const blocks = nextDoc.cards[cardIndex].blocks;
    if (!blocks) return;
    blocks.splice(blockIndex, 1);
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
  };

  const handleResizeImageBlock = (cardIndex: number, blockIndex: number, delta: number) => {
    if (!activeDoc) return;
    const nextDoc = cloneDoc(activeDoc);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    const block = nextDoc.cards[cardIndex].blocks?.[blockIndex];
    if (!block || block.type !== 'image') return;
    const current = block.imageHeight || getAdaptiveImageBlockHeight({
      title: nextDoc.cards[cardIndex].title,
      subtitle: nextDoc.cards[cardIndex].subtitle,
      hookText: nextDoc.cards[cardIndex].hookText,
      content: nextDoc.cards[cardIndex].content,
      listItems: nextDoc.cards[cardIndex].listItems,
      terminalLines: nextDoc.cards[cardIndex].terminalLines,
      gridItems: nextDoc.cards[cardIndex].gridItems,
      blocks: nextDoc.cards[cardIndex].blocks,
      image: nextDoc.cards[cardIndex].imageData,
      image2: nextDoc.cards[cardIndex].image2Data,
      blockImages: [],
      coverTags: [],
      fieldFormatting: nextDoc.cards[cardIndex].fieldFormatting,
    });
    block.imageHeight = Math.max(160, Math.min(520, current + delta));
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
  };

  const handleRewrite = async (mode: 'selection' | 'full-card') => {
    if (!selectionContext || !activeDoc || !aiCommentDraft.trim()) return;
    const isSameAsActiveEditor =
      !!activeEditor &&
      activeEditor.cardIndex === selectionContext.cardIndex &&
      activeEditor.field === selectionContext.field &&
      activeEditor.itemIndex === selectionContext.itemIndex;

    const editingValueAtRequest = editingValueRef.current;
    const requestCard = (() => {
      const card = cloneDoc(activeDoc.cards[selectionContext.cardIndex]);
      if (isSameAsActiveEditor) {
        writeFieldValue(card, selectionContext.field, selectionContext.itemIndex, editingValueAtRequest);
      }
      return card;
    })();

    setRewriting(true);
    try {
      const response = await fetch('/api/rewrite-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          instruction: aiCommentDraft,
          selectedText: selectionContext.selectedText,
          field: selectionContext.field,
          itemIndex: selectionContext.itemIndex,
          card: requestCard,
          config: apiConfig,
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'AI 修改失败');
      }
      if (mode === 'selection') {
        let updatedEditingValue: string | null = null;
        applyCardUpdate(selectionContext.cardIndex, card => {
          const source = isSameAsActiveEditor
            ? editingValueAtRequest
            : readFieldValue(card, selectionContext.field, selectionContext.itemIndex);
          const replaced = replaceFirst(source, selectionContext.selectedText, data.replacementText);
          writeFieldValue(card, selectionContext.field, selectionContext.itemIndex, replaced);
          updatedEditingValue = replaced;
          return card;
        });
        if (isSameAsActiveEditor && updatedEditingValue !== null && editingValueRef.current === editingValueAtRequest) {
          updateEditingValue(updatedEditingValue);
        }
      } else {
        applyCardUpdate(selectionContext.cardIndex, card => {
          const base = cloneDoc(card);
          if (isSameAsActiveEditor) {
            writeFieldValue(base, selectionContext.field, selectionContext.itemIndex, editingValueAtRequest);
          }
          return ({
          ...base,
          ...data.card,
          id: card.id,
          });
        });
        if (isSameAsActiveEditor && data.card && editingValueRef.current === editingValueAtRequest) {
          const merged = { ...requestCard, ...data.card } as CardData;
          updateEditingValue(readFieldValue(merged, selectionContext.field, selectionContext.itemIndex));
        }
      }
      setSelectionContext(null);
      setAiCommentDraft('');
    } catch (error: any) {
      setErrorMsg({ title: 'AI 修改失败', detail: error.message || '请稍后再试' });
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setRewriting(false);
    }
  };

  const handleUndoGlobal = () => {
    if (!activeDoc || globalPast.length === 0) return;
    const previous = cloneDoc(globalPast[globalPast.length - 1]);
    setGlobalPast(prev => prev.slice(0, -1));
    setGlobalFuture(prev => [cloneDoc(activeDoc), ...prev].slice(0, 30));
    syncEditorDocState(previous);
    setResult(denormalizeEditorDoc(previous));
    setImages(previous.images);
    setAuthorInfo(previous.authorInfo);
    setActiveEditor(null);
    setSelectionContext(null);
  };

  const handleRedoGlobal = () => {
    if (!activeDoc || globalFuture.length === 0) return;
    const next = cloneDoc(globalFuture[0]);
    setGlobalPast(prev => [...prev, cloneDoc(activeDoc)].slice(-30));
    setGlobalFuture(prev => prev.slice(1));
    syncEditorDocState(next);
    setResult(denormalizeEditorDoc(next));
    setImages(next.images);
    setAuthorInfo(next.authorInfo);
    setActiveEditor(null);
    setSelectionContext(null);
  };

  const handleUndoCard = (cardIndex: number) => {
    if (!activeDoc) return;
    const card = activeDoc.cards[cardIndex];
    const history = cardHistory[card.id];
    if (!history?.past?.length) return;
    const previousCard = cloneDoc(history.past[history.past.length - 1]);
    const currentCard = cloneDoc(card);
    const nextDoc = cloneDoc(activeDoc);
    nextDoc.cards[cardIndex] = previousCard;
    nextDoc.updatedAt = Date.now();
    setCardHistory(prev => ({
      ...prev,
      [card.id]: {
        past: prev[card.id].past.slice(0, -1),
        future: [currentCard, ...(prev[card.id].future || [])].slice(0, 20),
      },
    }));
    syncEditorDocState(nextDoc);
    setResult(denormalizeEditorDoc(nextDoc));
  };

  const handleRedoCard = (cardIndex: number) => {
    if (!activeDoc) return;
    const card = activeDoc.cards[cardIndex];
    const history = cardHistory[card.id];
    if (!history?.future?.length) return;
    const futureCard = cloneDoc(history.future[0]);
    const currentCard = cloneDoc(card);
    const nextDoc = cloneDoc(activeDoc);
    nextDoc.cards[cardIndex] = futureCard;
    nextDoc.updatedAt = Date.now();
    setCardHistory(prev => ({
      ...prev,
      [card.id]: {
        past: [...(prev[card.id].past || []), currentCard].slice(-20),
        future: prev[card.id].future.slice(1),
      },
    }));
    syncEditorDocState(nextDoc);
    setResult(denormalizeEditorDoc(nextDoc));
  };

  type VersionEntry = { key: string; doc: EditorDoc; savedAt: number };

  async function loadVersions() {
    setLoadingVersions(true);
    try {
      const db = await openEditorDb();
      const [values, keys] = await new Promise<[any[], IDBValidKey[]]>((resolve, reject) => {
        const tx = db.transaction('versions', 'readonly');
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
        const store = tx.objectStore('versions');
        let count = 0, vRes: any[], kRes: IDBValidKey[];
        store.getAll().onsuccess = (e) => { vRes = (e.target as IDBRequest).result; if (++count === 2) resolve([vRes, kRes]); };
        store.getAllKeys().onsuccess = (e) => { kRes = (e.target as IDBRequest).result; if (++count === 2) resolve([vRes, kRes]); };
      });
      const entries: VersionEntry[] = values.map((doc, i) => ({ key: String(keys[i]), doc, savedAt: doc.updatedAt || 0 }));
      entries.sort((a, b) => b.savedAt - a.savedAt);
      setVersions(entries);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  }

  const handleManualSave = async () => {
    if (!activeDoc) return;
    const key = 'v-' + Date.now();
    try {
      const db = await openEditorDb();
      const tx = db.transaction('versions', 'readwrite');
      const store = tx.objectStore('versions');
      store.put(cloneDoc(activeDoc), key);
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
      await loadVersions();
    } catch (err) {
      console.error('Failed to save version:', err);
    }
  };

  const handleRestoreVersion = async (entry: VersionEntry) => {
    const restored = cloneDoc(entry.doc);
    syncEditorDocState(restored);
    setResult(denormalizeEditorDoc(restored));
    setImages(restored.images);
    setAuthorInfo(restored.authorInfo);
    setShowHistory(false);
  };

  const handleDeleteVersion = async (key: string) => {
    try {
      const db = await openEditorDb();
      const tx = db.transaction('versions', 'readwrite');
      const store = tx.objectStore('versions');
      store.delete(key);
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
      setVersions(prev => prev.filter(v => v.key !== key));
    } catch (err) {
      console.error('Failed to delete version:', err);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-hidden select-none">
      <input ref={cardImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleCardImageChosen} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChosen} />

      <nav className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex flex-col">
          <span className="font-script text-3xl tracking-tight drop-shadow-sm leading-none text-brand">LittleRedNote Image Generator</span>
          <span className="font-script text-sm tracking-widest mt-0.5 opacity-60 ml-1 text-brand">@Jinger</span>
        </div>

        {errorMsg && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-brand-bg border border-brand-subtle px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 z-[100] animate-bounce">
            <div className="w-2 h-2 rounded-full bg-brand"></div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-brand leading-none">{errorMsg.title}</span>
              <span className="text-[10px] text-brand-light leading-tight mt-0.5">{errorMsg.detail}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="ml-2 text-brand-light/70 hover:text-brand text-xs">×</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${saveState === 'saving' ? 'bg-amber-400' : saveState === 'saved' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span>{saveState === 'saving' ? '自动保存中' : saveState === 'saved' ? '已自动保存' : '未保存草稿'}</span>
          </div>
          <button onClick={handleUndoGlobal} disabled={!activeDoc || globalPast.length === 0} className="p-2 rounded-full border border-gray-200 bg-white text-gray-500 disabled:opacity-40">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedoGlobal} disabled={!activeDoc || globalFuture.length === 0} className="p-2 rounded-full border border-gray-200 bg-white text-gray-500 disabled:opacity-40">
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { loadVersions(); setShowHistory(true); }}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-[11px] font-bold text-gray-600 hover:bg-brand hover:text-white transition-all"
          >
            历史笔记
          </button>
          {activeDoc && (
            <button onClick={handleManualSave} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-[11px] font-bold text-gray-600 hover:bg-brand hover:text-white transition-all">
              手动保存
            </button>
          )}
          {activeDoc && (
            <button
              onClick={exportImages}
              className="px-6 py-2 bg-brand text-white text-sm font-bold rounded-full hover:bg-brand-hover shadow-lg shadow-brand/15 transition-all flex items-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>一键导出所有卡片 (PNG)</span>
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black tracking-tight">历史笔记 / HISTORY</h1>
                <button onClick={() => setShowHistory(false)} className="px-6 py-2 rounded-full bg-brand text-white text-[11px] font-bold hover:opacity-80 transition-all">← 返回编辑器</button>
              </div>
              {loadingVersions ? (
                <div className="text-center py-20 text-gray-400 text-[13px] font-bold">加载中...</div>
              ) : versions.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[13px] font-bold text-gray-400 mb-4">还没有保存过版本</p>
                  <p className="text-[11px] text-gray-300">在编辑器里点「手动保存」就会出现在这里</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {versions.map((entry, idx) => {
                      const d = new Date(entry.savedAt);
                      const dateStr = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
                      const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      const isFirst = idx === 0;
                      return (
                        <div key={entry.key} className="relative pl-12">
                          <div className={`absolute left-[13px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isFirst ? 'bg-brand' : 'bg-gray-300'}`}></div>
                          <div className={`bg-white rounded-2xl border ${isFirst ? 'border-brand/20 shadow-lg' : 'border-gray-200'} p-5`}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[11px] font-black text-gray-400">{dateStr}</span>
                                <span className="text-[11px] font-black text-gray-400 ml-3">{timeStr}</span>
                                {isFirst && <span className="ml-3 text-[10px] font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-full">最新</span>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleRestoreVersion(entry)} className="px-4 py-1.5 rounded-lg bg-brand text-white text-[10px] font-bold hover:opacity-80">恢复此版本</button>
                                <button onClick={() => handleDeleteVersion(entry.key)} className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-400 text-[10px] font-bold hover:text-brand hover:border-brand-subtle">删除</button>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-gray-700 line-clamp-2 leading-relaxed">{entry.doc.caption || '(无正文)'}</p>
                                <div className="mt-2 flex gap-1.5">
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{entry.doc.cards.length} 张卡片</span>
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{entry.doc.tags.length} 个标签</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <aside className="w-96 bg-white border-r border-gray-200 p-6 flex flex-col gap-8 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <section className="bg-gray-50 -mx-6 -mt-6 p-6 border-b border-gray-200">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest mb-2 hover:opacity-80 transition-colors border-b border-gold pb-1 text-brand"
            >
              <span>个人设置 / PREFERENCES</span>
              <Plus className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-45' : ''}`} />
            </button>
            {showSettings && (
              <div className="space-y-4 pt-2">
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setApiConfig({ ...apiConfig, provider: 'gemini' })}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'gemini' ? 'bg-brand text-white' : 'text-gray-400'}`}
                  >Gemini</button>
                  <button
                    onClick={() => setApiConfig({ ...apiConfig, provider: 'openai' })}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'openai' ? 'bg-brand text-white' : 'text-gray-400'}`}
                  >Custom API</button>
                </div>

                {apiConfig.provider === 'gemini' && (
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Gemini API Key (可选)"
                      value={apiConfig.apiKey}
                      onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                      className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                    />
                    <p className="text-[9px] text-gray-400 font-medium">留空则默认使用 AI Studio 注入的 Key。</p>
                  </div>
                )}

                {apiConfig.provider === 'openai' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key"
                        value={apiConfig.apiKey}
                        onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                        className="flex-1 text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                      />
                      <button
                        onClick={fetchModels}
                        disabled={fetchingModels || !apiConfig.apiKey}
                        title="刷新模型列表"
                        className={`px-3 flex items-center justify-center bg-gray-100 hover:bg-brand hover:text-white rounded-lg transition-all disabled:opacity-50 ${fetchingModels ? 'animate-pulse' : ''}`}
                      >
                        <Sparkles className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Base URL (e.g. https://api.deepseek.com/v1)"
                      value={apiConfig.baseUrl}
                      onChange={e => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                      className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                    />

                    {availableModels.length > 0 ? (
                      <select
                        value={apiConfig.model}
                        onChange={e => setApiConfig({ ...apiConfig, model: e.target.value })}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                      >
                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Model (e.g. deepseek-chat)"
                        value={apiConfig.model}
                        onChange={e => setApiConfig({ ...apiConfig, model: e.target.value })}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                      />
                    )}
                  </div>
                )}

                <div className="h-px bg-gray-200 my-4" />
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">个人品牌 / BRANDING</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="昵称"
                      value={authorInfo.name}
                      onChange={e => handleAuthorUpdate({ name: e.target.value })}
                      className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                    />
                    <input
                      type="text"
                      placeholder="@ID"
                      value={authorInfo.handle}
                      onChange={e => handleAuthorUpdate({ handle: e.target.value })}
                      className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-brand bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-400 font-bold ml-1">自定义头像</label>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                        {authorInfo.avatarImage ? (
                          <img src={authorInfo.avatarImage} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <UserRound className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <button onClick={() => avatarInputRef.current?.click()} className="w-full rounded-lg bg-brand px-3 py-2 text-[10px] font-bold text-white">
                          上传头像图片
                        </button>
                        {authorInfo.avatarImage && (
                          <button onClick={() => handleAuthorUpdate({ avatarImage: '' })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500">
                            清除头像
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Type className="w-3 h-3" />
              内容配置 / CONTENT
            </h3>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">创作风格</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'twitter', label: '推特金句', sub: '精炼/吐槽' },
                    { id: 'xhs', label: '爆款氛围', sub: '亲切/感性' },
                    { id: 'tutorial', label: '干货教程', sub: '逻辑/分层' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setApiConfig({ ...apiConfig, style: style.id })}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${apiConfig.style === style.id ? 'bg-brand border-brand text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
                    >
                      <span className="text-[10px] font-bold">{style.label}</span>
                      <span className="text-[8px] opacity-60 scale-90">{style.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">灵感想法</label>
                <textarea
                  value={ideas}
                  onChange={(e) => setIdeas(e.target.value)}
                  placeholder="输入你的AI见解、工具介绍或Skill介绍..."
                  className="w-full h-32 text-sm border border-gray-200 rounded-xl p-4 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all resize-none leading-relaxed bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">参考链接 / LINKS</label>
                  <button onClick={handleAddLink} className="p-1 bg-gray-100 hover:bg-brand hover:text-white rounded-md transition-all">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {links.map((link, idx) => (
                    <div key={idx} className="relative flex items-center gap-2 group">
                      <div className="relative flex-1">
                        <Clipboard className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          value={link}
                          onChange={(e) => handleLinkChange(idx, e.target.value)}
                          placeholder="https://..."
                          className="w-full text-[12px] border border-gray-200 rounded-xl p-2.5 pl-9 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all bg-gray-50/30"
                        />
                      </div>
                      {links.length > 1 && (
                        <button onClick={() => handleRemoveLink(idx)} className="p-1.5 text-gray-300 hover:text-brand transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ImageIcon className="w-3 h-3" />
              截图素材 / ASSETS ({images.length})
            </h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragActive ? 'border-brand bg-brand-bg/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/30 hover:bg-white'}`}
            >
              <input {...getInputProps()} />
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-gray-400 text-center">点击或拖拽上传</p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt={`asset-${i}`} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-all flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); handleSetCoverImage(i, 'left'); }} className="px-2 py-1 bg-white text-[9px] font-bold rounded-full">封面左图</button>
                      <button onClick={(e) => { e.stopPropagation(); handleSetCoverImage(i, 'right'); }} className="px-2 py-1 bg-white text-[9px] font-bold rounded-full">封面右图</button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute top-0.5 right-0.5 bg-brand text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button
            onClick={handleGenerate}
            disabled={loading || !ideas}
            className="w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 border-2 transition-all shadow-lg active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-transparent"
            style={{ backgroundColor: loading || !ideas ? undefined : 'var(--color-brand-subtle)', borderColor: loading || !ideas ? undefined : 'var(--color-brand)' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-brand" />
                <div className="flex gap-1">
                  <span className="text-brand">生成全套素材</span>
                  <span className="text-brand">/ GENERATE</span>
                </div>
              </>
            )}
          </button>

        </aside>

        <section className="flex-1 p-8 overflow-y-auto relative flex flex-col items-center bg-gray-100">
          <div className="absolute top-4 left-8 flex gap-6 text-[11px] font-black uppercase tracking-widest items-center">
            <button
              onClick={() => setShowCaption(false)}
              className={`pb-1 border-b-2 transition-all ${!showCaption ? '' : 'border-transparent hover:border-gray-300'}`}
              style={{ color: 'var(--color-brand)', borderColor: !showCaption ? 'var(--color-gold)' : undefined }}
            >预览模式 / PREVIEW</button>
            {activeDoc && (
              <button
                onClick={() => setShowCaption(!showCaption)}
                className={`pb-1 border-b-2 transition-all ${showCaption ? '' : 'border-transparent hover:border-gray-300'}`}
                style={{ color: 'var(--color-brand)', borderColor: showCaption ? 'var(--color-gold)' : undefined }}
              >
                正文 / COPY
              </button>
            )}
          </div>

          {!activeDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8 text-gray-200" />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.2em] italic">Waiting for Magic...</p>
            </div>
          ) : showCaption ? (
            <div className="w-full max-w-2xl mx-auto mt-12 pb-8 px-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">正文编辑 / CAPTION</h3>
                <textarea
                  value={activeDoc.caption}
                  onChange={e => setEditorDoc(prev => prev ? { ...prev, caption: e.target.value, updatedAt: Date.now() } : prev)}
                  className="w-full h-[500px] text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50/60 p-5 outline-none resize-none"
                />
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {activeDoc.tags.map((t, idx) => (
                    <input
                      key={`${t}-${idx}`}
                      value={t}
                      onChange={e => setEditorDoc(prev => {
                        if (!prev) return prev;
                        const next = structuredClone(prev);
                        next.tags[idx] = e.target.value;
                        next.updatedAt = Date.now();
                        return next;
                      })}
                      className="min-w-[72px] rounded-lg bg-gray-50 px-2.5 py-1.5 text-brand font-bold text-[11px] outline-none border border-gray-200"
                    />
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <input
                    value={captionInstruction}
                    onChange={e => setCaptionInstruction(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRewriteCaption(); } }}
                    placeholder="告诉 AI 怎么改，比如：语气更活泼、结尾改短一点"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-[13px] outline-none placeholder:text-gray-300"
                  />
                  <button
                    onClick={handleRewriteCaption}
                    disabled={rewritingCaption || !captionInstruction.trim()}
                    className="rounded-xl bg-brand px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-40 shrink-0"
                  >
                    {rewritingCaption ? '优化中...' : 'AI 优化'}
                  </button>
                </div>
                <button onClick={copyCaption} className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white flex items-center justify-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  复制正文到剪贴板
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full mt-12 pb-8 flex flex-col items-center">
              <div className="flex flex-col gap-12 items-center">
              {activeDoc.cards.map((card, i) => (
                <div key={card.id} className="flex flex-col items-center gap-4 group">
                  <div className="relative overflow-hidden rounded-2xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-black/5" style={{ width: '434px', height: '581px' }}>
                    <div className="absolute top-0 left-0 w-[1242px] h-[1660px] origin-top-left" style={{ transform: 'scale(0.35)' }}>
                      <TweetCard
                        ref={el => (cardRefs.current[i] = el)}
                        cardIndex={i}
                        index={i + 1}
                        total={activeDoc.cards.length}
                        title={card.title}
                        subtitle={card.subtitle}
                        hookText={card.hookText}
                        content={card.content}
                        isCover={card.isCover}
                        layout={card.layout}
                        listItems={card.listItems}
                        terminalLines={card.terminalLines}
                        gridItems={card.gridItems}
                        blocks={card.blocks}
                        blockImages={card.blocks?.map(b => b.type === 'image' ? (b.imageData || (b.imageIndex !== undefined ? activeDoc.images[b.imageIndex] : undefined)) : undefined)}
                        coverTags={card.isCover ? activeDoc.tags : undefined}
                        fieldFormatting={card.fieldFormatting}
                        image={card.imageData || (card.imageIndex !== undefined ? activeDoc.images[card.imageIndex] : undefined)}
                        image2={card.image2Data || (card.imageIndex2 !== undefined ? activeDoc.images[card.imageIndex2] : undefined)}
                        authorInfo={activeDoc.authorInfo}
                        generatedAt={activeDoc.generatedAt || Date.now()}
                        className="scale-100"
                        editable={!isExporting}
                        activeEditor={activeEditor}
                        editingValue={editingValue}
                        onEditingValueChange={updateEditingValue}
                        onStartEdit={(field, itemIndex, anchorRect) => startEditing(i, field, itemIndex, anchorRect)}
                        onCommitEdit={commitEditing}
                        onCancelEdit={cancelEditing}
                        onSelectText={(field, selectedText, itemIndex) => handleTextSelection(i, field, selectedText, itemIndex)}
                        onPickImage={(blockIndex) => handleCardImagePick(i, blockIndex)}
                        onMoveBlock={(from, to) => handleMoveBlock(i, from, to)}
                        onAddBlock={(type, afterIndex) => handleAddBlock(i, type, afterIndex)}
                        onDeleteBlock={(blockIndex) => handleDeleteBlock(i, blockIndex)}
                        onResizeImageBlock={(blockIndex, delta) => handleResizeImageBlock(i, blockIndex, delta)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <div className="px-3 py-1 bg-white border border-gray-200 text-[10px] font-black text-gray-400 rounded-lg shadow-sm">
                      {card.isCover ? 'COVER PAGE' : `STEP ${i}`}
                    </div>
                    <div className="px-3 py-1 bg-brand text-white text-[10px] font-mono font-bold rounded-lg shadow-lg">
                      {i + 1} / {activeDoc.cards.length}
                    </div>
                    <button onClick={() => handleCardImagePick(i)} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{card.imageIndex !== undefined ? '换图' : '插图'}</span>
                    </button>
                    {card.imageIndex !== undefined && (
                      <button onClick={() => handleCropExistingImage(i)} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1">
                        裁剪
                      </button>
                    )}
                    {card.isCover && card.imageIndex2 !== undefined && (
                      <button onClick={() => handleCropExistingImage(i, -1)} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1">
                        裁剪右图
                      </button>
                    )}
                    <button onClick={() => handleUndoCard(i)} disabled={!cardHistory[card.id]?.past?.length} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1 disabled:opacity-40">
                      <Undo2 className="w-3 h-3" />
                      <span>单卡撤销</span>
                    </button>
                    <button onClick={() => handleRedoCard(i)} disabled={!cardHistory[card.id]?.future?.length} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1 disabled:opacity-40">
                      <Redo2 className="w-3 h-3" />
                      <span>单卡恢复</span>
                    </button>
                    <button onClick={() => exportSingleCard(i)} disabled={isExporting} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1 disabled:opacity-40">
                      <Download className="w-3 h-3" />
                      <span>导出此卡</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}


          {cropState && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center">
              <div className="bg-white rounded-2xl p-6 w-[600px] shadow-2xl">
                <h3 className="text-[13px] font-black uppercase tracking-widest mb-4">裁剪图片 / CROP</h3>
                <div className="relative h-[400px] rounded-xl overflow-hidden bg-gray-900">
                  <Cropper
                    image={cropState.imageSrc}
                    crop={crop}
                    zoom={cropZoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setCropZoom}
                    onCropComplete={(_, pixelCrop) => setCroppedAreaPixels(pixelCrop)}
                  />
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <input type="range" min={1} max={3} step={0.1} value={cropZoom} onChange={e => setCropZoom(Number(e.target.value))} className="flex-1" />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={handleCropConfirm} className="flex-1 rounded-xl bg-brand py-3 text-[12px] font-bold text-white">确认裁剪</button>
                  <button onClick={handleCropCancel} className="flex-1 rounded-xl border border-gray-200 py-3 text-[12px] font-bold text-gray-500">取消</button>
                </div>
              </div>
            </div>
          )}

          {selectionContext && !activeEditor && overlayRoot && createPortal(
            <div
              data-editor-toolbar="true"
              className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 px-3 py-2 z-[100] flex items-center gap-2"
              style={{
                left: Math.min(Math.max(selectionContext.anchorX - 110, 16), window.innerWidth - 236),
                top: Math.max(selectionContext.anchorY + 10, 16),
              }}
            >
              <button
                onClick={() => startEditing(selectionContext.cardIndex, selectionContext.field, selectionContext.itemIndex)}
                className="px-3 h-8 rounded-lg bg-brand text-white text-[11px] font-bold"
              >
                编辑
              </button>
              <button
                onClick={() => setShowAiRewritePanel(v => !v)}
                className="px-3 h-8 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
              >
                AI优化
              </button>

              {showAiRewritePanel && (
                <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl p-4 z-[110]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 辅助修改</p>
                    <button onClick={() => setShowAiRewritePanel(false)} className="text-gray-300 hover:text-gray-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">“{selectionContext.selectedText}”</p>
                  <textarea
                    value={aiCommentDraft}
                    onChange={e => setAiCommentDraft(e.target.value)}
                    placeholder="比如：更犀利 / 更小红书 / 更具体"
                    className="w-full h-20 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-[12px] outline-none resize-none"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRewrite('selection')}
                      disabled={rewriting || !aiCommentDraft.trim()}
                      className="rounded-xl bg-brand px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                    >
                      {rewriting ? '处理中...' : '只改选中'}
                    </button>
                    <button
                      onClick={() => handleRewrite('full-card')}
                      disabled={rewriting || !aiCommentDraft.trim()}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                    >
                      {rewriting ? '处理中...' : '重写整卡'}
                    </button>
                  </div>
                </div>
              )}
            </div>,
            overlayRoot
          )}

          {/* 格式工具栏 */}
          {activeEditor && overlayRoot && createPortal(
            <div
              data-editor-toolbar="true"
              className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 px-4 py-2.5 z-[100] flex items-center gap-1.5"
              style={{
                left: activeEditorRect
                  ? Math.min(Math.max(activeEditorRect.left + activeEditorRect.width / 2 - 188, 16), window.innerWidth - 392)
                  : editorAnchorRect
                  ? Math.min(Math.max(editorAnchorRect.left + editorAnchorRect.width / 2 - 188, 16), window.innerWidth - 392)
                  : Math.max((window.innerWidth - 376) / 2, 16),
                top: activeEditorRect
                  ? Math.min(activeEditorRect.bottom + 10, window.innerHeight - 80)
                  : editorAnchorRect
                  ? Math.min(editorAnchorRect.bottom + 10, window.innerHeight - 80)
                  : window.innerHeight - 84,
              }}
            >
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { const t = getActiveTextarea(); if (!t) return; const s = t.selectionStart || 0, e = t.selectionEnd || 0, v = editingValue; const sel = v.substring(s, e); const r = sel ? `**${sel}**` : '**'; updateEditingValue(v.substring(0, s) + r + v.substring(e)); requestAnimationFrame(() => { t.focus(); t.setSelectionRange(s + 2, s + 2 + (sel ? sel.length : 0)); }); }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-[13px] font-black text-gray-700"
                title="加粗"
              >B</button>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { const t = getActiveTextarea(); if (!t) return; const s = t.selectionStart || 0, e = t.selectionEnd || 0, v = editingValue; const sel = v.substring(s, e); const r = sel ? `*${sel}*` : '*'; updateEditingValue(v.substring(0, s) + r + v.substring(e)); requestAnimationFrame(() => { t.focus(); t.setSelectionRange(s + 1, s + 1 + (sel ? sel.length : 0)); }); }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-[14px] italic font-serif text-gray-700"
                title="斜体"
              >I</button>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <select
                value={(() => { const f = editorDoc?.cards?.[activeEditor.cardIndex]?.fieldFormatting?.[activeEditor.field]; return f?.fontSize || 'm'; })()}
                onChange={e => { if (!editorDoc) return; const v = e.target.value as FieldFormatting['fontSize']; applyCardUpdate(activeEditor.cardIndex, card => { if (!card.fieldFormatting) card.fieldFormatting = {}; if (!card.fieldFormatting[activeEditor.field]) card.fieldFormatting[activeEditor.field] = {}; card.fieldFormatting[activeEditor.field]!.fontSize = v; return card; }); }}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                title="字号"
              >
                <option value="s">小</option>
                <option value="m">中</option>
                <option value="l">大</option>
                <option value="xl">超大</option>
              </select>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              {/* 颜色色板 */}
              <div className="relative group">
                <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[16px]" title="文字颜色">🎨</button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex bg-white rounded-xl shadow-2xl border border-gray-200 p-2 gap-1">
                  {['#0f1419','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280','#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => { if (!editorDoc) return; applyCardUpdate(activeEditor.cardIndex, card => { if (!card.fieldFormatting) card.fieldFormatting = {}; if (!card.fieldFormatting[activeEditor.field]) card.fieldFormatting[activeEditor.field] = {}; card.fieldFormatting[activeEditor.field]!.color = c === '#0f1419' ? undefined : c; return card; }); }}
                      className="w-6 h-6 rounded-full border border-gray-200 shrink-0 hover:scale-125 transition-transform"
                      style={{ backgroundColor: c, borderColor: c === '#ffffff' ? '#d1d5db' : undefined }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <button
                onClick={() => { if (!editorDoc) return; applyCardUpdate(activeEditor.cardIndex, card => { if (!card.fieldFormatting) card.fieldFormatting = {}; if (!card.fieldFormatting[activeEditor.field]) card.fieldFormatting[activeEditor.field] = {}; card.fieldFormatting[activeEditor.field]!.textAlign = 'left'; return card; }); }}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold ${editorDoc?.cards?.[activeEditor.cardIndex]?.fieldFormatting?.[activeEditor.field]?.textAlign === 'left' || !editorDoc?.cards?.[activeEditor.cardIndex]?.fieldFormatting?.[activeEditor.field]?.textAlign ? 'bg-brand text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                title="左对齐"
              >≡</button>
              <button
                onClick={() => { if (!editorDoc) return; applyCardUpdate(activeEditor.cardIndex, card => { if (!card.fieldFormatting) card.fieldFormatting = {}; if (!card.fieldFormatting[activeEditor.field]) card.fieldFormatting[activeEditor.field] = {}; card.fieldFormatting[activeEditor.field]!.textAlign = 'center'; return card; }); }}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold ${editorDoc?.cards?.[activeEditor.cardIndex]?.fieldFormatting?.[activeEditor.field]?.textAlign === 'center' ? 'bg-brand text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                title="居中"
              >≡</button>
              <button
                onClick={() => { if (!editorDoc) return; applyCardUpdate(activeEditor.cardIndex, card => { if (!card.fieldFormatting) card.fieldFormatting = {}; if (!card.fieldFormatting[activeEditor.field]) card.fieldFormatting[activeEditor.field] = {}; card.fieldFormatting[activeEditor.field]!.textAlign = 'right'; return card; }); }}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold ${editorDoc?.cards?.[activeEditor.cardIndex]?.fieldFormatting?.[activeEditor.field]?.textAlign === 'right' ? 'bg-brand text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                title="右对齐"
              >≡</button>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  if (!selectionContext) {
                    const ok = syncSelectionFromActiveTextarea();
                    if (!ok) return;
                  }
                  setShowAiRewritePanel(v => !v);
                }}
                disabled={!selectionContext && !activeEditor}
                className="px-2.5 h-8 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title={selectionContext ? 'AI 优化选中文本' : '请先在编辑框里选中文字'}
              >
                AI优化
              </button>

              {showAiRewritePanel && selectionContext && (
                <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl p-4 z-[110]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 辅助修改</p>
                    <button onClick={() => setShowAiRewritePanel(false)} className="text-gray-300 hover:text-gray-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">“{selectionContext.selectedText}”</p>
                  <textarea
                    value={aiCommentDraft}
                    onChange={e => setAiCommentDraft(e.target.value)}
                    placeholder="比如：更犀利 / 更小红书 / 更具体"
                    className="w-full h-20 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-[12px] outline-none resize-none"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRewrite('selection')}
                      disabled={rewriting || !aiCommentDraft.trim()}
                      className="rounded-xl bg-brand px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                    >
                      {rewriting ? '处理中...' : '只改选中'}
                    </button>
                    <button
                      onClick={() => handleRewrite('full-card')}
                      disabled={rewriting || !aiCommentDraft.trim()}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                    >
                      {rewriting ? '处理中...' : '重写整卡'}
                    </button>
                  </div>
                </div>
              )}
            </div>,
            overlayRoot
          )}

        </section>
          </>
        )}
      </main>

      <footer className="h-8 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f4bf0b' }}></span>
            <span>SYSTEM: SYNCING CONTENT</span>
          </div>
          <span>FORMAT: 3:4 VERTICAL HD</span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f4bf0b' }}></span>
            <span>LIVE EDITING + AUTO SAVE ACTIVE</span>
          </div>
          <span>VIBE CODING ENGINE ACTIVE</span>
          <div className="flex items-center gap-1.5">
            <span style={{ borderColor: '#99c88c', color: '#628d60' }} className="text-brand animate-pulse text-lg">●</span>
            <span className="mt-0.5">RECORDING UI CHANGES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
