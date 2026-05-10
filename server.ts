import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, ads, header, aside').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.slice(0, 3000);
  } catch (error: any) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return `[无法获取该链接内容: ${url}]`;
  }
}

function sanitizeBaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let sanitized = url.trim();
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    sanitized = 'https://' + sanitized;
  }
  return sanitized.replace(/\/$/, "");
}

async function generateText(config: any, finalPrompt: string, images?: string[]) {
  let text = "";
  const isCustomOpenAI = config?.provider === "openai";
  const isCustomGemini = config?.provider === "gemini" && config?.apiKey;

  if (isCustomOpenAI) {
    const sanitizedUrl = sanitizeBaseUrl(config.baseUrl);
    const openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: sanitizedUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      defaultHeaders: {
        'Authorization': `Bearer ${config.apiKey || process.env.OPENAI_API_KEY}`
      }
    });

    const modelName = config.model || process.env.OPENAI_MODEL_NAME || "gpt-4o";
    const hasImages = images && Array.isArray(images) && images.length > 0;
    const isVisionModel = modelName.includes('vision') || modelName.includes('gpt-4o') || modelName.includes('claude-3') || modelName.includes('vl') || modelName.includes('visual') || modelName.includes('gemini') || modelName.includes('llava');

    const content: any = (!hasImages || !isVisionModel) ? finalPrompt : [
      { type: "text", text: finalPrompt },
      ...images.map((img: string) => ({
        type: "image_url",
        image_url: { url: img },
      })),
    ];

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content }],
      response_format: undefined,
    });
    const choice = response?.choices?.[0];
    if (!choice) {
      console.error("Unexpected API response:", JSON.stringify(response));
      throw new Error("API 返回格式异常，没有 choices 字段。请确认该接口兼容 OpenAI 格式，或检查模型名称是否填写正确。");
    }
    text = choice.message?.content || "";
  } else {
    const apiKey = isCustomGemini ? config.apiKey : process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Gemini API Key 未正确配置。如果你使用的是系统默认 Key，请确保已在 AI Studio Secrets 面板设置 GEMINI_API_KEY 且它是有效的 API Key。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = isCustomGemini ? (config.model || "gemini-2.0-flash") : "gemini-2.0-flash";
    const contents: any[] = [{ role: "user", parts: [{ text: finalPrompt }] }];

    if (images && Array.isArray(images)) {
      images.forEach((img) => {
        const [mimePart, dataPart] = img.split(";base64,");
        contents[0].parts.push({
          inlineData: {
            data: dataPart,
            mimeType: mimePart.split(":")[1] || "image/png",
          },
        });
      });
    }

    const result = await ai.models.generateContent({ model: modelName, contents });
    text = result.text || "";
  }

  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "25mb" }));

  app.post("/api/models", async (req, res) => {
    try {
      const { apiKey, baseUrl } = req.body;
      if (!apiKey) return res.status(400).json({ error: "API Key is required" });

      const sanitizedUrl = sanitizeBaseUrl(baseUrl);
      console.log(`Fetching models from: ${sanitizedUrl || 'OpenAI Default'}`);

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: sanitizedUrl || "https://api.openai.com/v1",
        defaultHeaders: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      const list = await openai.models.list();
      const models = list.data.map(m => m.id).sort();
      res.json({ models });
    } catch (error: any) {
      console.error("Fetch Models Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(': ping\n\n'), 5000);
    const sendResult = (data: any) => {
      clearInterval(keepAlive);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.end();
    };

    try {
      const { prompt: userPrompt, images, links, config } = req.body;

      let scrapedContext = "";
      if (links && Array.isArray(links) && links.length > 0) {
        const contents = await Promise.all(links.map(link => {
          if (!link || !link.startsWith('http')) return Promise.resolve("");
          return fetchUrlContent(link);
        }));
        scrapedContext = contents.filter(c => c).map((c, i) => `参考来源 ${i + 1} (${links[i]}):\n${c}`).join("\n\n");
      }

      const finalPrompt = `
      参考资料:
      ${scrapedContext}

      用户想法/背景需求:
      ${userPrompt}

      请根据以上信息、想法和图片素材，生成一篇小红书笔记素材。
      必须按要求输出指定的 JSON 格式。
      `;

      const text = await generateText(config, finalPrompt, images);

      try {
        sendResult(JSON.parse(text));
      } catch (parseError) {
        console.error("JSON Parse Error:", text);
        sendResult({
          caption: "生成成功（非标准格式）",
          cards: [{ title: "笔记内容", content: text }],
          tags: []
        });
      }
    } catch (error: any) {
      console.error("API Error:", error);

      let errorMessage = "生成失败";
      let details = error.message;

      if (error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429) {
        errorMessage = "API 额度已耗尽";
        details = "Gemini 免费额度已用完，请稍后再试，或者在设置中填入你自己的 API Key 以获得独立配额。";
      } else if (error.status === 401) {
        errorMessage = "API Key 错误";
        details = "提供的 API Key 无效或已过期，请检查设置。";
      } else if (error.message?.includes("image_url") || error.status === 400) {
        if (error.message?.includes("expected text")) {
          errorMessage = "模型不支持图片";
          details = "当前选择的模型不支持图片输入，请尝试移除图片或更换为 vision 系列模型。";
        }
      }

      sendResult({ error: errorMessage, details });
    }
  });

  app.post("/api/rewrite-caption", async (req, res) => {
    try {
      const { caption, instruction, config } = req.body;
      if (!caption || !instruction) {
        return res.status(400).json({ error: "缺少正文或优化指令" });
      }
      const prompt = `你是小红书文案编辑。根据用户的要求优化下面这段正文。只返回优化后的正文纯文本，不要解释，不要加引号，不要加标题。\n\n原正文：\n${caption}\n\n用户要求：${instruction}`;
      const text = await generateText(config, prompt);
      return res.json({ caption: text.trim() });
    } catch (error: any) {
      console.error("Rewrite Caption Error:", error);
      return res.status(500).json({ error: error.message || "AI 优化失败" });
    }
  });

  app.post("/api/rewrite-card", async (req, res) => {
    try {
      const { mode, instruction, selectedText, field, card, config } = req.body;
      if (!instruction || !card) {
        return res.status(400).json({ error: "缺少修改指令或卡片内容" });
      }

      const finalPrompt = mode === 'selection'
        ? `你是卡片文案编辑器。请根据用户要求，只改选中的那一小段，不要解释，不要加引号，只返回替换后的纯文本。\n\n字段：${field}\n原卡片 JSON：${JSON.stringify(card)}\n选中文字：${selectedText}\n用户要求：${instruction}`
        : `你是卡片文案编辑器。请根据用户要求重写整张卡片，但保持原有 layout 类型和整体信息方向。只返回 JSON，不要解释。\n\n原卡片 JSON：${JSON.stringify(card)}\n用户要求：${instruction}\n\n返回格式：{"card":{"title":"...","subtitle":"...","hookText":"...","content":"...","layout":"${card.layout || 'text'}","listItems":[],"terminalLines":[],"gridItems":[],"blocks":[],"imageIndex":${typeof card.imageIndex === 'number' ? card.imageIndex : 'null'},"imageIndex2":${typeof card.imageIndex2 === 'number' ? card.imageIndex2 : 'null'},"isCover":${!!card.isCover}}}`;

      const text = await generateText(config, finalPrompt);

      if (mode === 'selection') {
        return res.json({ replacementText: text.trim() });
      }

      const parsed = JSON.parse(text);
      if (!parsed?.card) {
        return res.status(500).json({ error: "AI 返回格式不对" });
      }
      return res.json(parsed);
    } catch (error: any) {
      console.error("Rewrite Card Error:", error);
      return res.status(500).json({ error: error.message || "AI 修改失败" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

