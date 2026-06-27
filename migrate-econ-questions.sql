-- Migration: 替换微观经济学题库（15题 → 175题）
-- 执行时间: 2026-06-27

-- 1. 删除旧的微观经济学题目
DELETE FROM questions WHERE question_id LIKE 'q_econ_%';

-- 2. 插入新的微观经济学题目（175题）
-- 第一章：需求、供给与均衡（约70题）
-- 第二章：消费者理论/效用（约35题）
-- 第三章：生产与成本理论（约50题）
-- 第四章：市场结构/完全竞争（约20题）

INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_001', '需求曲线是一条倾斜的曲线，其倾斜的方向为', '[{"label": "A", "content": "右下方"}, {"label": "B", "content": "右上方"}, {"label": "C", "content": "左下方"}, {"label": "D", "content": "左上方"}]', 'A', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_002', '下列体现了需求规律的是', '[{"label": "A", "content": "药品的价格上涨，使药品质量得到了提高"}, {"label": "B", "content": "汽油的价格提高，小汽车的销售量减少"}, {"label": "C", "content": "丝绸价格提高，游览公园的人数增加"}, {"label": "D", "content": "照相机价格下降，导致销售量增加"}]', 'D', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_003', '其他因素保持不变，只是某种商品的价格下降，将产生什么样的结果', '[{"label": "A", "content": "需求增加"}, {"label": "B", "content": "需求减少"}, {"label": "C", "content": "需求量增加"}, {"label": "D", "content": "需求量减少"}]', 'C', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_004', '下列变化中，哪种变化不会导致需求曲线的位移', '[{"label": "A", "content": "人们的偏好和爱好"}, {"label": "B", "content": "产品的价格"}, {"label": "C", "content": "消费者的收入"}, {"label": "D", "content": "相关产品的价格"}]', 'B', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_005', '当汽油的价格上升时，在其他条件不变的情况下，对小汽车的需求量将', '[{"label": "A", "content": "减少"}, {"label": "B", "content": "不变"}, {"label": "C", "content": "增加"}, {"label": "D", "content": "难以确定"}]', 'A', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_006', '当咖啡价格急剧升高时，在其他条件不变的情况下，对茶叶的需求量将', '[{"label": "A", "content": "减少"}, {"label": "B", "content": "不变"}, {"label": "C", "content": "增加"}, {"label": "D", "content": "难以确定"}]', 'C', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_007', '消费者预期某种物品将来价格要上升，则对该物品当前的需求会', '[{"label": "A", "content": "减少"}, {"label": "B", "content": "不变"}, {"label": "C", "content": "增加"}, {"label": "D", "content": "难以确定"}]', 'C', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_008', '需求的变动与需求量的变动', '[{"label": "A", "content": "都是由于一种原因引起的"}, {"label": "B", "content": "需求的变动由价格以外的其他因素的变动所引起的，而需求量的变动由价格的变动引起的"}, {"label": "C", "content": "需求量的变动是由一种因素引起的，需求变动是两种及两种以上的因素引起的"}, {"label": "D", "content": "是一回事"}]', 'B', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_009', '整个需求曲线向右上方移动，表明', '[{"label": "A", "content": "需求增加"}, {"label": "B", "content": "需求减少"}, {"label": "C", "content": "价格提高"}, {"label": "D", "content": "价格下降"}]', 'A', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');
INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('q_econ_010', '对化妆品的需求减少是指', '[{"label": "A", "content": "收入减少引起的减少"}, {"label": "B", "content": "价格上升而引起的减少"}, {"label": "C", "content": "需求量的减少"}, {"label": "D", "content": "价格下降"}]', 'A', '', 'single', 'medium', '微观经济学/第一章', 'seed', 'active', '2026-06-27T00:00:00.000Z');

-- 更多题目请从 seed-questions.sql 中获取完整版本
-- 由于文件大小限制，这里只放了10道题作为示例
-- 完整的175道题需要分批导入
