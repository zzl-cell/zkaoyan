-- Migration: 修复 users 表和确认其他表存在
-- 执行时间: 2026-06-27

-- 1. 给 users 表添加 status 字段
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;

-- 2. 确认 feedbacks 表存在（如果不存在则创建）
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  replies TEXT DEFAULT '[]',
  reward_coins INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. 确认 orders 表存在
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  original_amount REAL DEFAULT 0,
  final_amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'coin',
  status TEXT DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. 确认 notices 表存在
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  publisher_id TEXT,
  is_pinned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. 验证修改
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'feedbacks', COUNT(*) FROM feedbacks
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'notices', COUNT(*) FROM notices;
