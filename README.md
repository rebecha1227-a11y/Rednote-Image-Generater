# RedNote Card Studio

**Twitter 风小红书笔记图片生成器** — 输入灵感想法，AI 自动生成一套带结构化卡片的小红书笔记素材，支持一键导出 PNG。

🔗 **在线体验：[rednote-image-generater-production.up.railway.app](https://rednote-image-generater-production.up.railway.app/)**

---

## ✨ 功能

- 🤖 **AI 一键生成** — 输入想法/参考链接/截图，自动生成封面 + 多张内容卡片
- 🎨 **三种创作风格** — 推特金句 / 小红书爆款 / 干货教程
- ✏️ **卡片实时编辑** — 点击直接改文字，支持荧光笔、标签等富文本标记
- 📸 **图片插入** — 每张卡片可插入/裁剪图片
- 💾 **历史笔记管理** — 手动保存版本、导出/导入 JSON（换浏览器不丢数据）
- 📤 **灵活导出** — 单张导出或一键导出全部 PNG（1242×1660 高清）
- ✍️ **正文 AI 优化** — 正文/COPY 区支持 AI 润色，告诉它怎么改就怎么改
- 🔌 **多 API 支持** — Gemini（默认）/ DeepSeek / OpenAI 兼容接口均可用

---

## 🚀 本地运行

**前置条件：** Node.js 18+

```bash
# 1. 克隆项目
git clone https://github.com/rebecha1227-a11y/Rednote-Image-Generater.git
cd Rednote-Image-Generater

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

---

## 🔑 环境变量

复制 `.env.example` 为 `.env`，按需填写：

| 变量 | 说明 |
|------|------|
| `GEMINI_API_KEY` | Gemini API Key（默认 provider，[免费申请](https://aistudio.google.com/)） |
| `OPENAI_API_KEY` | OpenAI 兼容 API Key（DeepSeek / OpenAI 等） |
| `OPENAI_BASE_URL` | 自定义 API 地址，如 `https://api.deepseek.com` |
| `OPENAI_MODEL_NAME` | 模型名，如 `deepseek-chat` |
| `PORT` | 服务端口（默认 3000） |

> 也可以不配置服务端环境变量，在页面右上角「个人设置」里直接填入 API Key，存在浏览器本地。

---

## 🛠 技术栈

| 类型 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS v4 |
| 后端 | Express.js |
| AI | Gemini (`@google/genai`) / OpenAI SDK |
| 导出 | html-to-image |

---

## 📄 License

[MIT](./LICENSE)
