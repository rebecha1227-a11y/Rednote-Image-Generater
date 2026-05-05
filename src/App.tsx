import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toPng } from 'html-to-image';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Plus, 
  Trash2, 
  Clipboard, 
  ChevronRight,
  Eye,
  Type,
  Image as ImageIcon
} from 'lucide-react';
import { TweetCard } from './components/TweetCard';

export default function App() {
  const [ideas, setIdeas] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<{ title: string; detail: string } | null>(null);
  const [authorInfo, setAuthorInfo] = useState({
    name: 'Jinger',
    handle: '@Jinger_Vibe',
    avatarSeed: 'Jinger'
  });
  const [apiConfig, setApiConfig] = useState({
    provider: 'gemini', // 'gemini' or 'openai'
    apiKey: '',
    baseUrl: '',
    model: '',
    style: 'twitter' // 'twitter', 'xhs', 'tutorial'
  });

  // Auto-fetch models when config changes (OpenAI only)
  React.useEffect(() => {
    if (apiConfig.provider === 'openai' && apiConfig.apiKey) {
      const timer = setTimeout(() => {
        fetchModels();
      }, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [apiConfig.apiKey, apiConfig.baseUrl]);

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
        // 如果当前模型不在新列表里，自动切换到第一个可用的
        if (data.models.length > 0 && !data.models.includes(apiConfig.model)) {
          const defaultModel = data.models.find((m: string) => m.toLowerCase().includes('chat')) || data.models[0];
          setApiConfig(prev => ({...prev, model: defaultModel}));
        }
      } else {
        setErrorMsg({ title: "模型获取失败", detail: data.error || "请检查 API Key 和 Base URL 是否正确" });
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setErrorMsg({ title: "网络错误", detail: "无法连接到服务器，请稍后再试" });
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setFetchingModels(false);
    }
  };
  const [result, setResult] = useState<{
    caption: string;
    cards: { title: string; subtitle?: string; content: string; imageIndex?: number; isCover?: boolean }[];
    tags: string[];
  } | null>(null);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  const handleAddLink = () => setLinks([...links, '']);
  const handleRemoveLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
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
          { "title": "封面标题", "subtitle": "封面副标题", "content": "", "imageIndex": 0, "isCover": true },
          { "title": "卡片1标题", "content": "卡片1内容", "imageIndex": 1 }
        ]
      }
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
      const data = await response.json();
      if (data.error) {
        setErrorMsg({ title: data.error, detail: data.details || "由于 API 限制，生成未能成功" });
        return;
      }
      setResult(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg({ title: "生成失败", detail: error.message });
    } finally {
      setLoading(false);
    }
  };

  const exportImages = async () => {
    if (!result) return;
    for (let i = 0; i < result.cards.length; i++) {
      const el = cardRefs.current[i];
      if (el) {
        // We need to render the card at its full size (1080x1440) for export
        // but the preview is scaled down. 
        // Part of the trick is that html-to-image takes the actual DOM dimensions.
        const dataUrl = await toPng(el, { 
          pixelRatio: 1,
          width: 1080,
          height: 1440,
        });
        const link = document.createElement('a');
        link.download = `card-${i + 1}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  };

  const copyCaption = () => {
    if (!result) return;
    const text = `${result.caption}\n\n${result.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-hidden select-none">
      {/* Top Navigation Tool Bar */}
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

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#feebdb' }}></div>
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#e3c69a' }}></div>
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#a37c40' }}></div>
          </div>
          {result && (
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
        {/* Sidebar: Input Controls */}
        <aside className="w-96 bg-white border-r border-gray-200 p-6 flex flex-col gap-8 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          {/* API Settings Section */}
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
                    onClick={() => setApiConfig({...apiConfig, provider: 'gemini'})}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'gemini' ? 'bg-black text-white' : 'text-gray-400'}`}
                   >Gemini</button>
                   <button 
                    onClick={() => setApiConfig({...apiConfig, provider: 'openai'})}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${apiConfig.provider === 'openai' ? 'bg-black text-white' : 'text-gray-400'}`}
                   >Custom API</button>
                 </div>
                 
                 {apiConfig.provider === 'gemini' && (
                   <div className="space-y-2">
                     <input 
                       type="password" 
                       placeholder="Gemini API Key (可选)" 
                       value={apiConfig.apiKey}
                       onChange={e => setApiConfig({...apiConfig, apiKey: e.target.value})}
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
                          onChange={e => setApiConfig({...apiConfig, apiKey: e.target.value})}
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
                       onChange={e => setApiConfig({...apiConfig, baseUrl: e.target.value})}
                       className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                     />
                     
                     {availableModels.length > 0 ? (
                       <select
                        value={apiConfig.model}
                        onChange={e => setApiConfig({...apiConfig, model: e.target.value})}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                       >
                         {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                     ) : (
                       <input 
                         type="text" 
                         placeholder="Model (e.g. deepseek-chat)" 
                         value={apiConfig.model}
                         onChange={e => setApiConfig({...apiConfig, model: e.target.value})}
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
                         onChange={e => setAuthorInfo({...authorInfo, name: e.target.value})}
                         className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                       />
                       <input 
                         type="text" 
                         placeholder="@ID" 
                         value={authorInfo.handle}
                         onChange={e => setAuthorInfo({...authorInfo, handle: e.target.value})}
                         className="text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                       />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-bold ml-1">头像种子 (DiceBear Seed)</label>
                      <input 
                        type="text" 
                        placeholder="输入文字改变头像..." 
                        value={authorInfo.avatarSeed}
                        onChange={e => setAuthorInfo({...authorInfo, avatarSeed: e.target.value})}
                        className="w-full text-[11px] p-2 border border-gray-200 rounded-lg outline-none focus:border-red-400 bg-white"
                      />
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
                      onClick={() => setApiConfig({...apiConfig, style: style.id})}
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
                  <button 
                    onClick={handleAddLink}
                    className="p-1 bg-gray-100 hover:bg-black hover:text-white rounded-md transition-all"
                  >
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
                        <button 
                          onClick={() => handleRemoveLink(idx)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        >
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
              className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2
                ${isDragActive ? 'border-red-400 bg-red-50/30' : 'border-gray-200 hover:border-gray-300 bg-gray-50/30 hover:bg-white'}
              `}
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
                    <img src={img} className="w-full h-full object-cover" />
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
            style={{ 
              backgroundColor: loading || !ideas ? undefined : '#e9d9c3', 
              borderColor: loading || !ideas ? undefined : '#6f4a0a' 
            }}
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

          {result && (
            <section className="flex-1 mt-auto">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">小红书正文预览 / XHS COPY</h3>
              <div className="bg-gray-50 p-4 rounded-xl h-[280px] overflow-hidden flex flex-col border border-dashed border-gray-300 relative group">
                <div className="text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto scrollbar-hide">
                  {result.caption}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {result.tags.map(t => <span key={t} className="text-red-500 font-bold">#{t}</span>)}
                  </div>
                </div>
                <button 
                  onClick={copyCaption}
                  className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-md border border-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}
        </aside>

        {/* Main Workspace: Card Previews */}
        <section className="flex-1 p-8 overflow-y-auto relative flex flex-col items-center bg-[#f3f4f6]">
          <div className="absolute top-4 left-8 flex gap-6 text-[11px] font-black uppercase tracking-widest">
            <span className="pb-1 cursor-default border-b-2" style={{ color: '#836638', borderColor: '#e0b01a' }}>预览模式 / PREVIEW</span>
            <span className="text-gray-400 hover:text-gray-800 cursor-pointer transition-colors">导出历史 / HISTORY</span>
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center animate-bounce">
                <Sparkles className="w-8 h-8 text-gray-200" />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.2em] italic">Waiting for Magic...</p>
            </div>
          ) : (
            <div className="w-full max-w-lg mt-12 flex flex-col gap-12 items-center pb-24">
              {result.cards.map((card, i) => (
                <div key={i} className="flex flex-col items-center gap-6 group">
                   <div className="relative overflow-hidden rounded-2xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-black/5" style={{width: '378px', height: '504px'}}>
                      <div className="absolute top-0 left-0 w-[1080px] h-[1440px] origin-top-left" style={{transform: 'scale(0.35)'}}>
                        <TweetCard
                          ref={el => (cardRefs.current[i] = el)}
                          index={i + 1}
                          total={result.cards.length}
                          title={card.title}
                          subtitle={card.subtitle}
                          content={card.content}
                          isCover={card.isCover}
                          image={card.imageIndex !== undefined ? images[card.imageIndex] : undefined}
                          authorInfo={authorInfo}
                          className="scale-100"
                        />
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-white border border-gray-200 text-[10px] font-black text-gray-400 rounded-lg shadow-sm">
                        {card.isCover ? 'COVER PAGE' : `STEP ${i}`}
                      </div>
                      <div className="px-3 py-1 bg-black text-white text-[10px] font-mono font-bold rounded-lg shadow-lg">
                        {i + 1} / {result.cards.length}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Overlay Hint */}
          <div className="fixed bottom-12 left-1/2 -translate-x-[calc(50%-180px)] xl:-translate-x-[calc(50%-192px)] flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-white/50 z-20 transition-all hover:scale-105">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#876125' }}></div>
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Live Rendering: 1080 × 1440 HD Output
            </span>
          </div>
        </section>
      </main>

      {/* Bottom Status Bar */}
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
