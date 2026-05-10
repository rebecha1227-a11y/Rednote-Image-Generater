# 交接文档 — 小红书 AI 内容生成器

更新时间：2026-05-07（第 3 次更新）

---

## 本会话完成的工作

| # | 改动 | 说明 |
|---|------|------|
| 1 | **去掉 7 张卡片硬限制** | AI 自行决定卡片数量（通常 3-8 张），不再固定 7 张 |
| 2 | **每张卡片都有文字块/图片块** | text、list、terminal、grid 类型卡片底部都有"文字块""图片块"按钮，可以自由添加内容块序列 |
| 3 | **卡片上传的图片不进侧栏** | `handleCardImageChosen` 改为内联存储（`card.imageData`/`image2Data`/`block.imageData`），不再 push 到 `images[]` |
| 4 | **修复手动保存按钮** | `loadVersions` 中 `getAll` 调了两次而不是 `getAll`+`getAllKeys`，导致所有版本 key 为 undefined，已修复 |
| 5 | **图片裁剪集成** | 安装 `react-easy-crop`，侧栏图片 hover 出现"封面左图"/"封面右图"快捷按钮 + 小 × 删除；卡片已有图片出现"裁剪""裁剪右图"按钮 |
| 6 | **封面快捷设置** | 侧栏图片 hover 可直接设为封面左/右图 |
| 7 | **`formatBeijingTime` 优化** | 从 +8h UTC hack 改为 `Intl.DateTimeFormat` + `timeZone: 'Asia/Shanghai'` |
| 8 | **底部状态栏整合** | 删除浮动的 "Live Editing + Auto Save Active" 标签，整合进 footer 状态栏 |
| 9 | **去掉多余滚动空白** | 预览区和正文编辑区底部留白从 `pb-24` → `pb-8` |

---

## 当前代码状态

### 已改动的文件

**`src/App.tsx`**（~1700 行）
- 新增 state：`cropState`（裁剪弹窗状态）、`previewMode`、`copyTab`
- 类型扩展：`BaseCardData` 加了 `imageData`、`image2Data`、`hookText`、`blocks`
- `handleCardImageChosen`：改为内联存储图片（不污染 `images[]`）
- `handleCropExistingImage`：新增，对已有图片裁剪
- `handleSetCoverImage`：新增，侧栏图片设为封面
- `handleGenerate`：prompt 不再限制卡片数量，要求 text 类型使用 blocks 字段
- `loadVersions`：修复 `getAll`/`getAllKeys` 双调用 bug
- UI：裁剪弹窗（react-easy-crop）、侧栏图片 hover 快捷封面按钮、预览/正文切换 tab

**`src/components/TweetCard.tsx`**（~670 行）
- 类型：`ContentBlock` 加了 `imageData`、`imageIndex`
- `renderBlockSequence`：不再要求 blocks 存在才渲染，空 blocks 也显示添加按钮
- `renderText`/`renderList`/`renderTerminal`/`renderGrid`：统一加 `renderBlockSequence` + 内联图片
- 删除 `renderCardImage`（死代码）
- `formatBeijingTime`：改用 `Intl.DateTimeFormat` + `timeZone: 'Asia/Shanghai'`

**`server.ts`**
- 微调：相关改动极少（AI prompt 更新）

**`package.json` / `package-lock.json`**
- 新增依赖：`react-easy-crop@^5.5.7`

---

## 已知 Bug / 风险

### 1. AI 不会生成 blocks 字段（最高优先级）
`server.ts` 的 system prompt 虽然改了 text 类型使用 blocks，但 AI 返回的格式仍可能不一致。
- 解析层有容错（自动包装为非标准格式），但 blocks 数据可能为空
- **如果 AI 不生成 blocks，卡片会走旧的 `content` 字段渲染，能正常显示但没有块序列**

### 2. 裁剪流程依赖 react-easy-crop
`react-easy-crop` 的 `CropperProps` 中 `style` 和 `classes` 在类型定义中是 required，实现里传了空对象兜底。
- dev 模式下无报错，build 应该也没问题
- 如果在生产环境裁剪弹窗打不开，先检查 `react-easy-crop` 样式是否正常注入

### 3. 索引数据量大的情况下的性能
`images[]` 数组和卡片内联 `imageData` 如果积累大量 Base64 图片，IndexedDB 保存/恢复可能有短暂卡顿。
- 当前场景（小红书卡片，几张图）完全没问题
- 如果未来单文档图片超过 20 张，要考虑独立图片存储

---

## 待办任务（排查后更新）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | **主题色统一**（暖棕色系） | ✅ 已完成 | `index.css` 的 `@theme` 块已定义 brand/gold 色系，Tailwind v4 自动生成 utility class |
| 2 | **选中文字 AI 改写** | ✅ 已做 | `handleRewrite` + `/api/rewrite-card` + 浮动面板 UI（只改选中/重写整卡） |
| 3 | **AI prompt 生成 hookText+blocks** | ✅ 已做 | prompt 已包含 hookText 和 blocks 字段指令 |
| 4 | **list/terminal/grid 底部图片区** | ✅ 已做 | 三种布局都已加 `ctx.image` 图片 + `renderBlockSequence` |
| 5 | **格式工具栏** | ✅ 已做 | 加粗/斜体、字号选择、颜色面板、对齐按钮 |
| 6 | **拖拽调整图片位置** | ⏳ 要做 | 目前只有 ↑↓ 按钮，没有拖拽。方案待确认 |

---

## 技术备注

- 类型检查通过：`npx tsc --noEmit` 零错误
- 开发服务器：`npm run dev`，访问 `http://localhost:3000`
- `@/*` 别名指向项目根目录，不是 src/
- `.claude/worktrees/` 下有历史 worktree 残留，不要手动清理
