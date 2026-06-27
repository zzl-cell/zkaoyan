INSERT INTO products (product_id, name, description, price, category, cover_image, is_question_bank, question_count, status, created_at) VALUES
('prod_001', '高等数学考研真题集', '精选近10年考研数学一真题，含详细解析', 9900, '数学', '', 1, 200, 'active', '2026-06-26T12:00:00Z'),
('prod_002', '微观经济学核心题库', '覆盖高鸿业微观经济学全部考点', 6800, '经济学', '', 1, 150, 'active', '2026-06-26T12:00:00Z'),
('prod_003', '英语阅读理解专项训练', '100篇精选阅读理解，难度分级', 5800, '英语', '', 1, 100, 'active', '2026-06-26T12:00:00Z'),
('prod_004', '考研政治思维导图', '马原+毛中特+史纲+思修全套思维导图', 3900, '政治', '', 0, 0, 'active', '2026-06-26T12:00:00Z');

INSERT INTO notices (notice_id, title, content, type, status, created_at) VALUES
('notice_001', '欢迎使用Z考研', '<p>Z考研是一个面向大学生的在线题库学习平台，支持随机练习、模拟考试、错题重做等功能。注册即送1000虚拟币！</p>', 'system', 'published', '2026-06-26T12:00:00Z'),
('notice_002', '签到奖励规则说明', '<p>连续签到可获得递增奖励：第1天1币，第2天2币...第7天7币。第8-14天每天8币，第15天起每天10币，且每3天有机会获得概率大奖（最高100币）！</p>', 'activity', 'published', '2026-06-26T12:00:00Z');
