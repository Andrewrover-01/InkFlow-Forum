# 墨香论坛 (InkFlow Forum) — 开发计划书

> 当前版本: `0.1.0` | Next.js `15.5.14` | 最后更新: 2026-03-28

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

---

## 二、Phase 2 — 核心功能补全（高优先级）

### 2.1 分类页面

**目标**: 首页已有 `/categories` 和 `/categories/[slug]` 链接，但页面尚不存在（404）。

| 任务 | 文件 | 说明 |
|---|---|---|
| 分类列表页 | `src/app/categories/page.tsx` | 展示所有版块及每版块帖子数/最新帖 |
| 分类详情页 | `src/app/categories/[slug]/page.tsx` | 按 slug 过滤帖子，支持排序（最新/最热） |

**API**: 复用现有 `GET /api/categories`，分类详情页直接服务端查 Prisma。

---

### 2.2 点赞功能（Like Toggle）

**目标**: ReplyItem 已显示点赞数，但按钮无实际交互。

| 任务 | 文件 | 说明 |
|---|---|---|
| 点赞 API | `src/app/api/likes/route.ts` | `POST` 切换点赞（幂等）；支持 `postId`/`replyId`/`commentId` 三种目标 |
| 点赞按钮组件 | `src/components/like-button.tsx` | 客户端组件，乐观更新，需登录才可点赞 |
| 接入 ReplyItem | `src/components/reply-item.tsx` | 替换静态 Heart 按钮 |

---

### 2.3 分页 Pagination

**目标**: `/forum` 和 `/categories/[slug]` 当前最多显示 20 条，无翻页。

| 任务 | 说明 |
|---|---|
| URL 参数 `?page=N` | 服务端读取 `searchParams`，Prisma `skip`/`take` |
| `Pagination` 组件 | `src/components/pagination.tsx`，纯链接翻页（SEO 友好） |
| API 分页 | `GET /api/posts?page=1&limit=20&categoryId=xxx` |

---

### 2.4 帖子搜索

**目标**: 全局搜索入口，按标题/内容模糊匹配。

| 任务 | 文件 | 说明 |
|---|---|---|
| 搜索页面 | `src/app/search/page.tsx` | `?q=关键词`，服务端渲染结果列表 |
| 搜索 API | `src/app/api/search/route.ts` | Prisma `contains` 过滤，支持标题/摘要 |
| Navbar 搜索框 | `src/components/navbar.tsx` | 添加搜索输入 + 跳转逻辑 |

---

### 2.5 帖子编辑 & 删除

**目标**: 作者/管理员可以修改或删除帖子。

| 任务 | 文件 | 说明 |
|---|---|---|
| 编辑页面 | `src/app/post/[id]/edit/page.tsx` | 预填表单，`PATCH /api/posts/[id]` |
| 删除接口 | `src/app/api/posts/[id]/route.ts` | `DELETE` 软删除（`status = DELETED`）；仅作者/管理员 |
| 权限检查中间件 | `src/lib/guard.ts` | 提取通用 session 验权逻辑 |

---

## 三、Phase 3 — 用户系统完善（中优先级）

### 3.1 用户主页

| 任务 | 文件 | 说明 |
|---|---|---|
| 用户主页 | `src/app/user/[id]/page.tsx` | 展示用户发帖列表、回复数、点赞数、加入时间 |
| 个人设置 | `src/app/settings/page.tsx` | 修改昵称、简介、头像（URL 输入） |
| 设置 API | `src/app/api/user/me/route.ts` | `PATCH` 更新用户信息 |

---

### 3.2 RBAC 权限管理

当前 Schema 已定义 `UserRole: ADMIN / MODERATOR / MEMBER / GUEST`，但页面层未实现鉴权。

| 任务 | 说明 |
|---|---|
| 服务端 guard | 封装 `requireRole(session, role)` 工具函数 |
| 版主功能 | 置顶、锁帖、删帖 API 加 MODERATOR 权限校验 |
| 管理员功能 | 修改用户角色 API |

---

### 3.3 管理员后台

| 任务 | 文件 | 说明 |
|---|---|---|
| 后台入口 | `src/app/admin/page.tsx` | 仅 ADMIN 可访问 |
| 用户管理 | `src/app/admin/users/page.tsx` | 列表、搜索、修改角色、禁用 |
| 帖子管理 | `src/app/admin/posts/page.tsx` | 批量置顶/删除/锁定 |
| 分类管理 | `src/app/admin/categories/page.tsx` | 增删改排序 |
| 路由保护中间件 | `src/middleware.ts` | Next.js Middleware 拦截 `/admin/*`，非 ADMIN 重定向 |

---

## 四、Phase 4 — 体验优化（低优先级）

| 任务 | 说明 |
|---|---|
| `next/image` 替换 `<img>` | 解决现有 `no-img-element` 警告，优化 LCP |
| README 完善 | 环境搭建、数据库初始化、开发/生产部署教程 |
| 加载骨架屏 | 论坛列表、帖子详情添加 `loading.tsx` |
| 错误边界 | 各主要路由添加 `error.tsx` |
| 回复/评论删除 | 作者可删除自己的回复和评论 |
| 站内通知 | 被回复/被点赞时通知（Notification 模型 + API） |
| 图片上传 | 头像上传接入第三方存储（如 Cloudflare R2） |
| E2E 测试 | 使用 Playwright 覆盖注册/登录/发帖核心流程 |

---

## 五、文件结构预览（Phase 2–3 新增）

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
│   │   └── [slug]/page.tsx        # 分类帖子列表
│   ├── post/[id]/
│   │   └── edit/page.tsx          # 帖子编辑
│   ├── search/
│   │   └── page.tsx               # 搜索结果
│   ├── settings/
│   │   └── page.tsx               # 个人设置
│   └── user/
│       └── [id]/page.tsx          # 用户主页
│   └── api/
│       ├── likes/route.ts         # 点赞切换
│       ├── posts/[id]/route.ts    # 帖子 PATCH/DELETE
│       ├── search/route.ts        # 全局搜索
│       └── user/me/route.ts       # 个人资料更新
├── components/
│   ├── like-button.tsx            # 点赞按钮（乐观更新）
│   └── pagination.tsx             # 翻页组件
├── lib/
│   └── guard.ts                   # 权限检查工具
└── middleware.ts                  # 路由级 RBAC 中间件
```

---

## 六、优先级总览

| 优先级 | 功能 | 预估工作量 |
|---|---|---|
| 🔴 P0 | 分类页面（修复首页 404 链接） | 小 |
| 🔴 P0 | 点赞 API + 按钮 | 小 |
| 🟠 P1 | 分页 | 小 |
| 🟠 P1 | 帖子编辑/删除 | 中 |
| 🟠 P1 | 搜索 | 中 |
| 🟡 P2 | 用户主页 + 个人设置 | 中 |
| 🟡 P2 | RBAC 权限守卫完善 | 中 |
| 🟢 P3 | 管理员后台 | 大 |
| 🟢 P3 | 通知系统 | 大 |
| ⚪ P4 | 体验优化 / E2E 测试 | 持续进行 |
