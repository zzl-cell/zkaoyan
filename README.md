# Z考研 — 题库社区 App

A mobile-first quiz community platform for college students. Built with Vue 3, deployed on Cloudflare Workers.

面向大学生的题库社区移动端应用，基于 Vue 3 构建，部署在 Cloudflare Workers。

---

[中文](#中文) | [English](#english)

---

# 中文

## 项目简介

**Z考研**（`quiz-community`）是一个面向大学生的在线题库学习与社区互动平台。支持乱序练习、模拟考试、错题重做、学习统计、动态发布、虚拟币签到、资料商城等功能。采用前后端分离架构，前端为 Vue 3 单页应用（PWA），后端通过 Cloudflare Workers 部署云函数，Mock 服务器用于本地开发调试。

## 功能特性

基于路由表（`src/router/index.js`）和视图组件（`src/views/`），项目包含以下功能模块：

### 用户认证（Auth）
- 密码登录 / 短信验证码登录
- 用户注册
- 密码重置
- JWT Token 自动过期检测与拦截

### 推荐与社区（Recommend）
- 推荐信息流（首页）
- 关注动态流
- 发布 / 删除动态
- 动态详情页
- 评论系统（发布 / 删除评论）
- 点赞 / 收藏 / 分享
- 动态推广（付费曝光）
- 用户搜索 / 话题搜索
- 用户空间主页
- 公告列表与详情

### 题库练习（Practice）
- 考前冲刺试卷
- 随机练习
- 模拟考试（含计时器与暂停功能）
- 答题页面（单选 / 多选 / 判断题）
- 成绩报告与个人排名
- 错题本（重做 / 删除）
- 收藏题目
- 刷题记录与学习统计
- 知识点树

### 资料商城（Shop）
- 商品列表与详情
- 虚拟币购买资料
- 订单确认与支付结果
- 我的资料库
- 在线查看资料
- 纠错提交

### 个人中心（Profile）
- 编辑个人资料（昵称 / 头像 / 兴趣）
- 勋章墙
- 关注 / 粉丝列表
- 虚拟币账户（余额 / 签到 / 交易记录 / 概率奖励日志）
- 消息通知中心
- 我的题库
- 收藏动态
- 纠错排行榜
- 隐私设置（私密模式）
- 修改密码 / 换绑手机
- 意见反馈
- 用户协议 / 隐私策略 / 关于我们

### 第三方机构管理（Third-party）
- 机构登录 / 注册
- 题库同步与管理
- 商品管理
- 订单与结算
- 保证金管理

## 技术栈

| 分类 | 技术 | 版本 |
|---|---|---|
| 框架 | Vue 3 (Composition API) | ^3.5.13 |
| 路由 | Vue Router 4 | ^4.5.0 |
| 状态管理 | Pinia | ^2.3.0 |
| UI 组件库 | Vant 4 | ^4.9.14 |
| HTTP 客户端 | Axios | ^1.7.9 |
| 构建工具 | Vite 6 | ^6.0.5 |
| PWA | vite-plugin-pwa | ^0.21.1 |
| 部署平台 | Cloudflare Workers | — |
| 安全 | DOMPurify（XSS 防护）、bcryptjs（密码哈希）| ^3.4.11 / ^3.0.3 |

## 项目结构

```
quiz-community/
├── .env                          # 环境变量（应用标题、API 路径、版本号）
├── .gitignore                    # Git 忽略规则
├── .node-version                 # Node.js 版本要求 (>=20)
├── index.html                    # 入口 HTML
├── package.json                  # 项目配置与依赖
├── vite.config.js                # Vite 构建配置（Vue / Vant / PWA）
├── wrangler.jsonc                # Cloudflare Workers 部署配置
├── public/                       # 静态资源（图标等）
├── mock/                         # Mock 服务器（本地开发）
├── src/
│   ├── App.vue                   # 根组件（全局样式重置、移动端适配）
│   ├── main.js                   # 应用入口
│   ├── router/
│   │   └── index.js              # 路由表（5 大模块 + 认证 + JWT 守卫）
│   ├── stores/
│   │   ├── user.js               # 用户状态（登录/资料/隐私/登出）
│   │   ├── exam.js               # 考试状态（试卷/答题/计时）
│   │   ├── feed.js               # 动态流状态（推荐/关注/分页）
│   │   ├── shop.js               # 商城状态（商品/订单/资料库）
│   │   ├── coin.js               # 虚拟币状态（签到/余额/交易）
│   │   └── notification.js       # 通知状态（未读计数）
│   ├── api/
│   │   ├── request.js            # Axios 实例（JWT 拦截器、错误处理）
│   │   ├── user.js               # 用户 API（注册/登录/资料/关注）
│   │   ├── practice.js           # 练习 API（试卷/答题/错题/收藏/统计）
│   │   ├── feed.js               # 动态 API（流/评论/点赞/搜索）
│   │   ├── shop.js               # 商城 API（商品/订单/资料库）
│   │   ├── coin.js               # 虚拟币 API（签到/余额/充值/邀请）
│   │   ├── notice.js             # 公告 API
│   │   ├── notification.js       # 通知 API
│   │   └── third.js              # 第三方机构 API
│   ├── views/
│   │   ├── auth/                 # 登录、注册、重置密码
│   │   ├── recommend/            # 推荐流、关注流、动态详情、搜索、用户空间
│   │   ├── practice/             # 练习首页、冲刺卷、答题、成绩、错题本、收藏、记录
│   │   ├── shop/                 # 商城首页、商品详情、订单、资料库、纠错
│   │   ├── notice/               # 公告列表、公告详情
│   │   └── profile/              # 个人中心（20+ 子页面）
│   ├── components/
│   │   └── common/
│   │       └── TabBarLayout.vue  # 底部导航栏布局（推荐/练习/资料/我的）
│   └── utils/
│       ├── auth.js               # JWT 过期检测
│       ├── storage.js            # localStorage 封装（token / 用户信息）
│       ├── constants.js          # 全局常量（题型/难度/状态枚举）
│       ├── sensitive-words.js    # 客户端敏感词预检
│       └── watermark.js          # Canvas 浮水印（防截图泄露）
└── dist/                         # 构建产物
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

启动后访问 `http://localhost:3000`，Mock 服务器提供 API 模拟数据。

### 构建生产版本

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 预览构建产物

```bash
npm run preview
```

### 部署到 Cloudflare Workers

```bash
npx wrangler deploy
```

## 环境变量说明

在项目根目录创建 `.env` 文件：

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `VITE_APP_TITLE` | 应用标题 | `题库社区` |
| `VITE_API_BASE` | API 基础路径 | `/api/v1` |
| `VITE_APP_VERSION` | 应用版本号 | `1.0.0` |

> **注意**：Vite 环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

---

# English

## Project Overview

**Z考研** (`quiz-community`) is an online quiz learning and community platform designed for college students. It supports randomized practice, mock exams, wrong-question review, study analytics, social feed, virtual coin sign-in rewards, and a digital resource marketplace. The architecture follows a frontend-backend separation pattern — the frontend is a Vue 3 SPA (PWA), the backend runs on Cloudflare Workers, and a mock server is provided for local development.

## Features

Based on the route table (`src/router/index.js`) and view components (`src/views/`), the project includes the following modules:

### Authentication
- Password login / SMS verification login
- User registration
- Password reset
- JWT token auto-expiry detection and interception

### Social Feed (Recommend)
- Recommended feed (home page)
- Following feed
- Create / delete posts
- Post detail page
- Comment system (create / delete comments)
- Like / favorite / share
- Post promotion (paid exposure)
- User search / topic search
- User space profile
- Announcement list and detail

### Quiz Practice (Practice)
- Sprint papers (exam prep)
- Random practice
- Mock exam (with timer and pause)
- Exam page (single-choice / multi-choice / true-false)
- Score report and personal ranking
- Wrong book (redo / remove)
- Favorite questions
- Study history and statistics
- Knowledge tree

### Resource Marketplace (Shop)
- Product list and detail
- Purchase resources with virtual coins
- Order confirmation and payment result
- My resource library
- Online resource viewer
- Correction submission

### Profile Center (Profile)
- Edit profile (nickname / avatar / interests)
- Badge wall
- Following / followers list
- Virtual coin account (balance / sign-in / transactions / probability logs)
- Message notification center
- My question banks
- Favorite posts
- Correction leaderboard
- Privacy settings (private mode)
- Change password / change phone
- Feedback
- User agreement / privacy policy / about us

### Third-party Institution Management
- Institution login / registration
- Question bank sync and management
- Product management
- Orders and settlement
- Deposit management

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Vue 3 (Composition API) | ^3.5.13 |
| Router | Vue Router 4 | ^4.5.0 |
| State Management | Pinia | ^2.3.0 |
| UI Library | Vant 4 | ^4.9.14 |
| HTTP Client | Axios | ^1.7.9 |
| Build Tool | Vite 6 | ^6.0.5 |
| PWA | vite-plugin-pwa | ^0.21.1 |
| Deployment | Cloudflare Workers | — |
| Security | DOMPurify (XSS), bcryptjs (password hash) | ^3.4.11 / ^3.0.3 |

## Project Structure

```
quiz-community/
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── .node-version                 # Node.js version requirement (>=20)
├── index.html                    # Entry HTML
├── package.json                  # Project config and dependencies
├── vite.config.js                # Vite build config (Vue / Vant / PWA)
├── wrangler.jsonc                # Cloudflare Workers deployment config
├── public/                       # Static assets (icons, etc.)
├── mock/                         # Mock server (local dev)
├── src/
│   ├── App.vue                   # Root component (global reset, mobile layout)
│   ├── main.js                   # App entry point
│   ├── router/
│   │   └── index.js              # Route table (5 modules + auth + JWT guard)
│   ├── stores/
│   │   ├── user.js               # User state (login/profile/privacy/logout)
│   │   ├── exam.js               # Exam state (paper/answers/timer)
│   │   ├── feed.js               # Feed state (recommend/following/pagination)
│   │   ├── shop.js               # Shop state (products/orders/library)
│   │   ├── coin.js               # Coin state (sign-in/balance/transactions)
│   │   └── notification.js       # Notification state (unread counts)
│   ├── api/
│   │   ├── request.js            # Axios instance (JWT interceptor, error handling)
│   │   ├── user.js               # User API (register/login/profile/follow)
│   │   ├── practice.js           # Practice API (papers/exam/wrong/favorites/stats)
│   │   ├── feed.js               # Feed API (posts/comments/likes/search)
│   │   ├── shop.js               # Shop API (products/orders/library)
│   │   ├── coin.js               # Coin API (sign-in/balance/recharge/invite)
│   │   ├── notice.js             # Announcement API
│   │   ├── notification.js       # Notification API
│   │   └── third.js              # Third-party institution API
│   ├── views/
│   │   ├── auth/                 # Login, Register, ResetPassword
│   │   ├── recommend/            # Feed, Following, PostDetail, Search, UserSpace
│   │   ├── practice/             # PracticeHome, Sprint, Exam, Result, WrongBook, Favorites, History
│   │   ├── shop/                 # ShopHome, ProductDetail, Orders, Library, Correction
│   │   ├── notice/               # NoticeList, NoticeDetail
│   │   └── profile/              # Profile center (20+ sub-pages)
│   ├── components/
│   │   └── common/
│   │       └── TabBarLayout.vue  # Bottom tab bar layout (Recommend/Practice/Shop/Profile)
│   └── utils/
│       ├── auth.js               # JWT expiry detection
│       ├── storage.js            # localStorage wrapper (token / user info)
│       ├── constants.js          # Global constants (question types, difficulty, enums)
│       ├── sensitive-words.js    # Client-side sensitive word pre-check
│       └── watermark.js          # Canvas watermark (anti-screenshot)
└── dist/                         # Build output
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm or pnpm

### Install Dependencies

```bash
npm install
```

### Local Development

```bash
npm run dev
```

Visit `http://localhost:3000` after startup. The mock server provides simulated API data.

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` directory.

### Preview Build Output

```bash
npm run preview
```

### Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

## Environment Variables

Create a `.env` file in the project root:

| Variable | Description | Default |
|---|---|---|
| `VITE_APP_TITLE` | Application title | `题库社区` |
| `VITE_API_BASE` | API base path | `/api/v1` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

> **Note**: Vite environment variables must be prefixed with `VITE_` to be accessible in client-side code.
