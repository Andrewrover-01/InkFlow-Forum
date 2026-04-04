# 墨香论坛 (InkFlow Forum)

> 一个以中国古典文化为主题的现代 BBS 论坛系统，采用 Next.js 15 全栈构建，拥有丝滑的古风 UI、完整的权限体系和管理后台。

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [本地开发环境搭建](#本地开发环境搭建)
- [Docker 一键部署](#docker-一键部署)
- [阿里云服务器部署指南](#阿里云服务器部署指南)
- [运维与维护建议](#运维与维护建议)

---

## 项目简介

墨香论坛是一款"古风 BBS"，界面采用宣纸色调（parchment）、朱砂红（cinnabar）和墨色（ink）三套配色，字体搭配思源宋体与思源黑体，致力于还原中国传统书卷气息。

项目完全基于 **Next.js 15 App Router** 构建，前后端同源，数据库使用 **PostgreSQL**，通过 **Prisma ORM** 访问，认证采用 **NextAuth.js v4** JWT 方案。

---

## 核心功能

### 用户系统

| 功能 | 说明 |
|---|---|
| 注册 / 登录 | 邮箱 + 密码，BCrypt 加密存储 |
| JWT Session | 携带 `id` + `role`，无需每次查库 |
| 个人主页 | `/user/[id]` — 头像、简介、发帖列表、回复数、赞数 |
| 个人设置 | `/settings` — 修改昵称、简介、头像 URL |

### 论坛核心

| 功能 | 说明 |
|---|---|
| 帖子列表 | `/forum` — 分页、置顶优先 |
| 版块分类 | `/categories` + `/categories/[slug]` — 排序、分页 |
| 帖子详情 | `/post/[id]` — 盖楼回复、多级评论、点赞 |
| 发帖 / 编辑 | `/post/create`、`/post/[id]/edit` |
| 搜索 | `/search?q=关键词` — 标题/内容/摘要/标签全文模糊匹配 |
| 点赞 | 回复点赞，乐观更新，幂等切换 |
| 删除回复/评论 | 作者或版主/管理员可删除 |

### 权限体系（RBAC）

| 角色 | 权限 |
|---|---|
| `GUEST` | 只读 |
| `MEMBER` | 发帖、回复、评论、点赞 |
| `MODERATOR` | 以上 + 置顶/锁定帖子、删除他人回复/评论 |
| `ADMIN` | 以上 + 管理后台（用户/版块/帖子完整管理） |

### 管理后台 `/admin`

- 数据看板（用户总数、帖子总数、版块数、回复数）
- 用户管理：搜索、修改角色（禁止自我降级）
- 帖子管理：置顶 / 锁定 / 删除
- 版块管理：增删改排序，支持 Emoji 图标

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | Next.js 15 (App Router, Server Components) |
| 语言 | TypeScript 5 |
| 数据库 | PostgreSQL 16 |
| ORM | Prisma 5 |
| 认证 | NextAuth.js v4 (JWT + Credentials) |
| 样式 | Tailwind CSS 3 + 古风色彩主题 |
| 图标 | Lucide React |
| 部署 | PM2 + Nginx（推荐） |

---

## 本地开发环境搭建

### 前置要求

- Node.js ≥ 18
- PostgreSQL ≥ 14（本地或 Docker）
- Git

### 1. 克隆仓库

```bash
git clone https://github.com/Andrewrover-01/InkFlow-Forum.git
cd InkFlow-Forum
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例文件并填入实际值：

```bash
cp .env.example .env
```

编辑 `.env`，填写以下内容：

```env
# PostgreSQL 连接字符串
# 格式: postgresql://用户名:密码@主机:端口/数据库名
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/inkflow"

# NextAuth 密钥（任意随机字符串，生产环境请使用强随机值）
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"

# 应用访问地址（本地开发填 http://localhost:3000）
NEXTAUTH_URL="http://localhost:3000"
```

> ⚠️ **注意**：`.env` 文件包含敏感信息，已被 `.gitignore` 排除，**请勿提交到代码仓库**。

### 4. 初始化数据库

```bash
# 应用所有 Prisma 迁移（首次运行会自动创建表结构）
npx prisma migrate dev

# 写入种子数据（分类、示例帖子等）
npm run seed
```

如果 PostgreSQL 还没有对应数据库，先创建：

```bash
psql -U postgres -c "CREATE DATABASE inkflow;"
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到论坛首页。

> 种子数据会生成一个 `admin@inkflow.com` / `Admin123!` 的管理员账号，可直接用于登录管理后台。

---

## Docker 一键部署

> 适合本地快速体验或在任意安装了 Docker 的服务器上一键启动整套环境。  
> 包含：**MySQL**（Spring Boot 后端）、**PostgreSQL**（Next.js 前端）、**Redis**、**Spring Boot 后端**、**Next.js 前端**、**Nginx 反向代理** 共 6 个服务。

### 前置要求

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) v2（`docker compose` 或 `docker-compose`）

### 1. 克隆仓库

```bash
git clone https://github.com/Andrewrover-01/InkFlow-Forum.git
cd InkFlow-Forum
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

用任意编辑器打开 `.env`，**至少填写以下必填项**：

```env
# ── MySQL（Spring Boot 后端）──────────────────────
MYSQL_PASSWORD=your_mysql_password          # 必填
MYSQL_ROOT_PASSWORD=your_mysql_root_pwd     # 必填

# ── PostgreSQL（Next.js 前端）────────────────────
POSTGRES_PASSWORD=your_postgres_password    # 必填

# ── Spring Boot JWT 密钥 ──────────────────────────
JWT_SECRET=your_jwt_secret                  # 必填，建议 openssl rand -base64 64

# ── NextAuth.js ───────────────────────────────────
NEXTAUTH_SECRET=your_nextauth_secret        # 必填，建议 openssl rand -base64 32
NEXTAUTH_URL=http://localhost               # 生产环境改为你的域名

# ── Redis（可选，不设密码留空即可）────────────────
REDIS_PASSWORD=
```

> 生成强随机密钥：
> ```bash
> openssl rand -base64 32   # NEXTAUTH_SECRET
> openssl rand -base64 64   # JWT_SECRET
> ```

### 3. 启动所有服务

```bash
docker-compose up -d --build
```

首次启动会拉取镜像并编译代码，约需 3–5 分钟。

### 4. 查看日志

```bash
# 实时跟踪所有服务
docker-compose logs -f

# 只看某个服务
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 5. 访问地址

| 入口 | 地址 |
|---|---|
| 论坛主页（通过 Nginx） | http://localhost |
| Next.js 前端（直连） | http://localhost:3000 |
| Spring Boot 后端（直连） | http://localhost:8080 |

### 6. 停止 / 重启

```bash
# 停止所有容器（保留数据卷）
docker-compose down

# 停止并清除所有数据（⚠️ 会删除数据库数据）
docker-compose down -v

# 仅重启某个服务
docker-compose restart frontend
```

### 7. 更新部署

```bash
git pull origin main
docker-compose up -d --build
```

### 服务架构总览

```
外部请求 → Nginx(:80)
              ├── /api/v1/*   → backend(:8080) ← MySQL + Redis
              └── /*          → frontend(:3000) ← PostgreSQL
```

### 数据持久化

所有数据库数据存储在 Docker named volumes 中，`docker-compose down` **不会**删除它们：

| Volume | 内容 |
|---|---|
| `postgres_data` | Next.js 论坛数据（用户、帖子、回复…） |
| `mysql_data` | Spring Boot 后端业务数据 |
| `redis_data` | 缓存与限流数据 |
| `uploads_data` | 后端上传文件 |

---

## 阿里云服务器部署指南

> 本节以 **Ubuntu 22.04 LTS** 为例，阿里云 ECS 实例同理。

### 一、SSH 连接到服务器

#### 1.1 在阿里云控制台获取公网 IP

登录 [ECS 控制台](https://ecs.console.aliyun.com/) → 实例 → 找到目标实例 → 复制**公网 IP 地址**。

#### 1.2 通过 SSH 连接

**方式 A：密码登录**

```bash
ssh root@<你的服务器公网IP>
# 系统提示输入密码后按回车
```

**方式 B：密钥登录（推荐，更安全）**

```bash
# 将私钥权限设为仅自己可读
chmod 400 ~/your-key.pem
ssh -i ~/your-key.pem root@<你的服务器公网IP>
```

---

### 二、安装系统依赖

```bash
# 更新包列表
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20 LTS（通过 NodeSource 源）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v   # 应输出 v20.x.x
npm  -v   # 应输出 10.x.x

# 安装 PM2（进程守护，开机自启）
sudo npm install -g pm2

# 安装 Nginx（反向代理）
sudo apt install -y nginx

# 安装 Git
sudo apt install -y git
```

---

### 三、安装并配置 PostgreSQL

```bash
# 安装 PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# 启动并设置开机自启
sudo systemctl enable --now postgresql

# 切换到 postgres 用户，进入数据库 shell
sudo -u postgres psql
```

在 psql 交互界面中执行：

```sql
CREATE DATABASE inkflow;
CREATE USER inkflow_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE inkflow TO inkflow_user;
-- PostgreSQL 15+ 还需要：
\c inkflow
GRANT ALL ON SCHEMA public TO inkflow_user;
\q
```

---

### 四、部署应用代码

```bash
# 选择部署目录
cd /var/www

# 克隆代码
sudo git clone https://github.com/Andrewrover-01/InkFlow-Forum.git inkflow
sudo chown -R $USER:$USER /var/www/inkflow
cd /var/www/inkflow

# 安装依赖
npm install
```

#### 4.1 创建生产环境 .env 文件

```bash
nano /var/www/inkflow/.env
```

填入以下内容（替换为真实值）：

```env
DATABASE_URL="postgresql://inkflow_user:your_strong_password@localhost:5432/inkflow"

# 生成强随机密钥：openssl rand -base64 32
NEXTAUTH_SECRET="<用 openssl rand -base64 32 生成的字符串>"

# 填入你的域名或公网 IP
NEXTAUTH_URL="http://your-domain-or-ip"
```

#### 4.2 初始化数据库并构建

```bash
# 执行数据库迁移
npx prisma migrate deploy

# 写入种子数据（可选）
npm run seed

# 构建生产版本
npm run build
```

#### 4.3 用 PM2 启动应用

```bash
# 启动 Next.js 生产服务（监听 3000 端口）
pm2 start npm --name "inkflow" -- start

# 保存 PM2 进程列表，使其在重启后自动恢复
pm2 save
pm2 startup   # 按提示执行输出的命令

# 查看运行状态
pm2 status
pm2 logs inkflow
```

---

### 五、配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/inkflow
```

粘贴以下配置（将 `your-domain.com` 替换为你的域名或 IP）：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 最大上传文件大小
    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/inkflow /etc/nginx/sites-enabled/
sudo nginx -t          # 测试配置语法
sudo systemctl reload nginx
```

---

### 六、配置阿里云安全组规则

> 安全组相当于云服务器的防火墙，必须开放对应端口外部才能访问。

#### 进入安全组管理

阿里云控制台 → **ECS** → **网络与安全** → **安全组** → 找到绑定到你实例的安全组 → **管理规则** → **入方向**

#### 需要添加的规则

| 优先级 | 协议 | 端口范围 | 授权对象 | 说明 |
|---|---|---|---|---|
| 1 | TCP | 80 | 0.0.0.0/0 | HTTP 访问 |
| 1 | TCP | 443 | 0.0.0.0/0 | HTTPS 访问（配置 SSL 后） |
| 1 | TCP | 22 | 你的IP/32 | SSH 管理（建议限制为你的固定 IP） |

> **安全建议**：22 端口的授权对象尽量填写自己的固定 IP（如 `123.x.x.x/32`），不要开放给 `0.0.0.0/0`，避免暴力破解风险。

---

### 七、配置 HTTPS（可选，强烈推荐）

如果你有域名并已完成 DNS 解析，可用 Certbot 免费申请 SSL 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 证书会自动续期，验证：
sudo certbot renew --dry-run
```

---

### 八、更新部署流程

每次代码有更新后：

```bash
cd /var/www/inkflow

# 拉取最新代码
git pull origin main

# 安装新增依赖
npm install

# 如果有数据库变更，执行迁移
npx prisma migrate deploy

# 重新构建
npm run build

# 重启应用（零停机重载）
pm2 reload inkflow
```

---

## 运维与维护建议

### 日志管理

```bash
# 查看应用实时日志
pm2 logs inkflow

# 查看最近 100 行
pm2 logs inkflow --lines 100

# 清空日志
pm2 flush inkflow

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 数据库备份

建议每日自动备份 PostgreSQL：

```bash
# 手动备份
pg_dump -U inkflow_user inkflow > /backup/inkflow_$(date +%Y%m%d).sql

# 自动备份（每天凌晨 2 点），添加到 crontab：
# crontab -e，然后添加：
# 0 2 * * * pg_dump -U inkflow_user inkflow > /backup/inkflow_$(date +\%Y\%m\%d).sql 2>/dev/null
```

### 性能监控

```bash
# PM2 监控面板（CPU/内存/请求数）
pm2 monit

# 查看进程状态
pm2 status

# 内存超限自动重启（在 PM2 启动时配置）
pm2 start npm --name "inkflow" -- start --max-memory-restart 500M
```

### 环境变量安全

- `.env` 文件权限设为 `600`（仅 owner 可读写）：
  ```bash
  chmod 600 /var/www/inkflow/.env
  ```
- 定期轮换 `NEXTAUTH_SECRET`（每次轮换后所有用户需重新登录）
- 数据库密码使用强随机字符串（建议 ≥ 32 位）

### 常见问题排查

| 问题 | 排查步骤 |
|---|---|
| 页面 502 Bad Gateway | 检查 `pm2 status` → 应用是否 online；检查 3000 端口 `ss -tlnp \| grep 3000` |
| 数据库连接失败 | 检查 `DATABASE_URL` 是否正确；PostgreSQL 服务是否运行 `systemctl status postgresql` |
| 登录后立即失效 | `NEXTAUTH_SECRET` 是否一致；`NEXTAUTH_URL` 是否与实际访问地址匹配 |
| 图片不显示 | 检查 `next.config.mjs` 的 `remotePatterns` 配置；图片 URL 是否可公开访问 |
| 构建失败 | 查看 `npm run build` 详细错误；确保 Node.js 版本 ≥ 18 |

---

## 项目目录结构

```
src/
├── app/
│   ├── admin/            # 管理后台（需 ADMIN 角色）
│   ├── api/              # API 路由
│   │   ├── admin/        # 管理员 API
│   │   ├── auth/         # 认证相关
│   │   ├── comments/     # 评论增删
│   │   ├── likes/        # 点赞切换
│   │   ├── posts/        # 帖子 CRUD
│   │   ├── replies/      # 回复增删
│   │   ├── search/       # 全文搜索
│   │   └── user/me/      # 个人资料
│   ├── auth/             # 登录/注册页面
│   ├── categories/       # 版块列表和详情
│   ├── forum/            # 论坛帖子列表
│   ├── post/[id]/        # 帖子详情、编辑
│   ├── search/           # 搜索结果页
│   ├── settings/         # 个人设置
│   └── user/[id]/        # 用户主页
├── components/           # 复用 UI 组件
├── lib/
│   ├── auth.ts           # NextAuth 配置
│   ├── guard.ts          # 权限检查工具
│   ├── prisma.ts         # Prisma 客户端
│   └── utils.ts          # 工具函数
├── middleware.ts          # 路由级 RBAC 中间件
└── types/                # TypeScript 类型扩展
prisma/
├── schema.prisma         # 数据库 Schema
└── seed.ts               # 种子数据
```

---

## 许可证

MIT © 2026 InkFlow Forum
