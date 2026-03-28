# 墨香论坛 (InkFlow Forum) — 开发计划书

> 当前版本: `0.1.0` | Next.js `15.5.14` | 最后更新: 2026-03-28（Phase 1–4 部分完成，Phase 5 规划中）

---

## 一、项目现状（Phase 1 ✅ 已完成）

| 模块 | 状态 | 说明 |
|---|---|---|
| Next.js 15 + TypeScript 脚手架 | ✅ | 古风主题 Tailwind (ink/cinnabar/jade/parchment) |
| Prisma ORM + PostgreSQL Schema | ✅ | User / Post / Reply / Comment / Like / Category / Tag / RBAC |
| NextAuth.js v4 JWT 认证 | ✅ | 邮箱 + 密码，session 携带 role/id |
| API 路由 | ✅ | `/api/auth/*`, `/api/posts`, `/api/replies`, `/api/comments`, `/api/categories` |
| 页面 | ✅ | 首页、论坛列表(`/forum`)、帖子详情(`/post/[id]`)、发帖(`/post/create`)、登录/注册 |
| 组件 | ✅ | Navbar、ReplyItem（盖楼）、CommentItem（多级评论）、ReplyForm、CommentForm |
| 种子数据 | ✅ | `prisma/seed.ts` |
| 安全修复 | ✅ | Next.js 升级至 15.5.14，修复 DoS RSC 反序列化 CVE |
| 项目配置 | ✅ | `.env.example` 模板、`.gitignore` 排除 `.env`、确保 `.env` 未入库 |

---

## 二、Phase 2 — 核心功能补全（✅ 已完成）

### 2.1 分类页面

**目标**: 首页已有 `/categories` 和 `/categories/[slug]` 链接，但页面尚不存在（404）。

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 分类列表页 | `src/app/categories/page.tsx` | ✅ | 展示所有版块及每版块帖子数/最新帖 |
| 分类详情页 | `src/app/categories/[slug]/page.tsx` | ✅ | 按 slug 过滤帖子，支持排序（最新/最热） |

**API**: 复用现有 `GET /api/categories`，分类详情页直接服务端查 Prisma。

---

### 2.2 点赞功能（Like Toggle）

**目标**: ReplyItem 已显示点赞数，但按钮无实际交互。

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 点赞 API | `src/app/api/likes/route.ts` | ✅ | `POST` 切换点赞（幂等）；支持 `postId`/`replyId`/`commentId` 三种目标 |
| 点赞按钮组件 | `src/components/like-button.tsx` | ✅ | 客户端组件，乐观更新，需登录才可点赞 |
| 接入 ReplyItem | `src/components/reply-item.tsx` | ✅ | 替换静态 Heart 按钮 |

---

### 2.3 分页 Pagination

**目标**: `/forum` 和 `/categories/[slug]` 当前最多显示 20 条，无翻页。

| 任务 | 状态 | 说明 |
|---|---|---|
| URL 参数 `?page=N` | ✅ | 服务端读取 `searchParams`，Prisma `skip`/`take` |
| `Pagination` 组件 | ✅ | `src/components/pagination.tsx`，纯链接翻页（SEO 友好） |
| API 分页 | ✅ | `GET /api/posts?page=1&limit=20&categoryId=xxx` |

---

### 2.4 帖子搜索

**目标**: 全局搜索入口，按标题/内容模糊匹配。

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 搜索页面 | `src/app/search/page.tsx` | ✅ | `?q=关键词`，服务端渲染结果列表 |
| 搜索 API | `src/app/api/search/route.ts` | ✅ | Prisma `contains` 过滤，支持标题/摘要 |
| Navbar 搜索框 | `src/components/navbar.tsx` | ✅ | 添加搜索输入 + 跳转逻辑 |

---

### 2.5 帖子编辑 & 删除

**目标**: 作者/管理员可以修改或删除帖子。

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 编辑页面 | `src/app/post/[id]/edit/page.tsx` | ✅ | 预填表单，`PATCH /api/posts/[id]` |
| 删除接口 | `src/app/api/posts/[id]/route.ts` | ✅ | `DELETE` 软删除（`status = DELETED`）；仅作者/管理员 |
| 权限检查中间件 | `src/lib/guard.ts` | ✅ | 提取通用 session 验权逻辑 |

---

## 三、Phase 3 — 用户系统完善（✅ 已完成）

### 3.1 用户主页

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 用户主页 | `src/app/user/[id]/page.tsx` | ✅ | 展示用户发帖列表、回复数、点赞数、加入时间 |
| 个人设置 | `src/app/settings/page.tsx` | ✅ | 修改昵称、简介、头像（URL 输入） |
| 设置 API | `src/app/api/user/me/route.ts` | ✅ | `PATCH` 更新用户信息 |

---

### 3.2 RBAC 权限管理

当前 Schema 已定义 `UserRole: ADMIN / MODERATOR / MEMBER / GUEST`，页面层已全面实现鉴权。

| 任务 | 状态 | 说明 |
|---|---|---|
| 服务端 guard | ✅ | 封装 `requireRole(session, role)` 工具函数 (`src/lib/guard.ts`) |
| 版主功能 | ✅ | 置顶、锁帖、删帖 API 加 MODERATOR 权限校验 |
| 管理员功能 | ✅ | 修改用户角色 API |

---

### 3.3 管理员后台

| 任务 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 后台入口 | `src/app/admin/page.tsx` | ✅ | 仅 ADMIN 可访问 |
| 用户管理 | `src/app/admin/users/page.tsx` | ✅ | 列表、搜索、修改角色、禁用 |
| 帖子管理 | `src/app/admin/posts/page.tsx` | ✅ | 批量置顶/删除/锁定 |
| 分类管理 | `src/app/admin/categories/page.tsx` | ✅ | 增删改排序 |
| 路由保护中间件 | `src/middleware.ts` | ✅ | Next.js Middleware 拦截 `/admin/*`，非 ADMIN 重定向 |

---

## 四、Phase 4 — 体验优化（部分完成）

| 任务 | 状态 | 说明 |
|---|---|---|
| `next/image` 替换 `<img>` | ✅ | 所有组件已使用 `Image from "next/image"`，无裸 `<img>` 标签 |
| README 完善 | ✅ | 506 行，含本地开发、阿里云部署、PM2、Nginx、备份、排障指南 |
| 回复/评论删除 | ✅ | `DELETE /api/replies/[id]`、`DELETE /api/comments/[id]`；UI 已接入 |
| 加载骨架屏（部分路由） | ✅ | `/forum`、`/post/[id]`、`/user/[id]`、`/categories/[slug]`、`/admin` 已有 `loading.tsx` |
| 错误边界（部分路由） | ✅ | `/forum`、`/post/[id]`、`/search`、`/categories`、`/admin` 已有 `error.tsx` |
| 加载骨架屏（缺失路由） | ⏳ | `/settings`、`/categories`、`/post/create`、`/post/[id]/edit`、`/search` |
| 错误边界（缺失路由） | ⏳ | `/settings`、`/categories/[slug]`、`/user/[id]`、`/post/create`、`/post/[id]/edit` |
| 站内通知 | ⏳ | 被回复/被点赞时通知（需新增 Notification 模型 + API + UI） |
| 图片上传 | ⏳ | 头像上传接入第三方存储（如 Cloudflare R2） |
| E2E 测试 | ⏳ | 使用 Playwright 覆盖注册/登录/发帖核心流程 |

---

## 五、Phase 5 — 剩余任务详细计划

### 5.1 骨架屏 & 错误边界补全（P0 — 低工作量，高稳定性收益）

**目标**: 补全所有缺失路由的 `loading.tsx` 和 `error.tsx`，保持与现有文件风格一致。

#### 缺失 loading.tsx

| 文件路径 | 说明 |
|---|---|
| `src/app/settings/loading.tsx` | 个人设置页加载态 |
| `src/app/categories/loading.tsx` | 版块列表页加载态 |
| `src/app/post/create/loading.tsx` | 发帖页加载态 |
| `src/app/post/[id]/edit/loading.tsx` | 编辑帖子页加载态 |
| `src/app/search/loading.tsx` | 搜索结果页加载态 |

#### 缺失 error.tsx

| 文件路径 | 说明 |
|---|---|
| `src/app/settings/error.tsx` | 个人设置页错误边界 |
| `src/app/categories/[slug]/error.tsx` | 版块详情页错误边界 |
| `src/app/user/[id]/error.tsx` | 用户主页错误边界 |
| `src/app/post/create/error.tsx` | 发帖页错误边界 |
| `src/app/post/[id]/edit/error.tsx` | 编辑帖子页错误边界 |

**参考**: 复制 `src/app/forum/loading.tsx` / `src/app/forum/error.tsx` 的实现模式即可。

---

### 5.2 站内通知系统（P1 — 中工作量）

**目标**: 用户被回复或被点赞时收到站内通知，Navbar 显示未读数角标。

#### 数据层

| 任务 | 文件 | 说明 |
|---|---|---|
| Notification 模型 | `prisma/schema.prisma` | 字段: `id / userId / type(REPLY/LIKE) / fromUserId / postId / replyId / isRead / createdAt` |
| 数据库迁移 | `prisma/migrations/` | `npx prisma migrate dev --name add_notification` |
| 触发点 | `src/app/api/replies/route.ts`<br>`src/app/api/likes/route.ts` | 回复/点赞成功后写入 Notification 记录 |

#### API 层

| 路由 | 方法 | 说明 |
|---|---|---|
| `src/app/api/notifications/route.ts` | `GET` | 获取当前用户通知列表（分页，默认 20 条） |
| `src/app/api/notifications/[id]/route.ts` | `PATCH` | 标记单条通知为已读 |
| `src/app/api/notifications/read-all/route.ts` | `POST` | 批量标记全部为已读 |

#### UI 层

| 任务 | 文件 | 说明 |
|---|---|---|
| 通知角标 | `src/components/navbar.tsx` | 轮询或 SWR 获取未读数，显示红点 |
| 通知列表页 | `src/app/notifications/page.tsx` | 分页展示所有通知，点击跳转目标帖子 |
| 通知列表组件 | `src/components/notification-item.tsx` | 单条通知展示（类型图标 + 摘要 + 时间 + 已读状态） |

---

### 5.3 图片上传（P2 — 依赖外部服务）

**目标**: 头像支持文件上传，存储至 Cloudflare R2（或其他兼容 S3 的对象存储）。

| 任务 | 文件 | 说明 |
|---|---|---|
| 上传 API | `src/app/api/upload/route.ts` | 接收 `multipart/form-data`，校验文件类型/大小，上传至 R2，返回公开 URL |
| 环境变量 | `.env.example` | 新增 `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` |
| 设置页改造 | `src/app/settings/page.tsx` | 添加文件选择器，上传后填入头像 URL 输入框 |
| next.config | `next.config.mjs` | 添加 R2 公开域名到 `remotePatterns` |

**依赖**: `@aws-sdk/client-s3`（兼容 R2 S3 API）。

---

### 5.4 E2E 测试（P3 — 持续质量保障）

**目标**: 使用 Playwright 覆盖注册/登录/发帖/回复/点赞/管理员后台等核心流程。

| 任务 | 文件 | 说明 |
|---|---|---|
| 安装配置 | `playwright.config.ts` | baseURL、浏览器矩阵、test 目录设置 |
| 用户流程 | `e2e/auth.spec.ts` | 注册 → 登录 → 退出 |
| 发帖流程 | `e2e/post.spec.ts` | 发帖 → 编辑 → 删除 |
| 互动流程 | `e2e/interaction.spec.ts` | 回复 → 评论 → 点赞 |
| 管理员流程 | `e2e/admin.spec.ts` | 登录 ADMIN → 访问后台 → 修改用户角色 |
| CI 集成 | `.github/workflows/e2e.yml` | PR 触发，使用测试数据库 |

**依赖**: `@playwright/test`。

---

## 六、优先级总览（更新至 Phase 5）

| 优先级 | 功能 | 状态 |
|---|---|---|
| 🔴 P0 | 分类页面（修复首页 404 链接） | ✅ 已完成 |
| 🔴 P0 | 点赞 API + 按钮 | ✅ 已完成 |
| 🟠 P1 | 分页 | ✅ 已完成 |
| 🟠 P1 | 帖子编辑/删除 | ✅ 已完成 |
| 🟠 P1 | 搜索 | ✅ 已完成 |
| 🟡 P2 | 用户主页 + 个人设置 | ✅ 已完成 |
| 🟡 P2 | RBAC 权限守卫完善 | ✅ 已完成 |
| 🟢 P3 | 管理员后台 | ✅ 已完成 |
| 🟢 P3 | `next/image` 替换 / README / 回复评论删除 | ✅ 已完成 |
| 🟢 P3 | 骨架屏 & 错误边界补全 | ⏳ 待实现（小） |
| 🟡 P4 | 站内通知系统 | ⏳ 待实现（中） |
| 🔵 P5 | 图片上传（Cloudflare R2） | ⏳ 待实现（中，需外部服务） |
| ⚪ P6 | E2E 测试（Playwright） | ⏳ 待实现（持续进行） |

---

## 七、文件结构预览（完整，含 Phase 5 新增）

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx               # 管理后台首页
│   │   ├── users/page.tsx         # 用户管理
│   │   ├── posts/page.tsx         # 帖子管理
│   │   └── categories/page.tsx    # 分类管理
│   ├── categories/
│   │   ├── page.tsx               # 分类列表
│   │   ├── loading.tsx            # ⏳ 待补全
│   │   └── [slug]/
│   │       ├── page.tsx           # 分类帖子列表
│   │       └── error.tsx          # ⏳ 待补全
│   ├── notifications/
│   │   └── page.tsx               # ⏳ 站内通知列表页（Phase 5）
│   ├── post/[id]/
│   │   └── edit/
│   │       ├── page.tsx           # 帖子编辑
│   │       ├── loading.tsx        # ⏳ 待补全
│   │       └── error.tsx          # ⏳ 待补全
│   ├── post/create/
│   │   ├── page.tsx               # 发帖页
│   │   ├── loading.tsx            # ⏳ 待补全
│   │   └── error.tsx              # ⏳ 待补全
│   ├── search/
│   │   ├── page.tsx               # 搜索结果
│   │   └── loading.tsx            # ⏳ 待补全
│   ├── settings/
│   │   ├── page.tsx               # 个人设置
│   │   ├── loading.tsx            # ⏳ 待补全
│   │   └── error.tsx              # ⏳ 待补全
│   └── user/
│       └── [id]/
│           ├── page.tsx           # 用户主页
│           └── error.tsx          # ⏳ 待补全
│   └── api/
│       ├── likes/route.ts         # 点赞切换
│       ├── notifications/
│       │   ├── route.ts           # ⏳ GET 通知列表（Phase 5）
│       │   ├── [id]/route.ts      # ⏳ PATCH 标记已读（Phase 5）
│       │   └── read-all/route.ts  # ⏳ POST 全部已读（Phase 5）
│       ├── posts/[id]/route.ts    # 帖子 PATCH/DELETE
│       ├── search/route.ts        # 全局搜索
│       ├── upload/route.ts        # ⏳ 文件上传（Phase 5）
│       └── user/me/route.ts       # 个人资料更新
├── components/
│   ├── like-button.tsx            # 点赞按钮（乐观更新）
│   ├── notification-item.tsx      # ⏳ 通知条目组件（Phase 5）
│   └── pagination.tsx             # 翻页组件
├── lib/
│   └── guard.ts                   # 权限检查工具
└── middleware.ts                  # 路由级 RBAC 中间件
e2e/                               # ⏳ Playwright E2E 测试（Phase 5）
├── auth.spec.ts
├── post.spec.ts
├── interaction.spec.ts
└── admin.spec.ts
```
