import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Route for Content Generation
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, images, config } = req.body;

      // Determine which AI provider to use
      const useExternal = config?.apiKey || process.env.OPENAI_API_KEY;
      
      let text = "";

      if (useExternal) {
        // --- OpenAI Compatible Implementation ---
        const openai = new OpenAI({
          apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
          baseURL: config?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        });

        const model = config?.model || process.env.OPENAI_MODEL_NAME || "gpt-4o";
        
        const messages: any[] = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...(images || []).map((img: string) => ({
                type: "image_url",
                image_url: { url: img },
              })),
            ],
          },
        ];

        const response = await openai.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" },
        });

        text = response.choices[0].message.content || "";
      } else {
        // --- Default Gemini Implementation ---
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const parts: any[] = [prompt];
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
        const response = await result.response;
        text = response.text();
        // Clean up markdown
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Provider Error:", error);
      res.status(500).json({ 
        error: "Failed to generate content", 
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
