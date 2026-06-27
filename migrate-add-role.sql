-- Migration: 添加 role 字段到 users 表
-- 执行时间: 2026-06-27

-- 1. 添加 role 字段（默认值为 'user'）
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;

-- 2. 设置管理员账号（手机号 19126971307）
UPDATE users SET role = 'admin' WHERE phone = '19126971307';

-- 3. 验证修改
SELECT user_id, phone, nickname, role FROM users WHERE phone = '19126971307';
