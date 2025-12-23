# CLAUDE.md - NoteDraw 项目完整文档

> 此文档为 Claude Code 提供项目上下文，减少重复分析，节省 token。

## 项目概述

**NoteDraw** 是一个基于 AI 的视觉笔记生成器，将文本内容转换为精美的手绘风格视觉笔记图片。

- **产品定位**: AI 视觉笔记 SaaS 产品
- **核心功能**: 文本 → AI 分析 → 结构化知识点 → 视觉笔记图片
- **模板来源**: 基于 MkSaaS 模板开发

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Next.js 15 (App Router) |
| **语言** | TypeScript 5.8 |
| **数据库** | PostgreSQL + Drizzle ORM |
| **认证** | Better Auth (支持 Google/GitHub OAuth) |
| **支付** | Stripe / Creem |
| **UI** | Radix UI + TailwindCSS 4 |
| **状态** | Zustand (客户端) |
| **国际化** | next-intl (en/zh) |
| **AI** | GLM-4-Flash (文本分析) + Gemini/GPT-4o (图像生成) |
| **包管理** | pnpm |

---

## 目录结构

```
mksaas-template-main/
├── src/
│   ├── actions/           # Server Actions (API 操作)
│   │   ├── notedraw.ts    # 核心：项目创建、笔记生成、重新生成
│   │   ├── consume-credits.ts
│   │   ├── gallery.ts
│   │   ├── plaza.ts       # 广场功能
│   │   └── redemption.ts  # 兑换码
│   │
│   ├── ai/notedraw/       # AI 核心模块（三角色架构）
│   │   ├── index.ts       # 主生成流程 generate()
│   │   ├── organizer.ts   # 拆解Agent - GLM分析文本
│   │   ├── designer.ts    # Prompt构建Agent
│   │   ├── painter.ts     # 绘图Agent - 调用图像API
│   │   ├── prompts.ts     # Prompt 模板
│   │   ├── styles.ts      # 视觉风格配置
│   │   └── types.ts       # 类型定义
│   │
│   ├── app/
│   │   ├── [locale]/      # 国际化路由
│   │   │   ├── (marketing)/  # 营销页面
│   │   │   ├── (protected)/  # 需登录的页面
│   │   │   │   ├── notedraw/     # 主应用
│   │   │   │   ├── admin/        # 管理后台
│   │   │   │   └── settings/     # 用户设置
│   │   │   └── auth/         # 认证页面
│   │   └── api/           # API 路由
│   │       ├── auth/      # Better Auth 端点
│   │       └── webhooks/  # Stripe/Creem webhooks
│   │
│   ├── components/
│   │   ├── notedraw/      # 主应用组件
│   │   │   ├── NoteDrawApp.tsx    # 主组件
│   │   │   ├── ContentArea.tsx    # 输入区域
│   │   │   ├── StyleSelector.tsx  # 风格选择
│   │   │   ├── ResultGallery.tsx  # 结果展示
│   │   │   └── Workbench.tsx      # 进度显示
│   │   ├── admin/         # 管理后台组件
│   │   └── ui/            # shadcn/ui 组件
│   │
│   ├── config/
│   │   ├── website.tsx    # 全局配置（支付、邮件、功能开关）
│   │   └── notedraw.ts    # NoteDraw 配置（限制、积分消耗）
│   │
│   ├── db/
│   │   ├── schema.ts      # 数据库表定义
│   │   ├── index.ts       # 数据库连接
│   │   └── migrations/    # 迁移文件
│   │
│   ├── lib/
│   │   ├── auth.ts        # Better Auth 配置
│   │   ├── safe-action.ts # next-safe-action 配置
│   │   └── utils.ts       # 工具函数
│   │
│   ├── credits/           # 积分系统
│   ├── payment/           # 支付集成
│   └── mail/              # 邮件模板
│
├── messages/              # 国际化翻译文件
│   ├── en.json
│   └── zh.json
│
└── content/               # MDX 内容（博客、文档）
```

---

## 核心业务流程

### 视觉笔记生成流程

```
用户输入文本
    ↓
1. createProjectAction() - 创建项目，保存到 noteProject 表
    ↓
2. generateNotesAction() - 调用 AI 生成
    ↓
3. organize() [organizer.ts]
   - 调用 GLM-4-Flash API 分析文本
   - 提取知识点，决定卡片数量
   - 返回 LeftBrainData[] 结构化数据
    ↓
4. designPrompt() [designer.ts]
   - 将结构化数据转换为图像 Prompt
   - 根据风格(sketch/business/cute/minimal/chalkboard)定制
    ↓
5. paint() [painter.ts]
   - 创建图像生成任务 (POST /images/generations)
   - 轮询任务状态 (GET /tasks/{task_id})
   - 返回图片 URL
    ↓
6. 保存卡片到 noteCard 表，扣除积分
```

---

## 数据库 Schema

### 核心表

```sql
-- 用户表 (Better Auth 管理)
user: id, name, email, emailVerified, role, banned, customerId

-- 会话表
session: id, token, userId, expiresAt

-- 支付记录
payment: id, userId, priceId, type, scene, status, paid, provider

-- 积分余额
userCredit: id, userId, currentCredits

-- 积分交易记录
creditTransaction: id, userId, type, amount, description

-- 笔记项目
noteProject: id, userId, inputText, language, visualStyle, generateMode,
             status (draft/processing/completed/failed), signature,
             isPublic, isFeatured, slug, tags, likes, views

-- 笔记卡片
noteCard: id, projectId, order, originalText, structure(JSON),
          prompt, imageUrl, status

-- 兑换码
redemptionCode: id, code, type, value, maxUses, usedCount, isActive
```

### 重要索引

所有外键字段和常用查询字段都有索引，参见 `src/db/schema.ts`

---

## API 端点

### Server Actions (`src/actions/notedraw.ts`)

| Action | 功能 | 积分消耗 |
|--------|------|----------|
| `createProjectAction` | 创建项目 | 无 |
| `generateNotesAction` | 生成笔记 | 分析1 + 图片×5 |
| `regenerateCardAction` | 重新生成单卡 | 图片5 |
| `regenerateWithPromptAction` | 自定义Prompt生成 | 图片5 |
| `getProjectAction` | 获取项目详情 | 无 |
| `getUserProjectsAction` | 获取用户所有项目 | 无 |
| `deleteProjectAction` | 删除项目 | 无 |
| `fetchUrlContentAction` | 从URL获取内容 | 无 |

### REST API (`src/app/api/`)

- `POST /api/auth/[...all]` - Better Auth 端点
- `POST /api/webhooks/stripe` - Stripe 回调
- `POST /api/webhooks/creem` - Creem 回调
- `POST /api/generate-images` - 图像生成（备用）

---

## 配置说明

### 环境变量 (`.env`)

```bash
# 数据库
DATABASE_URL=postgresql://...

# AI API
GLM_API_KEY=           # 智谱 GLM-4-Flash (文本分析)
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GEMINI_IMAGE_API_KEY=  # Gemini 图像生成
OPENAI_API_KEY=        # 或用 apimart.ai 代理

# 认证
BETTER_AUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 支付
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### NoteDraw 配置 (`src/config/notedraw.ts`)

```typescript
TEXT_LIMITS = {
  MAX_INPUT_LENGTH: 10000,    // 最大输入字符数
  MIN_INPUT_LENGTH: 10,       // 最小输入字符数
}

CREDIT_COSTS = {
  ANALYSIS: 1,                // 分析消耗积分
  IMAGE_GENERATION: 5,        // 每张图片消耗积分
}
```

---

## 性能问题分析

### 1. 启动慢原因

| 问题 | 影响 | 建议 |
|------|------|------|
| node_modules 1.5GB | 首次启动慢 | 清理未使用依赖 |
| 141个生产依赖 | 编译/打包慢 | 使用 `knip` 分析 |
| 多层 Provider 嵌套 | 首屏渲染慢 | 延迟加载非必要 Provider |
| Better Auth 初始化 | 阻塞数据库连接 | 已使用懒加载 |

### 2. 响应慢原因

| 问题 | 位置 | 详情 |
|------|------|------|
| **AI API 延迟** | `organizer.ts` | GLM 分析需 2-5s |
| **图片生成等待** | `painter.ts` | 轮询最多 2分钟 (2s×60次) |
| **N+1 查询** | `getUserProjectsAction` | 每个项目单独查 cards |
| **串行生成** | `generate()` | 多卡片按序生成 |

### 3. 优化建议

```typescript
// 1. 批量查询替代 N+1
// 当前:
for (project of projects) {
  const cards = await db.select().from(noteCard).where(eq(projectId, project.id));
}
// 优化:
const allCards = await db.select().from(noteCard).where(inArray(projectId, projectIds));

// 2. 并行生成多卡片
// 当前: 串行
for (unit of units) { await paint(unit); }
// 优化: 并行（注意 API 限流）
await Promise.all(units.map(unit => paint(unit)));

// 3. 使用 React Query 缓存
// 前端已配置 QueryProvider，但未充分利用

// 4. 添加加载状态缓存
// 使用 nuqs 管理 URL 状态，减少重复请求
```

---

## 开发命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 数据库
pnpm db:push          # 推送 schema 到数据库
pnpm db:generate      # 生成迁移文件
pnpm db:migrate       # 执行迁移
pnpm db:studio        # 打开 Drizzle Studio

# 代码质量
pnpm lint             # Biome 检查
pnpm format           # 格式化代码
pnpm knip             # 检查未使用依赖

# 构建
pnpm build            # 生产构建
pnpm start            # 启动生产服务器

# 脚本
pnpm list-users       # 列出用户
pnpm fix-payments     # 修复支付记录
```

---

## 视觉风格

| 风格 | 英文 | 描述 |
|------|------|------|
| 手绘 | sketch | 手绘草图风格，可见笔触 |
| 商务 | business | 专业商务风格，精确对齐 |
| 可爱 | cute | 卡通可爱风格，适合教育 |
| 极简 | minimal | 极简主义，大量留白 |
| 黑板 | chalkboard | 教室黑板风格，粉笔质感 |

---

## 重要文件快速定位

| 功能 | 文件 |
|------|------|
| 主应用组件 | `src/components/notedraw/NoteDrawApp.tsx` |
| AI 生成入口 | `src/ai/notedraw/index.ts` → `generate()` |
| 文本分析 | `src/ai/notedraw/organizer.ts` |
| 图像生成 | `src/ai/notedraw/painter.ts` |
| 数据库操作 | `src/actions/notedraw.ts` |
| 数据库 Schema | `src/db/schema.ts` |
| 全局配置 | `src/config/website.tsx` |
| NoteDraw 配置 | `src/config/notedraw.ts` |
| 认证配置 | `src/lib/auth.ts` |
| 路由中间件 | `src/middleware.ts` |
| 国际化翻译 | `messages/zh.json`, `messages/en.json` |

---

## 常见问题

### Q: 为什么图片生成很慢？
A: 图像 API 使用异步任务模式，需要轮询等待。当前配置为每 2 秒轮询一次，最多 60 次。

### Q: 如何切换图像生成供应商？
A: 修改 `NoteDrawApp.tsx` 中的 `DEFAULT_AI_CONFIG.apiProvider`，支持: `gemini`, `apimart`, `openai`, `fal`, `replicate`, `custom`

### Q: 如何添加新的视觉风格？
A:
1. 在 `src/ai/notedraw/styles.ts` 添加风格配置
2. 在 `src/ai/notedraw/prompts.ts` 添加 Prompt 模板
3. 在 `StyleSelector.tsx` 添加 UI 选项

### Q: 积分不够时会怎样？
A: `hasEnoughCredits()` 检查失败，返回 `Insufficient credits` 错误。

---

## 更新日志

- **2024-12**: 初始化项目，基于 MkSaaS 模板
- **2024-12-11**: 添加 NoteDraw 核心功能
- **2024-12-19**: 性能审查，创建完整文档
- **2024-12-19**: 性能优化
  - 修复 N+1 查询问题 (`getUserProjectsAction`)
  - 图片生成改为并行（并发数限制为2）
  - 轮询策略优化为指数退避（1s→5s）
  - 清理 14 个未使用依赖，减少 37 个包
