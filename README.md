# RedNote Card Studio

**小红书笔记卡片生成器** — 输入灵感想法、参考链接和截图素材，AI 自动生成一套可编辑的小红书卡片和正文，支持一键导出 PNG。

🔗 **在线体验：[rednote-image-generater-production.up.railway.app](https://rednote-image-generater-production.up.railway.app/)**

---

## ✨ 功能

- 🤖 **AI 一键生成** — 输入想法/参考链接/截图，自动生成封面 + 多张内容卡片
- 🎨 **三种创作风格** — 推特金句 / 小红书爆款 / 干货教程
- ✏️ **卡片实时编辑** — 点击直接改文字，支持荧光笔、标签等富文本标记
- 🪄 **局部 AI 改写** — 选中文字或整张卡片，直接让 AI 帮你重写
- 📸 **图片插入** — 每张卡片可插入/裁剪图片
- 💾 **历史笔记管理** — 手动保存版本、导出/导入 JSON（换浏览器不丢数据）
- 📤 **灵活导出** — 单张导出或一键导出全部 PNG（1242×1660 高清）
- ✍️ **正文 AI 优化** — 正文/COPY 区支持 AI 润色，告诉它怎么改就怎么改
- 🔌 **OpenAI 兼容接口** — 支持 OpenAI、DeepSeek 等兼容 OpenAI API 的服务

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
| `OPENAI_API_KEY` | OpenAI 兼容 API Key，如 OpenAI / DeepSeek |
| `OPENAI_BASE_URL` | 自定义 API 地址，如 `https://api.deepseek.com/v1` |
| `OPENAI_MODEL_NAME` | 模型名，如 `deepseek-chat` |
| `PORT` | 服务端口（默认 3000） |

> 页面右上角也可以直接填写 API Key、Base URL 和模型名。它们会保存在浏览器本地，不会上传到仓库。

---

## 🛠 技术栈

| 类型 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS v4 |
| 后端 | Express.js |
| AI | OpenAI SDK（兼容 OpenAI API） |
| 导出 | html-to-image |

---

## 📄 License

[MIT](./LICENSE)
