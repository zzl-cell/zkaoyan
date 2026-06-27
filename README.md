# Z考研

> 考研刷题 + 社区 + 商城 + 直播的综合学习平台

[中文](#中文) | [English](#english)

---

# 中文

## 项目简介

**Z考研** 是一个面向大学生的考研学习平台，集成题库练习、社区互动、资料商城、直播教学于一体。前端采用 Vue 3 + Vant 4 构建移动端 PWA，后端通过 Cloudflare Pages Functions 提供 API，数据存储在 Cloudflare D1（SQLite）。

**线上地址**：[https://zkaoyan-app.pages.dev](https://zkaoyan-app.pages.dev)

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
| 后端 | Cloudflare Pages Functions（ESM） | — |
| 数据库 | Cloudflare D1（SQLite） | — |
| 直播播放器 | TCPlayer SDK（腾讯云） | v0.0.1 |
| 安全 | DOMPurify（XSS 防护）、PBKDF2-SHA256（密码哈希） | — |

## 功能清单

### 用户认证
- 密码登录 / 短信验证码登录
- 用户注册
- 密码重置
- JWT Token 自动过期检测与拦截
- 短信验证码（Mock 模式：固定 6666）

### 练习系统
- 顺序练习 / 随机练习 / 考前冲刺
- 模拟考试（含计时器与暂停）
- 答题页面（单选 / 多选 / 判断题）
- 成绩报告与个人排名
- 错题本（重做 / 删除）
- 收藏题目
- 刷题记录与学习统计
- 知识点树

### 社区
- 推荐信息流 / 关注动态流
- 发布 / 删除动态
- 评论系统（发布 / 删除）
- 点赞 / 收藏 / 分享
- 动态推广（付费曝光）
- 用户搜索 / 话题搜索
- 用户空间主页

### 资料商城
- 商品列表与详情
- 虚拟币购买资料
- 订单确认与支付结果
- 我的资料库 / 在线查看资料

### 虚拟币系统
- 每日签到（固定奖励 + 概率奖励）
- 虚拟币余额与交易记录
- 概率奖励日志
- 充值创建

### 勋章系统（6 个 API handler）
- 勋章列表（4 条线 × 3 级：刷题、连续签到、准确率、社交）
- 我的勋章 / 勋章进度
- 解锁检查
- 佩戴 / 卸下勋章

### 纠错系统（7 个 API handler）
- 用户提交纠错
- 纠错列表 / 详情
- 管理员审批（批准 / 拒绝）
- 纠错排行榜

### 第三方机构（8 个 API handler）
- 机构入驻申请 / 管理员审核
- 机构登录
- 独立题库上传 / 题目列表
- 题目同步到主库
- 机构统计 / 提现

### 直播模块（14 个 API handler + 4 个前端页面）
- 创建直播间 / 开播 / 停播
- 直播广场（直播间列表）
- 直播间观看（TCPlayer 播放器）
- 实时弹幕聊天
- 礼物发送
- 点赞
- 直播回放列表
- 我的直播间管理

### 管理后台（29 个 API handler + 7 个前端页面）
- 管理员登录 / 仪表盘
- 用户管理（列表 / 详情 / 禁用 / 充值虚拟币）
- 工单管理（列表 / 详情 / 回复 / 关闭 / 奖励）
- 题目管理（列表 / 详情 / 创建 / 编辑 / 删除 / 批量导入）
- 订单管理（列表 / 详情 / 退款）
- 公告管理（列表 / 创建 / 编辑 / 删除 / 置顶）
- 直播管理（列表 / 统计 / 禁用 / 启用）

### 公告系统
- 公告列表（分页、按类型筛选）
- 公告详情

### 消息通知
- 通知列表（分页、按类型筛选）
- 标记已读

## 项目结构

```
quiz-community/
├── index.html                    # 入口 HTML（含 TCPlayer SDK）
├── package.json                  # 项目配置与依赖
├── vite.config.js                # Vite 构建配置（Vue / Vant / PWA）
├── wrangler.jsonc                # Cloudflare Pages 部署配置（D1 binding）
├── schema-full.sql               # 完整数据库建表语句（28 张表）
├── seed-questions.sql            # 题目种子数据
├── seed-content.sql              # 内容种子数据
├── seed-badges.sql               # 勋章种子数据
├── functions/                    # Cloudflare Pages Functions（后端 API）
│   └── api/v1/
│       ├── _utils.js             # 共享工具（JWT / 密码 / 响应 / D1 辅助）
│       ├── user/[[route]].js     # 用户 API（16 handlers）
│       ├── admin/[[route]].js    # 管理后台 API（29 handlers）
│       ├── live/[[route]].js     # 直播 API（14 handlers）
│       ├── feed/[[route]].js     # 社区动态 API
│       ├── practice/[[route]].js # 练习 API
│       ├── shop/[[route]].js     # 商城 API
│       ├── coin/[[route]].js     # 虚拟币 API（7 handlers）
│       ├── badge/[[route]].js    # 勋章 API（6 handlers）
│       ├── correction/[[route]].js # 纠错 API（7 handlers）
│       ├── third/[[route]].js    # 第三方机构 API（8 handlers）
│       ├── notice/[[route]].js   # 公告 API
│       └── notification/[[route]].js # 通知 API
├── src/
│   ├── main.js                   # 应用入口
│   ├── router/index.js           # 路由表（7 大模块 + 管理后台 + JWT 守卫）
│   ├── stores/                   # Pinia 状态管理（user/exam/feed/shop/coin/notification）
│   ├── api/                      # 前端 API 封装
│   ├── views/
│   │   ├── auth/                 # 登录、注册、重置密码（3 页）
│   │   ├── recommend/            # 推荐流、关注流、动态详情、搜索、用户空间（6 页）
│   │   ├── practice/             # 练习首页、冲刺卷、答题、成绩、错题本、收藏、记录（7 页）
│   │   ├── live/                 # 直播广场、直播间、开播、回放列表（4 页）
│   │   ├── shop/                 # 商城首页、商品详情、订单、资料库、纠错（7 页）
│   │   ├── notice/               # 公告列表、公告详情（2 页）
│   │   ├── profile/              # 个人中心（20 个子页面）
│   │   └── admin/                # 管理后台（7 页）
│   ├── components/common/        # 公共组件（TabBarLayout）
│   └── utils/                    # 工具函数（auth/storage/constants/sensitive-words/watermark）
├── public/                       # 静态资源（图标）
└── dist/                         # 构建产物
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

启动后访问 `http://localhost:3000`。

### 构建

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy --project-name=zkaoyan-app --branch=main
```

或通过 Git push 触发 Cloudflare Pages 自动部署。

### 数据库操作

```bash
# 执行建表 SQL
npx wrangler d1 execute quiz-community-db --file=schema-full.sql

# 执行种子数据
npx wrangler d1 execute quiz-community-db --file=seed-questions.sql
npx wrangler d1 execute quiz-community-db --file=seed-badges.sql
```

## 管理员账号

| 字段 | 值 |
|------|------|
| 手机号 | `19126971307` |
| 角色 | `admin` |
| 说明 | 使用普通登录流程，登录后"我的"页面底部显示"后台管理"入口 |

## 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `VITE_APP_TITLE` | 应用标题 | `Z考研` |
| `VITE_API_BASE` | API 基础路径 | `/api/v1` |
| `VITE_APP_VERSION` | 应用版本号 | `1.0.0` |

> Vite 环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

## 后端 API 工具函数

`functions/api/v1/_utils.js` 提供所有后端路由共享的工具：

| 函数 | 说明 |
|------|------|
| `hashPassword(password)` | PBKDF2-SHA256 密码哈希 |
| `verifyPassword(password, stored)` | 密码验证 |
| `generateToken(payload, env)` | JWT 生成（HMAC-SHA256） |
| `verifyToken(token, env)` | JWT 验证 |
| `extractUser(request, env)` | 从 Authorization header 提取用户 |
| `jsonOk(message, data)` | 成功响应 `{ code: 200, message, data }` |
| `jsonBad(message)` | 错误响应 `{ code: 400, message }` |
| `jsonUnauthorized(message)` | 未授权响应 `{ code: 401, message }` |
| `uuid()` | 生成 UUID |
| `verifySmsCode(code, env)` | 短信验证码验证 |
| `requireAdmin(db, userId)` | 管理员权限守卫 |
| `dbRun(db, sql, ...params)` | D1 执行（INSERT/UPDATE/DELETE） |
| `dbGet(db, sql, ...params)` | D1 查询单行 |
| `dbAll(db, sql, ...params)` | D1 查询多行 |

---

# English

## Project Overview

**Z考研** is a comprehensive exam preparation platform for college students, integrating quiz practice, social community, digital resource marketplace, and live streaming. The frontend is built with Vue 3 + Vant 4 as a mobile PWA, the backend runs on Cloudflare Pages Functions, and data is stored in Cloudflare D1 (SQLite).

**Live**: [https://zkaoyan-app.pages.dev](https://zkaoyan-app.pages.dev)

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
| Backend | Cloudflare Pages Functions (ESM) | — |
| Database | Cloudflare D1 (SQLite) | — |
| Live Player | TCPlayer SDK (Tencent Cloud) | v0.0.1 |
| Security | DOMPurify (XSS), PBKDF2-SHA256 (password hash) | — |

## Features

### Authentication
- Password login / SMS verification login
- User registration / password reset
- JWT token auto-expiry detection and interception

### Quiz Practice
- Sequential / random / sprint practice
- Mock exam with timer and pause
- Single-choice / multi-choice / true-false questions
- Score reports and personal ranking
- Wrong book (redo / remove), favorites, study history

### Social Community
- Recommended / following feed
- Create / delete posts, comments, likes, favorites, shares
- User search / topic search / user space profile

### Digital Resource Marketplace
- Product browsing, virtual coin purchase, order management
- My resource library with online viewer

### Virtual Coin System
- Daily sign-in (fixed + probabilistic rewards)
- Balance, transaction history, probability logs

### Badge System (6 API handlers)
- Badge progression across 4 tracks × 3 levels (practice, streak, accuracy, social)
- Wear / unwear badges, unlock progress tracking

### Correction System (7 API handlers)
- User-submitted corrections with admin review (approve / reject)
- Correction leaderboard

### Third-party Institutions (8 API handlers)
- Institution onboarding, independent question bank, sync to main pool
- Statistics and withdrawal

### Live Streaming (14 API handlers + 4 frontend pages)
- Create / start / stop live rooms
- Live square, real-time chat, gifts, likes, replay list

### Admin Panel (29 API handlers + 7 frontend pages)
- Dashboard, user management, feedback management
- Question management (CRUD + batch import)
- Order management (list / detail / refund)
- Announcement management (CRUD + pin)
- Live room management (list / stats / disable / enable)

## Quick Start

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy --project-name=zkaoyan-app --branch=main
```

## Admin Account

| Field | Value |
|------|------|
| Phone | `19126971307` |
| Role | `admin` |
| Note | Use normal login flow; "Admin" entry appears at bottom of Profile page |

## License

MIT
