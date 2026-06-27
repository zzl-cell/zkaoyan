-- Add signup_bonus_given column to users table
ALTER TABLE users ADD COLUMN signup_bonus_given INTEGER DEFAULT 0;

-- Mark all existing users as already having received bonus
-- (they will be compensated via admin API)
UPDATE users SET signup_bonus_given = 0;
