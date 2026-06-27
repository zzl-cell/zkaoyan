-- Badge seed data: 4 lines x 3 levels = 12 badges
-- Run after schema-full.sql to populate the badges table

INSERT OR IGNORE INTO badges (badge_id, name, type, level, icon, description, unlock_condition, next_badge_id, sort_order) VALUES
  ('badge_q_1', '初出茅庐', 'question_count', 1, 'seedling', '完成第1次刷题', '{"type":"question_count","threshold":1}', 'badge_q_2', 1),
  ('badge_q_2', '百题斩', 'question_count', 2, 'book', '累计刷题≥100题', '{"type":"question_count","threshold":100}', 'badge_q_3', 2),
  ('badge_q_3', '千题王', 'question_count', 3, 'crown', '累计刷题≥1000题', '{"type":"question_count","threshold":1000}', NULL, 3),

  ('badge_s_1', '初来乍到', 'streak', 1, 'calendar-o', '连续签到≥3天', '{"type":"streak","threshold":3}', 'badge_s_2', 4),
  ('badge_s_2', '签到达人', 'streak', 2, 'fire-o', '连续签到≥7天', '{"type":"streak","threshold":7}', 'badge_s_3', 5),
  ('badge_s_3', '全勤王者', 'streak', 3, 'diamond-o', '连续签到≥30天', '{"type":"streak","threshold":30}', NULL, 6),

  ('badge_a_1', '小有所成', 'accuracy', 1, 'star-o', '正确率≥60%且刷题≥50题', '{"type":"accuracy","accuracy_threshold":60,"question_threshold":50}', 'badge_a_2', 7),
  ('badge_a_2', '学霸', 'accuracy', 2, 'medal-o', '正确率≥80%且刷题≥200题', '{"type":"accuracy","accuracy_threshold":80,"question_threshold":200}', 'badge_a_3', 8),
  ('badge_a_3', '学神', 'accuracy', 3, 'gem-o', '正确率≥90%且刷题≥500题', '{"type":"accuracy","accuracy_threshold":90,"question_threshold":500}', NULL, 9),

  ('badge_sc_1', '乐于助人', 'social', 1, 'chat-o', '累计评论/回复≥10次', '{"type":"social","metric":"comment_count","threshold":10}', 'badge_sc_2', 10),
  ('badge_sc_2', '社区明星', 'social', 2, 'good-job-o', '累计获得点赞≥100次', '{"type":"social","metric":"like_received","threshold":100}', 'badge_sc_3', 11),
  ('badge_sc_3', '意见领袖', 'social', 3, 'bullhorn-o', '累计粉丝≥500人', '{"type":"social","metric":"follower_count","threshold":500}', NULL, 12);
