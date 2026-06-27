-- Full D1 schema for quiz-community
-- Tables already existing: users (skip CREATE)

CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  topic_tags TEXT DEFAULT '[]',
  visibility TEXT DEFAULT 'public',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  initial_heat REAL DEFAULT 0,
  is_promoted INTEGER DEFAULT 0,
  promote_expire_at TEXT,
  status TEXT DEFAULT 'normal',
  wearing_badge_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT UNIQUE NOT NULL,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT,
  reply_to_user_id TEXT,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'normal',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, target_type, target_id, action_type)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT UNIQUE NOT NULL,
  stem TEXT NOT NULL,
  options TEXT DEFAULT '[]',
  answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  question_type TEXT DEFAULT 'single',
  difficulty TEXT DEFAULT 'medium',
  knowledge_path TEXT DEFAULT '',
  knowledge_id TEXT DEFAULT '',
  source_type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  tenant_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  level INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS paper_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  question_ids TEXT DEFAULT '[]',
  total_count INTEGER DEFAULT 0,
  suggest_duration INTEGER DEFAULT 60,
  knowledge_scope TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  paper_type TEXT NOT NULL,
  paper_snapshot TEXT NOT NULL,
  user_answers TEXT DEFAULT '{}',
  current_index INTEGER DEFAULT 1,
  remaining_seconds INTEGER DEFAULT 0,
  score_detail TEXT,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  score REAL DEFAULT 0,
  status TEXT DEFAULT 'ongoing',
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS wrong_book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_snapshot TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  wrong_count INTEGER DEFAULT 1,
  is_removed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_snapshot TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS study_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  date TEXT NOT NULL,
  question_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  is_question_bank INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  max_discount_ratio REAL DEFAULT 0.05,
  status TEXT DEFAULT 'active',
  tenant_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  original_amount INTEGER DEFAULT 0,
  final_amount INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'coin',
  status TEXT DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS coin_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  scene TEXT NOT NULL,
  description TEXT DEFAULT '',
  balance_after INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sign_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  streak_days INTEGER DEFAULT 1,
  fixed_reward INTEGER DEFAULT 0,
  prob_reward INTEGER,
  prob_range TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  cover_image TEXT DEFAULT '',
  is_pinned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT DEFAULT '',
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  source_type TEXT DEFAULT '',
  source_id TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  aggregate_count INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Badge tables
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  icon TEXT DEFAULT '',
  description TEXT DEFAULT '',
  unlock_condition TEXT NOT NULL,
  next_badge_id TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_badge_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  is_wearing INTEGER DEFAULT 0,
  unlocked_at TEXT NOT NULL,
  UNIQUE(user_id, badge_id)
);

-- Feedback (user tickets) table
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'bug',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  replies TEXT DEFAULT '[]',
  reward_coins INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tenant (institution) tables
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  contact_phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  deposit_balance INTEGER DEFAULT 0,
  coin_balance INTEGER DEFAULT 0,
  commission_rate INTEGER DEFAULT 6,
  settlement_cycle TEXT DEFAULT 'T+3',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  question_type TEXT DEFAULT 'single',
  stem TEXT NOT NULL,
  options TEXT DEFAULT '[]',
  answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  difficulty TEXT DEFAULT 'medium',
  knowledge_path TEXT DEFAULT '',
  knowledge_id TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  action TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deposit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  payment_method TEXT DEFAULT 'system',
  status TEXT DEFAULT 'completed',
  created_at TEXT NOT NULL
);

-- Correction table
CREATE TABLE IF NOT EXISTS corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correction_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT,
  content TEXT NOT NULL,
  suggested_fix TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  apply_to_question INTEGER DEFAULT 0,
  review_comment TEXT DEFAULT '',
  reviewer_id TEXT,
  reviewed_at TEXT,
  reward_amount INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_heat ON posts(initial_heat DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wrong_book_user ON wrong_book(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_user ON study_records(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_date ON study_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_user ON user_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sign_logs_user ON sign_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_wearing ON user_badges(user_id, is_wearing);
CREATE INDEX IF NOT EXISTS idx_corrections_user ON corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON corrections(status);
CREATE INDEX IF NOT EXISTS idx_corrections_question ON corrections(question_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(contact_phone);
CREATE INDEX IF NOT EXISTS idx_tenant_questions_tenant ON tenant_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_questions_status ON tenant_questions(status);
CREATE INDEX IF NOT EXISTS idx_question_sync_logs_tenant ON question_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_records_tenant ON deposit_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
