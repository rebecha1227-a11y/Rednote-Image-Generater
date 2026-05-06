import React, { useRef, useState } from 'react';
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
  MessageSquarePlus,
  UserRound,
  X,
} from 'lucide-react';
import { TweetCard, type CardEditorField } from './components/TweetCard';

type CardLayout = 'cover' | 'text' | 'list' | 'terminal' | 'grid';

type BaseCardData = {
  title: string;
  subtitle?: string;
  content: string;
  imageIndex?: number;
  isCover?: boolean;
  layout?: CardLayout;
  listItems?: string[];
  terminalLines?: { type: string; text: string }[];
  gridItems?: { name: string; desc: string }[];
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
} | null;

type CardHistoryMap = Record<string, { past: CardData[]; future: CardData[] }>;

type DraftPayload = {
  doc: EditorDoc | null;
  globalPast: EditorDoc[];
  globalFuture: EditorDoc[];
  cardHistory: CardHistoryMap;
};

const DB_NAME = 'rednote-editor-db';
const DB_VERSION = 1;
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
    updatedAt: Date.now(),
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

function createMockResult(): ResultData {
  return {
    caption: '今天分享 3 个 Claude Code 提高做网页效率的小技巧。\n\n第一个是先用计划模式把需求收紧，第二个是让卡片文案结构化，第三个是边改边看预览，效率会高很多。',
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
  const [aiCommentDraft, setAiCommentDraft] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hydrated, setHydrated] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardImageInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCardImageRef = useRef<number | null>(null);

  const activeDoc = editorDoc;

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
    if (editorDoc && pushHistory) {
      pushGlobalSnapshot(editorDoc);
      if (previousCard) pushCardSnapshot(previousCard);
    }
    setEditorDoc(nextDoc);
    setResult(denormalizeEditorDoc(nextDoc));
    setImages(nextDoc.images);
    setAuthorInfo(nextDoc.authorInfo);
    setSelectionContext(null);
  };

  const applyCardUpdate = (cardIndex: number, updater: (card: CardData, doc: EditorDoc) => CardData) => {
    if (!editorDoc) return;
    const nextDoc = cloneDoc(editorDoc);
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

      输出必须是JSON格式：
      {
        "caption": "符合风格的文案正文",
        "tags": ["标签1", "标签2"],
        "cards": [
          {
            "title": "封面标题",
            "subtitle": "封面副标题",
            "content": "",
            "isCover": true,
            "layout": "cover",
            "imageIndex": 0
          },
          {
            "title": "卡片标题",
            "content": "卡片正文（支持<highlight>荧光笔</highlight>和<tag>蓝色标签</tag>）",
            "layout": "text",
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
      text 类型用 content 字段；list 类型用 listItems 字段加 content 作为小标题；terminal 类型用 terminalLines 字段；grid 类型用 gridItems 字段。
      第一张卡片 layout 固定为 cover。
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
              setEditorDoc(nextDoc);
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
          setEditorDoc(nextDoc);
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
  };

  const copyCaption = () => {
    if (!activeDoc) return;
    const text = `${activeDoc.caption}\n\n${activeDoc.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const startEditing = (cardIndex: number, field: CardEditorField, itemIndex?: number) => {
    if (!activeDoc) return;
    const card = activeDoc.cards[cardIndex];
    let value = '';
    if (field === 'title') value = card.title;
    if (field === 'subtitle') value = card.subtitle || '';
    if (field === 'content') value = card.content;
    if (field === 'listItem') value = card.listItems?.[itemIndex || 0] || '';
    if (field === 'terminalLine') value = card.terminalLines?.[itemIndex || 0]?.text || '';
    if (field === 'gridName') value = card.gridItems?.[itemIndex || 0]?.name || '';
    if (field === 'gridDesc') value = card.gridItems?.[itemIndex || 0]?.desc || '';
    setActiveEditor({ cardIndex, field, itemIndex });
    setEditingValue(value);
    setSelectionContext(null);
  };

  const commitEditing = () => {
    if (!activeEditor || !activeDoc) return;
    const { cardIndex, field, itemIndex } = activeEditor;
    applyCardUpdate(cardIndex, card => {
      if (field === 'title') card.title = editingValue;
      if (field === 'subtitle') card.subtitle = editingValue;
      if (field === 'content') card.content = editingValue;
      if (field === 'listItem' && typeof itemIndex === 'number' && card.listItems) card.listItems[itemIndex] = editingValue;
      if (field === 'terminalLine' && typeof itemIndex === 'number' && card.terminalLines) card.terminalLines[itemIndex].text = editingValue;
      if (field === 'gridName' && typeof itemIndex === 'number' && card.gridItems) card.gridItems[itemIndex].name = editingValue;
      if (field === 'gridDesc' && typeof itemIndex === 'number' && card.gridItems) card.gridItems[itemIndex].desc = editingValue;
      return card;
    });
    setActiveEditor(null);
    setEditingValue('');
  };

  const cancelEditing = () => {
    setActiveEditor(null);
    setEditingValue('');
  };

  const handleTextSelection = (cardIndex: number, field: CardEditorField, selectedText: string, itemIndex?: number) => {
    if (!selectedText.trim()) return;
    setSelectionContext({ cardIndex, field, itemIndex, selectedText: selectedText.trim() });
    setAiCommentDraft('');
  };

  const handleCardImagePick = (cardIndex: number) => {
    pendingCardImageRef.current = cardIndex;
    cardImageInputRef.current?.click();
  };

  const handleCardImageChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const cardIndex = pendingCardImageRef.current;
    event.target.value = '';
    if (!file || cardIndex === null || !activeDoc) return;
    const dataUrl = await readFileAsDataUrl(file);
    const nextImageIndex = activeDoc.images.length;
    const nextDoc = cloneDoc(activeDoc);
    nextDoc.images.push(dataUrl);
    const previousCard = cloneDoc(nextDoc.cards[cardIndex]);
    nextDoc.cards[cardIndex].imageIndex = nextImageIndex;
    nextDoc.updatedAt = Date.now();
    replaceDoc(nextDoc, true, previousCard);
    pendingCardImageRef.current = null;
  };

  const handleAvatarChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    handleAuthorUpdate({ avatarImage: dataUrl });
  };

  const handleRewrite = async (mode: 'selection' | 'full-card') => {
    if (!selectionContext || !activeDoc || !aiCommentDraft.trim()) return;
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
          card: activeDoc.cards[selectionContext.cardIndex],
          config: apiConfig,
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'AI 修改失败');
      }
      if (mode === 'selection') {
        applyCardUpdate(selectionContext.cardIndex, card => {
          if (selectionContext.field === 'title') card.title = replaceFirst(card.title, selectionContext.selectedText, data.replacementText);
          if (selectionContext.field === 'subtitle') card.subtitle = replaceFirst(card.subtitle || '', selectionContext.selectedText, data.replacementText);
          if (selectionContext.field === 'content') card.content = replaceFirst(card.content, selectionContext.selectedText, data.replacementText);
          if (selectionContext.field === 'listItem' && typeof selectionContext.itemIndex === 'number' && card.listItems) {
            card.listItems[selectionContext.itemIndex] = replaceFirst(card.listItems[selectionContext.itemIndex], selectionContext.selectedText, data.replacementText);
          }
          if (selectionContext.field === 'terminalLine' && typeof selectionContext.itemIndex === 'number' && card.terminalLines) {
            card.terminalLines[selectionContext.itemIndex].text = replaceFirst(card.terminalLines[selectionContext.itemIndex].text, selectionContext.selectedText, data.replacementText);
          }
          if (selectionContext.field === 'gridName' && typeof selectionContext.itemIndex === 'number' && card.gridItems) {
            card.gridItems[selectionContext.itemIndex].name = replaceFirst(card.gridItems[selectionContext.itemIndex].name, selectionContext.selectedText, data.replacementText);
          }
          if (selectionContext.field === 'gridDesc' && typeof selectionContext.itemIndex === 'number' && card.gridItems) {
            card.gridItems[selectionContext.itemIndex].desc = replaceFirst(card.gridItems[selectionContext.itemIndex].desc, selectionContext.selectedText, data.replacementText);
          }
          return card;
        });
      } else {
        applyCardUpdate(selectionContext.cardIndex, card => ({
          ...card,
          ...data.card,
          id: card.id,
        }));
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
    setEditorDoc(previous);
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
    setEditorDoc(next);
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
    setEditorDoc(nextDoc);
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
    setEditorDoc(nextDoc);
    setResult(denormalizeEditorDoc(nextDoc));
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-hidden select-none">
      <input ref={cardImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleCardImageChosen} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChosen} />

      <nav className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex flex-col">
          <span className="font-script text-3xl tracking-tight drop-shadow-sm leading-none" style={{ color: '#9c5d21' }}>LittleRedNote Image Generator</span>
          <span className="font-script text-sm tracking-widest mt-0.5 opacity-60 ml-1" style={{ color: '#9c5d21' }}>@Jinger</span>
        </div>

        {errorMsg && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-red-50 border border-red-200 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 z-[100] animate-bounce">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-red-600 leading-none">{errorMsg.title}</span>
              <span className="text-[10px] text-red-400 leading-tight mt-0.5">{errorMsg.detail}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-300 hover:text-red-500 text-xs">×</button>
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
            onClick={loadMockCards}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            加载测试卡片
          </button>
          {activeDoc && (
            <button
              onClick={exportImages}
              className="px-6 py-2 bg-red-500 text-white text-sm font-bold rounded-full hover:bg-red-600 shadow-lg shadow-red-100 transition-all flex items-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>一键导出所有卡片 (PNG)</span>
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-96 bg-white border-r border-gray-200 p-6 flex flex-col gap-8 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <section className="bg-gray-50 -mx-6 -mt-6 p-6 border-b border-gray-200">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest mb-2 hover:opacity-80 transition-colors border-b pb-1"
              style={{ color: '#836638', borderColor: '#e0b01a' }}
            >
              <span>个人设置 / PREFERENCES</span>
              <Plus className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-45' : ''}`} />
            </button>
            {showSettings && (
              <div className="space-y-4 pt-2">
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setApiConfig({ ...apiConfig, provider: 'gemini' })}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'gemini' ? 'bg-black text-white' : 'text-gray-400'}`}
                  >Gemini</button>
                  <button
                    onClick={() => setApiConfig({ ...apiConfig, provider: 'openai' })}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'openai' ? 'bg-black text-white' : 'text-gray-400'}`}
                  >Custom API</button>
                </div>

                {apiConfig.provider === 'gemini' && (
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Gemini API Key (可选)"
                      value={apiConfig.apiKey}
                      onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                      className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
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
                        className="flex-1 text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                      />
                      <button
                        onClick={fetchModels}
                        disabled={fetchingModels || !apiConfig.apiKey}
                        title="刷新模型列表"
                        className={`px-3 flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-all disabled:opacity-50 ${fetchingModels ? 'animate-pulse' : ''}`}
                      >
                        <Sparkles className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Base URL (e.g. https://api.deepseek.com/v1)"
                      value={apiConfig.baseUrl}
                      onChange={e => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                      className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                    />

                    {availableModels.length > 0 ? (
                      <select
                        value={apiConfig.model}
                        onChange={e => setApiConfig({ ...apiConfig, model: e.target.value })}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                      >
                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Model (e.g. deepseek-chat)"
                        value={apiConfig.model}
                        onChange={e => setApiConfig({ ...apiConfig, model: e.target.value })}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
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
                      className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="@ID"
                      value={authorInfo.handle}
                      onChange={e => handleAuthorUpdate({ handle: e.target.value })}
                      className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
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
                        <button onClick={() => avatarInputRef.current?.click()} className="w-full rounded-lg bg-black px-3 py-2 text-[10px] font-bold text-white">
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
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${apiConfig.style === style.id ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
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
                  className="w-full h-32 text-sm border border-gray-200 rounded-xl p-4 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50/50 transition-all resize-none leading-relaxed bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">参考链接 / LINKS</label>
                  <button onClick={handleAddLink} className="p-1 bg-gray-100 hover:bg-black hover:text-white rounded-md transition-all">
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
                          className="w-full text-[12px] border border-gray-200 rounded-xl p-2.5 pl-9 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50/50 transition-all bg-gray-50/30"
                        />
                      </div>
                      {links.length > 1 && (
                        <button onClick={() => handleRemoveLink(idx)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
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
              className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragActive ? 'border-red-400 bg-red-50/30' : 'border-gray-200 hover:border-gray-300 bg-gray-50/30 hover:bg-white'}`}
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
                    <button
                      onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
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
            style={{ backgroundColor: loading || !ideas ? undefined : '#e9d9c3', borderColor: loading || !ideas ? undefined : '#6f4a0a' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" style={{ color: '#7f643e' }} />
                <div className="flex gap-1">
                  <span style={{ color: '#7f643e' }}>生成全套素材</span>
                  <span style={{ color: '#845a2e' }}>/ GENERATE</span>
                </div>
              </>
            )}
          </button>

          <button
            onClick={loadMockCards}
            className="w-full mt-2 py-2 rounded-full font-bold text-[11px] flex items-center justify-center gap-2 border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            本地测试数据 / MOCK
          </button>

          {activeDoc && (
            <section className="flex-1 mt-auto">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">小红书正文预览 / XHS COPY</h3>
              <div className="bg-gray-50 p-4 rounded-xl h-[280px] overflow-hidden flex flex-col border border-dashed border-gray-300 relative group">
                <textarea
                  value={activeDoc.caption}
                  onChange={e => setEditorDoc(prev => prev ? { ...prev, caption: e.target.value, updatedAt: Date.now() } : prev)}
                  className="text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto scrollbar-hide bg-transparent outline-none resize-none"
                />
                <div className="mt-4 flex flex-wrap gap-1">
                  {activeDoc.tags.map((t, idx) => (
                    <input
                      key={`${t}-${idx}`}
                      value={t}
                      onChange={e => setEditorDoc(prev => {
                        if (!prev) return prev;
                        const next = cloneDoc(prev);
                        next.tags[idx] = e.target.value;
                        next.updatedAt = Date.now();
                        return next;
                      })}
                      className="min-w-[72px] rounded bg-white px-2 py-1 text-red-500 font-bold text-[11px] outline-none"
                    />
                  ))}
                </div>
                <button onClick={copyCaption} className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-md border border-gray-100 text-gray-500 hover:text-red-500 transition-colors">
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}
        </aside>

        <section className="flex-1 p-8 overflow-y-auto relative flex flex-col items-center bg-[#f3f4f6]">
          <div className="absolute top-4 left-8 flex gap-6 text-[11px] font-black uppercase tracking-widest">
            <span className="pb-1 cursor-default border-b-2" style={{ color: '#836638', borderColor: '#e0b01a' }}>预览模式 / PREVIEW</span>
            <span className="text-gray-400 cursor-default">编辑草稿 / DRAFT</span>
          </div>

          {!activeDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8 text-gray-200" />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.2em] italic">Waiting for Magic...</p>
            </div>
          ) : (
            <div className="w-full max-w-lg mt-12 flex flex-col gap-12 items-center pb-24">
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
                        content={card.content}
                        isCover={card.isCover}
                        layout={card.layout}
                        listItems={card.listItems}
                        terminalLines={card.terminalLines}
                        gridItems={card.gridItems}
                        image={card.imageIndex !== undefined ? activeDoc.images[card.imageIndex] : undefined}
                        authorInfo={activeDoc.authorInfo}
                        className="scale-100"
                        editable
                        activeEditor={activeEditor}
                        editingValue={editingValue}
                        onEditingValueChange={setEditingValue}
                        onStartEdit={(field, itemIndex) => startEditing(i, field, itemIndex)}
                        onCommitEdit={commitEditing}
                        onCancelEdit={cancelEditing}
                        onSelectText={(field, selectedText, itemIndex) => handleTextSelection(i, field, selectedText, itemIndex)}
                        onPickImage={() => handleCardImagePick(i)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <div className="px-3 py-1 bg-white border border-gray-200 text-[10px] font-black text-gray-400 rounded-lg shadow-sm">
                      {card.isCover ? 'COVER PAGE' : `STEP ${i}`}
                    </div>
                    <div className="px-3 py-1 bg-black text-white text-[10px] font-mono font-bold rounded-lg shadow-lg">
                      {i + 1} / {activeDoc.cards.length}
                    </div>
                    <button onClick={() => handleCardImagePick(i)} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{card.imageIndex !== undefined ? '换图' : '插图'}</span>
                    </button>
                    <button onClick={() => handleUndoCard(i)} disabled={!cardHistory[card.id]?.past?.length} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1 disabled:opacity-40">
                      <Undo2 className="w-3 h-3" />
                      <span>单卡撤销</span>
                    </button>
                    <button onClick={() => handleRedoCard(i)} disabled={!cardHistory[card.id]?.future?.length} className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 flex items-center gap-1 disabled:opacity-40">
                      <Redo2 className="w-3 h-3" />
                      <span>单卡恢复</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="fixed bottom-12 left-1/2 -translate-x-[calc(50%-180px)] xl:-translate-x-[calc(50%-192px)] flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-white/50 z-20 transition-all hover:scale-105">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#876125' }}></div>
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Live Editing + Auto Save Active
            </span>
          </div>

          {selectionContext && (
            <div className="fixed right-8 bottom-24 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl p-4 z-30">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquarePlus className="w-3 h-3" />
                    AI 继续修改
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500 leading-relaxed line-clamp-3">“{selectionContext.selectedText}”</p>
                </div>
                <button onClick={() => setSelectionContext(null)} className="text-gray-300 hover:text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={aiCommentDraft}
                onChange={e => setAiCommentDraft(e.target.value)}
                placeholder="比如：这句话更犀利一点 / 更像小红书语气 / 更具体一点"
                className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-[12px] outline-none resize-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRewrite('selection')}
                  disabled={rewriting || !aiCommentDraft.trim()}
                  className="rounded-xl bg-black px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40"
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
        </section>
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
          <span>VIBE CODING ENGINE ACTIVE</span>
          <div className="flex items-center gap-1.5">
            <span style={{ borderColor: '#99c88c', color: '#628d60' }} className="text-red-500 animate-pulse text-lg">●</span>
            <span className="mt-0.5">RECORDING UI CHANGES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
