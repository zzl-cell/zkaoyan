# Z考研 — 题库社区 App

A mobile-first quiz community platform for college students. Built with Vue 3, deployed on Cloudflare Workers.

面向大学生的题库社区移动端应用，基于 Vue 3 构建，部署在 Cloudflare Workers。

---

[中文](#中文) | [English](#english)

---

# 中文

## 项目简介

Z考研 是一个面向大学生的在线题库学习平台，支持乱序练习、模拟考试、错题重做、学习统计等功能。采用前后端分离架构，前端为 Vue 3 SPA（PWA），后端为 Node.js 云函数，Mock 服务器用于本地开发。

## 功能特性

- **多种练习模式**：乱序练习（随机抽题）、模拟考试（倒计时）、模拟练习（即时反馈）
- **错题本**：自动记录错题，支持艾宾浩斯遗忘曲线复习提醒
- **收藏系统**：收藏题目标记，随时回顾
- **学习统计**：今日/累计刷题数、正确率、学习时长、30天趋势
- **商城系统**：资料浏览、虚拟币购买、资料库管理
- **社区动态**：发布/浏览动态、点赞/收藏/评论、话题标签
- **虚拟币体系**：签到领币、充值、邀请好友
- **勋章系统**：4条勋章线×3个等级，自动解锁
- **公告通知**：系统公告、消息通知
- **用户资料**：个人主页、隐私设置、关注/粉丝

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 + Composition API |
| 构建 | Vite 6 |
| 状态管理 | Pinia |
| UI 组件库 | Vant 4（移动端） |
| 路由 | Vue Router 4 |
| HTTP | Axios（JWT 拦截器） |
| PWA | vite-plugin-pwa（Workbox） |
| 部署 | Cloudflare Workers |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（含 Mock API）
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

开发服务器默认运行在 `http://localhost:3000`，Mock 服务器拦截 `/api/*` 请求并返回模拟数据。

万能验证码：`6666`

## 部署

```bash
# 构建并部署到 Cloudflare Workers
npm run build
npx wrangler deploy
```

需要配置 `wrangler.jsonc`：
```json
{
  "name": "zkaoyan",
  "compatibility_date": "2026-06-26",
  "assets": {
    "directory": "dist",
    "not_found_handling": "single-page-application"
  }
}
```

## 项目结构

```
frontend/
├── public/              # 静态资源
├── mock/                # Mock API 服务器
│   └── server.js        # Vite 插件，拦截 /api/* 请求
├── src/
│   ├── api/             # API 请求模块
│   ├── assets/          # 静态资源
│   ├── components/      # 公共组件
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia 状态管理
│   ├── utils/           # 工具函数
│   └── views/           # 页面组件
│       ├── auth/        # 登录/注册
│       ├── notice/      # 公告
│       ├── practice/    # 练习模块
│       ├── profile/     # 个人中心
│       ├── recommend/   # 推荐/社区
│       └── shop/        # 商城
├── index.html
├── vite.config.js
└── package.json
```

---

# English

## About

Z考研 (Z-Kaoyan) is a mobile-first quiz community platform designed for college students in China. It supports randomized practice, mock exams, wrong-answer tracking, study analytics, and more. The architecture is front-end/back-end separated: the front-end is a Vue 3 SPA (PWA), the back-end is Node.js cloud functions, and a mock server is used for local development.

## Features

- **Multiple practice modes**: Randomized practice, timed mock exams, instant-feedback drills
- **Wrong answer book**: Automatic error tracking with Ebbinghaus spaced-repetition reminders
- **Favorites**: Bookmark questions for later review
- **Study analytics**: Daily/total question counts, accuracy rate, study duration, 30-day trends
- **Shop**: Browse materials, purchase with virtual coins, manage purchased assets
- **Community feed**: Post/share updates, like/favorite/comment, topic tags
- **Virtual coin system**: Daily check-in rewards, recharge, invite friends
- **Badge system**: 4 badge lines × 3 levels, auto-unlock on achievement
- **Announcements & notifications**: System notices, message notifications
- **User profile**: Personal page, privacy settings, follow/followers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + Composition API |
| Build Tool | Vite 6 |
| State Management | Pinia |
| UI Library | Vant 4 (mobile) |
| Router | Vue Router 4 |
| HTTP Client | Axios (JWT interceptors) |
| PWA | vite-plugin-pwa (Workbox) |
| Deployment | Cloudflare Workers |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (with Mock API)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs at `http://localhost:3000`. The mock server intercepts `/api/*` requests and returns simulated data.

Universal verification code: `6666`

## Deployment

```bash
# Build and deploy to Cloudflare Workers
npm run build
npx wrangler deploy
```

Requires `wrangler.jsonc`:
```json
{
  "name": "zkaoyan",
  "compatibility_date": "2026-06-26",
  "assets": {
    "directory": "dist",
    "not_found_handling": "single-page-application"
  }
}
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── mock/                # Mock API server
│   └── server.js        # Vite plugin, intercepts /api/* requests
├── src/
│   ├── api/             # API request modules
│   ├── assets/          # Static assets
│   ├── components/      # Shared components
│   ├── router/          # Route configuration
│   ├── stores/          # Pinia state management
│   ├── utils/           # Utility functions
│   └── views/           # Page components
│       ├── auth/        # Login/Register
│       ├── notice/      # Announcements
│       ├── practice/    # Practice module
│       ├── profile/     # User profile
│       ├── recommend/   # Feed/Community
│       └── shop/        # Shop
├── index.html
├── vite.config.js
└── package.json
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is private. All rights reserved.
