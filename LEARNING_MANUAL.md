# 📖 InkFlow Forum 学习手册

> 本手册由架构分析自动生成，覆盖项目所用的全部编程语言、知识点及核心设计思想。
> 适用于希望系统性学习本项目技术栈的开发者。

---

## 目录

- [一、语言清单](#一语言清单)
- [二、各语言知识点拆解](#二各语言知识点拆解)
  - [2.1 TypeScript](#21-typescript)
  - [2.2 SQL（PostgreSQL / Prisma Schema）](#22-sqlpostgresql--prisma-schema)
  - [2.3 CSS（Tailwind CSS / 全局样式）](#23-csstailwind-css--全局样式)
  - [2.4 HTML（JSX / TSX 模板层）](#24-htmljsx--tsx-模板层)
- [三、核心思想与设计模式](#三核心思想与设计模式)
  - [3.1 架构思想](#31-架构思想)
  - [3.2 设计模式](#32-设计模式)
  - [3.3 安全与权限模型](#33-安全与权限模型)
  - [3.4 数据层设计](#34-数据层设计)
  - [3.5 前端交互思想](#35-前端交互思想)

---

## 一、语言清单

| # | 语言 / 技术 | 主要用途 | 代表文件 |
|---|------------|---------|---------|
| 1 | **TypeScript** | 全栈开发核心语言（服务端 + 客户端） | `src/**/*.ts`, `src/**/*.tsx` |
| 2 | **SQL（PostgreSQL）** | 关系型数据库，通过 Prisma Schema 定义并迁移 | `prisma/schema.prisma`, `prisma/migrations/` |
| 3 | **CSS（Tailwind + 自定义层）** | UI 样式系统，响应式设计，主题定制 | `src/app/globals.css`, `tailwind.config.ts` |
| 4 | **HTML（JSX/TSX）** | React 组件模板，语义化 HTML 结构 | `src/components/*.tsx`, `src/app/**/page.tsx` |

---

## 二、各语言知识点拆解

### 2.1 TypeScript

```
TypeScript
├── 类型系统基础
│   ├── 原始类型注解（string、number、boolean、null、undefined）
│   ├── 接口（interface）定义组件 Props 和 API 响应结构
│   │   └── 示例：LikeButtonProps、Category、Post 等接口
│   ├── 类型别名（type alias）
│   ├── 联合类型（Union Types）
│   │   └── 示例："post" | "reply" | "comment"（LikeButton targetType）
│   ├── 可选属性（Optional Properties，?）
│   │   └── 示例：initialLiked?: boolean、parentId?: string
│   ├── 非空断言与可选链（?.、??）
│   │   └── 示例：session?.user?.id、token.id ?? "MEMBER"
│   ├── 类型断言（as）
│   │   └── 示例：(user as { role?: UserRole }).role
│   └── 泛型（Generics）
│       └── 示例：useState<Category[]>([])、Record<string, string>
│
├── 函数与异步
│   ├── async / await 异步函数
│   │   └── 全部 API Route Handler 均为 async function
│   ├── 箭头函数
│   ├── 函数重载与多参数（rest 参数 ...roles: UserRole[]）
│   │   └── 示例：requireRole(session, ...roles)（src/lib/guard.ts）
│   └── try / catch / finally 错误处理
│       └── 示例：like toggle API、上传 API 的三段式错误处理
│
├── 面向对象
│   ├── 类（class）与继承（extends）
│   │   └── 示例：UnauthorizedError extends Error、ForbiddenError extends Error
│   ├── 类属性初始化（status = 401）
│   └── 构造函数（constructor）
│
├── 模块系统
│   ├── ES Module（import / export）
│   ├── 路径别名（@/ → src/）由 tsconfig.json 配置
│   └── 动态导入（Next.js 懒加载）
│
├── 类型工具与高级类型
│   ├── Partial<T>、Record<K, V>、Set<T>
│   │   └── 示例：ALLOWED_MIME = new Set([...])、EXT_MAP: Record<string, string>
│   ├── 类型收窄（Type Narrowing）
│   │   └── 示例：if (error instanceof z.ZodError)
│   └── 枚举（enum，通过 Prisma 生成 UserRole、PostStatus、NotificationType）
│
├── 框架层 TypeScript（Next.js）
│   ├── NextRequest / NextResponse 类型
│   ├── Metadata 类型（export const metadata: Metadata）
│   ├── NextAuthOptions、Session、JWT Token 类型扩展
│   │   └── 示例：session.user.role、token.id 的类型增强
│   └── React.ReactNode、React.FormEvent<HTMLFormElement> 等 React 类型
│
└── 工具库 TypeScript 集成
    ├── Zod Schema 类型推断（z.infer<typeof schema>）
    │   └── 示例：createPostSchema、likeSchema
    ├── Prisma Client 类型自动生成
    │   └── 所有数据库查询结果均带完整类型推断
    └── React Hook Form 类型集成（@hookform/resolvers/zod）
```

---

### 2.2 SQL（PostgreSQL / Prisma Schema）

```
SQL / Prisma
├── 数据定义（DDL）
│   ├── 枚举类型（ENUM）
│   │   └── UserRole、PostStatus、NotificationType
│   ├── 表创建与字段类型
│   │   ├── cuid() 主键（分布式安全 ID）
│   │   ├── TEXT 大文本字段（@db.Text）
│   │   ├── BOOLEAN 默认值（false）
│   │   └── TIMESTAMP（createdAt @default(now())、updatedAt @updatedAt）
│   └── 唯一约束（@unique、@@unique）
│       └── 示例：Category.slug、Like 防重复点赞复合唯一索引
│
├── 关系建模
│   ├── 一对多（One-to-Many）
│   │   └── User → Post、Post → Reply、Reply → Comment
│   ├── 多对多（Many-to-Many，显式中间表）
│   │   └── Post ↔ Tag（通过 PostTag 中间表）
│   ├── 自引用关系（Self-referential）
│   │   └── Comment → parent Comment（嵌套评论）
│   ├── 多态关联（Polymorphic Association）
│   │   └── Like 可关联 Post / Reply / Comment（可空外键）
│   ├── 命名关系（Named Relations）
│   │   └── Notification 的 "notifications" 和 "sentNotifications" 双向关系
│   └── 级联删除（onDelete: Cascade / SetNull）
│       └── 删除 Post 时自动级联删除 Reply / Like / Notification
│
├── 查询优化
│   ├── 复合索引（@@index）
│   │   └── Post 的 authorId、categoryId、createdAt 索引
│   │   └── Notification 的 (userId, isRead)、(userId, createdAt DESC) 索引
│   ├── 排序索引（createdAt(sort: Desc)）
│   └── 选择性查询（select 精确字段，避免 SELECT *）
│       └── 示例：author: { select: { id: true, name: true } }
│
├── 高级 Prisma 操作
│   ├── 并发查询（Promise.all 批量执行）
│   │   └── 示例：[posts, total] = await Promise.all([...])
│   ├── Upsert（upsertOrCreate）
│   │   └── 示例：prisma.tag.upsert() 标签幂等创建
│   ├── 聚合计数（_count: { select: { replies: true } }）
│   ├── 分页（skip / take）
│   ├── 嵌套 create（Nested Write）
│   │   └── 示例：tags: { create: [...] } 创建帖子时同步创建标签关联
│   └── 软删除模式（status: "DELETED"，而非物理删除）
│
└── 数据库迁移
    ├── migrate diff 生成迁移 SQL
    ├── migrate deploy 生产部署
    └── db seed 初始数据填充（prisma/seed.ts）
```

---

### 2.3 CSS（Tailwind CSS / 全局样式）

```
CSS / Tailwind
├── Tailwind CSS 核心
│   ├── 原子化 CSS（Utility-First）
│   │   └── 示例：flex items-center gap-2 text-sm font-sans
│   ├── 响应式前缀（sm: md: lg:）
│   │   └── 示例：hidden md:flex、hidden lg:block（Navbar、Sidebar）
│   ├── 状态变体（hover: focus: disabled: active:）
│   │   └── 示例：hover:text-cinnabar-600、focus:ring-1
│   ├── 伪类变体（group-hover:）
│   │   └── 示例：group-hover:text-cinnabar-700（Logo 链接悬停）
│   └── 任意值语法（text-[10px]）
│       └── 示例：通知角标字号 text-[10px]
│
├── 主题定制（tailwind.config.ts）
│   ├── 自定义调色盘（古风色系）
│   │   ├── ink（墨色，深褐灰，正文文字）
│   │   ├── cinnabar（朱砂红，主操作色 / CTA）
│   │   ├── jade（翠绿，辅助色）
│   │   └── parchment（宣纸黄，背景色 / 卡片色）
│   └── 自定义字体族
│       ├── serif → Noto Serif SC（衬线体，标题 / 正文）
│       └── sans → Noto Sans SC（无衬线体，UI 文字）
│
├── CSS 分层（@layer）
│   ├── @layer base — 全局重置，根变量，body 背景渐变
│   ├── @layer components — 可复用组件类
│   │   ├── .btn-primary / .btn-secondary（按钮）
│   │   ├── .card（卡片容器）
│   │   ├── .forum-input（表单输入框）
│   │   ├── .post-card（帖子列表卡片）
│   │   └── .ink-divider（分隔线）
│   └── @layer utilities — 扩展工具类（text-balance）
│
├── CSS 变量（Custom Properties）
│   └── :root 定义 --background、--foreground、--border、--ring
│
├── Google Fonts 集成
│   └── @import url(...) 引入 Noto Serif SC / Noto Sans SC
│
└── Webkit 滚动条美化
    └── ::-webkit-scrollbar 系列选择器，统一古风滚动条样式
```

---

### 2.4 HTML（JSX / TSX 模板层）

```
HTML / JSX
├── 语义化 HTML 标签
│   ├── <header>、<nav>、<main>、<footer>（页面骨架）
│   ├── <article>（帖子/回复内容区）
│   ├── <form>（发帖、登录、注册、设置表单）
│   └── <button> 与 <a>（交互元素，使用 Link 组件封装）
│
├── 表单元素
│   ├── <input>（text、email、password、file）
│   ├── <textarea>（帖子正文，rows 属性控制高度）
│   ├── <select> / <option>（版块选择）
│   └── 原生表单验证属性（required、minLength、maxLength）
│
├── 无障碍（Accessibility）
│   ├── aria-label（图标按钮语义说明，如通知铃铛、点赞按钮）
│   ├── data-testid（Playwright E2E 测试选择器）
│   │   └── 示例：data-testid="like-button"
│   └── alt 文本（next/image 的 alt 属性）
│
├── Next.js 特殊组件
│   ├── <Image>（自动优化图片，width / height / objectFit）
│   ├── <Link>（客户端路由导航，prefetch 优化）
│   └── <SessionProvider>（Context 注入，包裹全局布局）
│
└── JSX 表达式
    ├── 条件渲染（三元表达式、&&短路）
    │   └── 示例：{session ? <LoggedInMenu /> : <GuestMenu />}
    ├── 列表渲染（Array.map + key 属性）
    │   └── 示例：{posts.map((post) => <PostCard key={post.id} ... />)}
    └── 动态 className（模板字符串 / cn() 工具函数）
        └── 示例：cn("base-class", condition && "conditional-class")
```

---

## 三、核心思想与设计模式

### 3.1 架构思想

```
架构思想
├── Next.js App Router 全栈架构
│   ├── 服务端组件（Server Components）
│   │   ├── 直接在组件内调用 prisma.*（零 API 往返）
│   │   ├── export const dynamic = "force-dynamic" 禁用静态缓存
│   │   └── 适用场景：Admin 仪表盘、帖子详情页、用户主页
│   ├── 客户端组件（Client Components，"use client"）
│   │   ├── 交互逻辑：useState / useEffect / useRouter
│   │   └── 适用场景：Navbar、LikeButton、发帖页、设置页
│   └── 混合渲染策略
│       ├── 静态生成（SSG）→ 首页 / 分类页
│       └── 服务端渲染（SSR）→ 帖子详情、管理后台
│
├── API 路由（Route Handlers）RESTful 设计
│   ├── 资源化 URL：/api/posts、/api/posts/[id]、/api/likes
│   ├── HTTP 语义方法：GET（读）/ POST（创建）/ PATCH（更新）/ DELETE（删除）
│   └── 统一响应格式：{ data } / { error, status }
│
├── 分层架构（Layered Architecture）
│   ├── 表现层（Presentation）：src/app/**/page.tsx、src/components/
│   ├── 业务逻辑层（Business Logic）：src/app/api/**/route.ts
│   ├── 数据访问层（Data Access）：src/lib/prisma.ts（单例 Prisma Client）
│   └── 横切关注点（Cross-cutting Concerns）
│       ├── 认证：src/lib/auth.ts（NextAuth 配置）
│       ├── 鉴权：src/lib/guard.ts（requireRole）
│       └── 中间件：src/middleware.ts（路由级保护）
│
└── 单例模式（Singleton）
    └── src/lib/prisma.ts — 全局复用同一个 PrismaClient 实例，
        防止开发环境热重载时连接数耗尽
```

---

### 3.2 设计模式

```
设计模式
├── 适配器模式（Adapter Pattern）
│   └── PrismaAdapter：将 Prisma ORM 适配为 NextAuth.js 所需的
│       数据库适配器接口，解耦认证框架与 ORM 实现
│
├── 守卫模式（Guard Pattern）
│   └── src/lib/guard.ts — requireRole()
│       ├── 统一鉴权逻辑，单点维护
│       ├── 返回已验证 Session（类型安全）
│       └── 抛出语义化错误（UnauthorizedError / ForbiddenError）
│
├── 中间件模式（Middleware Pattern）
│   └── src/middleware.ts — Next.js Edge Middleware
│       ├── 请求拦截（路由级 RBAC）
│       ├── JWT Token 校验（getToken）
│       └── 重定向保护（非 ADMIN 访问 /admin/* 自动跳转）
│
├── 乐观更新模式（Optimistic UI Pattern）
│   └── LikeButton 组件
│       ├── 点击即时更新本地 state（setLiked / setCount）
│       ├── 异步发送 API 请求
│       └── 请求失败时回滚（revert state）
│       → 目的：消除网络延迟感，提升用户体验
│
├── 多态关联模式（Polymorphic Association）
│   └── Like 模型
│       ├── 同一张表通过可空外键关联三种目标（Post / Reply / Comment）
│       └── 单一 API（/api/likes）处理所有点赞场景
│
├── 观察者模式（Observer Pattern）
│   └── 通知系统（Notification）
│       ├── 触发：点赞 / 回复时在 likes/replies API 内生成通知
│       ├── 消费：/api/notifications 分页查询
│       └── 轮询推送：Navbar useEffect + setInterval(60s) 定期拉取未读数
│
├── 策略模式（Strategy Pattern）
│   └── 帖子排序策略
│       ├── 默认：isPinned DESC + createdAt DESC（置顶优先）
│       ├── 热门：按回复数 / 点赞数排序
│       └── 最新：纯时间倒序
│
├── 工厂函数模式（Factory Function）
│   └── getR2Client()（src/app/api/upload/route.ts）
│       └── 懒初始化 S3Client，按需创建，集中管理 R2 凭证
│
└── 装饰器组件模式（HOC / Provider Pattern）
    └── <Providers> 组件（src/components/providers.tsx）
        └── 包裹 <SessionProvider>，为全局注入 Session Context，
            保持 layout.tsx 的服务端组件属性
```

---

### 3.3 安全与权限模型

```
安全与权限模型
├── 认证（Authentication）
│   ├── JWT Session 策略（strategy: "jwt"）
│   │   └── 无状态、可水平扩展
│   ├── 密码哈希（bcryptjs）
│   │   └── bcrypt.hash() 注册 + bcrypt.compare() 登录
│   └── Credentials Provider
│       └── 自定义邮箱 + 密码校验逻辑
│
├── 授权（Authorization）——四级角色（RBAC）
│   ├── GUEST：仅可浏览
│   ├── MEMBER：发帖、回复、点赞、修改个人资料
│   ├── MODERATOR：置顶 / 锁定帖子（isPinned / isLocked PATCH）
│   └── ADMIN：全部管理权限（用户角色修改、版块 CRUD、帖子删除）
│
├── 双层鉴权保护
│   ├── Edge 层：src/middleware.ts（路由前置拦截）
│   └── API 层：requireRole() 或 getServerSession() 二次校验
│       → 防止绕过前端路由直接调用 API
│
├── 输入校验（Input Validation）
│   └── Zod Schema 校验所有 API 入参
│       ├── createPostSchema（标题长度、内容长度）
│       ├── likeSchema（必须指定点赞目标）
│       └── registerSchema（邮箱格式、密码规则）
│
└── 文件上传安全
    ├── MIME 类型白名单（ALLOWED_MIME Set）
    ├── 文件大小限制（2 MB）
    └── 随机 UUID 文件名（防止路径遍历 / 文件覆盖）
```

---

### 3.4 数据层设计

```
数据层设计
├── ORM 优先（Prisma）
│   ├── Schema-First 开发流程
│   │   └── 先定义 schema.prisma → 生成迁移 SQL → 生成 TypeScript 类型
│   ├── 类型安全查询（编译时捕获字段拼写错误）
│   └── 关系查询（include / select 精细控制 JOIN）
│
├── 软删除（Soft Delete）
│   └── Post 使用 status: "DELETED" 标记删除，保留历史数据
│
├── 分页设计
│   ├── Offset 分页（skip / take）
│   └── 统一分页响应结构：{ data, total, page, pageSize }
│
├── 并发优化
│   └── Promise.all 批量并行查询
│       └── 示例：同时查询 [posts, total]、[notifications, total, unreadCount]
│
└── 缓存与性能
    ├── HotNovel 模型：热榜数据异步更新，避免实时计算
    └── Prisma 查询选择性 select 减少数据传输量
```

---

### 3.5 前端交互思想

```
前端交互思想
├── 组件化思想（Component-Based）
│   ├── 原子组件：LikeButton、Pagination、NotificationItem
│   ├── 业务组件：CommentForm、ReplyItem、DeletePostButton
│   └── 布局组件：Navbar、HotNovelsSidebar、Providers
│
├── 受控组件 vs 非受控组件
│   ├── 受控：LikeButton（useState 管理 liked / count）
│   └── 非受控：CreatePostPage（FormData 从 DOM 读取，减少 re-render）
│
├── 异步非阻塞（Async Non-blocking）
│   ├── fetch API 调用全部异步化
│   ├── loading 状态反馈（disabled 按钮、加载提示文字）
│   └── 错误边界（error.tsx）与加载骨架（loading.tsx）
│       → Next.js Streaming 特性，Suspense 级别的错误/加载处理
│
├── 状态管理
│   ├── 本地状态：React useState（UI 交互状态）
│   ├── 全局状态：NextAuth SessionProvider（认证状态）
│   └── 服务端状态：直接 Server Component 查询（无 Redux / Zustand）
│
├── 用户体验优化
│   ├── 乐观更新（点赞即时反馈）
│   ├── 轮询通知（60 秒心跳，无 WebSocket 依赖）
│   ├── Sticky Navbar（sticky top-0 + backdrop-blur）
│   └── 响应式布局（移动端隐藏侧边栏，折叠导航）
│
└── 路由与导航
    ├── 客户端路由（next/link 预取，无页面刷新）
    ├── 编程式导航（useRouter().push）
    │   └── 示例：发帖成功后跳转 /post/[id]
    └── 动态路由段（[id]、[slug]、[...nextauth]）
```

---

> **学习建议：** 建议按「SQL 数据建模 → TypeScript 基础 → Next.js 路由与 API → React 组件交互 → CSS 样式系统 → 安全与测试」的顺序逐层深入，结合源代码对照本手册中的知识点进行实践。
