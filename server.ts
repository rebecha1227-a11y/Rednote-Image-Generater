import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

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

      const useExternal = config?.apiKey || process.env.OPENAI_API_KEY;
      let text = "";

      if (useExternal) {
        const openai = new OpenAI({
          apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
          baseURL: config?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        });

        const response = await openai.chat.completions.create({
          model: config?.model || process.env.OPENAI_MODEL_NAME || "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: finalPrompt },
                ...(images || []).map((img: string) => ({
                  type: "image_url",
                  image_url: { url: img },
                })),
              ],
            },
          ],
          response_format: { type: "json_object" },
        });
        text = response.choices[0].message.content || "";
      } else {
        const apiKey = process.env.GEMINI_API_KEY;
        // Check if apiKey is valid (not a placeholder from .env.example)
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
          throw new Error("Gemini API Key 未在环境变量中正确配置。请在 Secrets 面板设置。");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const parts: any[] = [{ text: finalPrompt }];
        if (images && Array.isArray(images)) {
          images.forEach((img) => {
            parts.push({
              inlineData: {
                data: img.split(",")[1],
                mimeType: "image/png",
              },
            });
          });
        }

        const result = await model.generateContent(parts);
        const gResponse = await result.response;
        text = gResponse.text().replace(/```json/g, "").replace(/```/g, "").trim();
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ 
        error: "生成失败", 
        details: error.message 
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
