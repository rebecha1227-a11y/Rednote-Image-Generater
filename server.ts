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

// Helper to fetch and clean text from URL
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

// Helper to ensure URL has protocol
function sanitizeBaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let sanitized = url.trim();
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    sanitized = 'https://' + sanitized;
  }
  // Ensure we don't have trailing slash for some libraries that add it automatically
  return sanitized.replace(/\/$/, "");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "25mb" }));

  // API Route to fetch available models (OpenAI compatible)
  app.post("/api/models", async (req, res) => {
    try {
      const { apiKey, baseUrl } = req.body;
      if (!apiKey) return res.status(400).json({ error: "API Key is required" });

      const sanitizedUrl = sanitizeBaseUrl(baseUrl);
      // Log for debugging (internal console)
      console.log(`Fetching models from: ${sanitizedUrl || 'OpenAI Default'}`);
      
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: sanitizedUrl || "https://api.openai.com/v1",
        // Some proxies need direct auth headers
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
    try {
      const { prompt: userPrompt, images, links, config } = req.body;

      let scrapedContext = "";
      if (links && Array.isArray(links) && links.length > 0) {
        const contents = await Promise.all(links.map(link => {
          if (!link || !link.startsWith('http')) return Promise.resolve("");
          return fetchUrlContent(link);
        }));
        scrapedContext = contents.filter(c => c).map((c, i) => `参考来源 ${i+1} (${links[i]}):\n${c}`).join("\n\n");
      }

      const finalPrompt = `
      参考资料:
      ${scrapedContext}
      
      用户想法/背景需求:
      ${userPrompt}
      
      请根据以上信息、想法和图片素材，生成一篇小红书笔记素材。
      必须按要求输出指定的 JSON 格式。
      `;

      let text = "";

      // Decision logic for AI provider
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
        
        // Detect if the model likely supports vision (be permissive for third-party proxies)
        const isVisionModel = modelName.includes('vision') || modelName.includes('gpt-4o') || modelName.includes('claude-3') || modelName.includes('vl') || modelName.includes('visual') || modelName.includes('gemini') || modelName.includes('llava');

        // Fallback: If not a known vision model and images are present, we might want to warn
        // but the most robust way is to follow the API's requirements.
        // If "unknown variant image_url", we must only use text.
        const content: any = (!hasImages || !isVisionModel) ? finalPrompt : [
          { type: "text", text: finalPrompt },
          ...images.map((img: string) => ({
            type: "image_url",
            image_url: { url: img },
          })),
        ];

        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "user",
              content: content,
            },
          ],
          response_format: undefined,
        });
        const choice = response?.choices?.[0];
        if (!choice) {
          console.error("Unexpected API response:", JSON.stringify(response));
          throw new Error("API 返回格式异常，没有 choices 字段。请确认该接口兼容 OpenAI 格式，或检查模型名称是否填写正确。");
        }
        text = choice.message?.content || "";
      } else {
        // Use Gemini (System or Custom)
        const apiKey = isCustomGemini ? config.apiKey : process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
          throw new Error("Gemini API Key 未正确配置。如果你使用的是系统默认 Key，请确保已在 AI Studio Secrets 面板设置 GEMINI_API_KEY 且它是有效的 API Key。");
        }

        const ai = new GoogleGenAI({ apiKey });
        const modelName = isCustomGemini ? (config.model || "gemini-2.0-flash") : "gemini-2.0-flash";
        
        const contents: any[] = [{
          role: "user",
          parts: [{ text: finalPrompt }]
        }];

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

        const result = await ai.models.generateContent({
          model: modelName,
          contents
        });

        text = result.response.text() || "";
      }

      // Clean markdown and extra whitespace from ANY AI provider
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      // Final response
      try {
        res.json(JSON.parse(text));
      } catch (parseError) {
        console.error("JSON Parse Error:", text);
        // Fallback if AI didn't return valid JSON
        res.json({
          caption: "生成成功（非标准格式）",
          cards: [{ title: "笔记内容", content: text }],
          tags: []
        });
      }
    } catch (error: any) {
      console.error("API Error:", error);
      
      let errorMessage = "生成失败";
      let details = error.message;

      // Handle Gemini Quota Exceeded specifically
      if (error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429) {
        errorMessage = "API 额度已耗尽";
        details = "Gemini 免费额度已用完，请稍后再试，或者在设置中填入你自己的 API Key 以获得独立配额。";
      } else if (error.status === 401) {
        errorMessage = "API Key 错误";
        details = "提供的 API Key 无效或已过期，请检查设置。";
      } else if (error.message?.includes("image_url") || error.status === 400) {
        if (error.message?.includes("expected text")) {
          errorMessage = "模型不支持图片";
          details = "当前选择的模型（例如某些版本的 O1 或 DeepSeek）不支持图片输入，请尝试移除图片或更换为 vision 系列模型。";
        }
      }

      res.status(500).json({ 
        error: errorMessage, 
        details: details 
      });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
