# AuraDraw

一个基于大气随机数的彩票号码生成器，使用 Random.org API 提供真正的随机数生成服务。

## 功能特性

- 🎱 **大乐透生成器**: 生成 5 个前区号码 (1-35) + 2 个后区号码 (1-12)
- 🔮 **双色球生成器**: 生成 6 个红球号码 (1-33) + 1 个蓝球号码 (1-16)
- 🌓 **明暗主题**: 支持亮色和暗色主题切换
- 📱 **移动优先**: 专为移动设备优化的响应式设计
- ⚡ **真随机数**: 使用 Random.org 大气随机数 API，基于真实大气噪声

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: CSS Variables + 自定义 CSS
- **部署**: Vercel

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 部署到 Vercel

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 中导入项目
3. Vercel 会自动检测 Next.js 项目并进行部署
4. 部署完成后即可访问

## 项目结构

```
AuraDraw/
├── app/
│   ├── daletu/          # 大乐透页面
│   ├── shuangseqiu/     # 双色球页面
│   ├── globals.css      # 全局样式
│   ├── layout.tsx       # 根布局
│   └── page.tsx         # 首页
├── components/
│   └── ThemeToggle.tsx  # 主题切换组件
├── lib/
│   ├── lottery.ts       # 彩票生成逻辑
│   └── random-api.ts    # Random.org API 集成
└── package.json
```

## API 说明

本项目使用 [Random.org](https://www.random.org) 的免费 HTTP API 生成大气随机数。该 API 基于真实的大气噪声（如闪电）生成真随机数，而非伪随机数。

**注意**: Random.org API 有使用配额限制。如果 API 调用失败，应用会显示错误信息，不会使用备选的伪随机数方案。

## 许可证

MIT
