# AuraDraw

一个基于大气随机数的彩票工具平台，使用 Random.org API 提供真正的随机数生成服务，并支持查询往期开奖信息。

## 功能特性

### 🎲 随机生成
- **大乐透生成器**: 生成 5 个前区号码 (1-35) + 2 个后区号码 (1-12)
- **双色球生成器**: 生成 6 个红球号码 (1-33) + 1 个蓝球号码 (1-16)
- **通用随机数**: 自定义范围的大气随机数生成

### 📊 开奖查询
- **历史开奖**: 查询往期大乐透开奖号码
- **多种筛选**: 支持最近N期、日期范围、精确期号查询
- **自动同步**: 每天自动从官方数据源同步最新开奖结果

### 🎨 界面特性
- **明暗主题**: 支持亮色和暗色主题切换
- **移动优先**: 专为移动设备优化的响应式设计
- **现代UI**: 卡片式布局，流畅动画效果

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **数据库**: Vercel Postgres
- **样式**: CSS Variables + 自定义 CSS
- **部署**: Vercel + Cron Jobs

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# Vercel Postgres 数据库连接（可选，用于开奖查询功能）
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Cron Job 认证密钥
CRON_SECRET="your-cron-secret-key"
```

### 3. 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 初始化数据库（首次使用）

```bash
curl -X POST http://localhost:3000/api/db/init
```

### 5. 手动同步开奖数据

```bash
curl http://localhost:3000/api/cron/sync-lottery
```

## 部署到 Vercel

### 1. 创建数据库

1. 在 Vercel Dashboard 中打开项目
2. 进入 **Storage** 标签页
3. 点击 **Create Database** 选择 **Postgres**
4. 数据库创建后，环境变量会自动添加到项目

### 2. 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 说明 |
|--------|------|
| `CRON_SECRET` | Cron Job 认证密钥（生成方式: `openssl rand -hex 32`） |

### 3. 部署项目

```bash
git push origin main
```

Vercel 会自动检测并部署 Next.js 项目。

### 4. 初始化数据库

部署完成后，访问以下 URL 初始化数据库表结构：

```
POST https://your-domain.vercel.app/api/db/init
Authorization: Bearer your-cron-secret
```

### 5. 定时任务

项目已配置 Vercel Cron Job，每天凌晨 3 点自动同步开奖数据：

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-lottery",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## 项目结构

```
AuraDraw/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── sync-lottery/   # 定时同步任务
│   │   ├── db/
│   │   │   └── init/           # 数据库初始化
│   │   └── lottery/
│   │       ├── history/        # 历史开奖查询
│   │       └── latest/         # 最新开奖查询
│   ├── daletu/
│   │   ├── generate/           # 大乐透号码生成
│   │   ├── history/            # 大乐透开奖查询
│   │   └── page.tsx            # 大乐透功能入口
│   ├── shuangseqiu/            # 双色球页面
│   ├── random/                 # 随机数生成页面
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 首页
├── components/
│   └── ThemeToggle.tsx         # 主题切换组件
├── lib/
│   ├── db/
│   │   ├── index.ts            # 数据库操作
│   │   └── schema.sql          # 数据库表结构
│   ├── lottery.ts              # 彩票生成逻辑
│   ├── lottery-api.ts          # 开奖数据API
│   └── random-api.ts           # Random.org API
├── vercel.json                 # Vercel 配置（Cron Jobs）
└── package.json
```

## API 说明

### 随机数生成
使用 [Random.org](https://www.random.org) 的免费 HTTP API 生成大气随机数，基于真实的大气噪声。

### 开奖数据
使用汇鸟 API 获取历史开奖数据，支持大乐透、双色球等多种彩种。

## 数据库设计

### 彩种配置表 (lottery_types)
存储各彩种的基本配置信息，支持体彩和福彩。

### 开奖记录表 (lottery_results)
存储所有彩种的历史开奖数据，包含期号、开奖日期、号码、奖池等。

### 同步状态表 (sync_status)
记录每个彩种的同步进度，支持增量同步和历史回溯。

## 许可证

MIT
