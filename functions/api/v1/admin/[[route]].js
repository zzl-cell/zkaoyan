/**
 * Pages Function: Admin API catch-all route (MVP)
 * Handles all /api/v1/admin/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 * Depends on tables: users, feedbacks, coin_accounts, coin_transactions, orders, questions, posts, exam_sessions
 */
import {
  extractUser, jsonOk, jsonBad, jsonUnauthorized,
  uuid, dbRun, dbGet, dbAll, requireAdmin, hashPassword, verifyPassword, generateToken,
} from '../_utils'

// ── Entry point ──

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB

  if (!db) return jsonBad('Database not configured')

  const url = new URL(request.url)
  const segments = url.pathname.replace(/^\/api\/v1\/admin\//, '').split('/').filter(Boolean)
  const action = segments[0] || ''
  const method = request.method

  try {
    // ── Public: admin login ──
    if (method === 'POST' && action === 'login') {
      let body = {}
      try { body = await request.json() } catch {}
      return await handleLogin(db, env, body)
    }

    // ── All other routes require admin auth ──
    const user = await extractUser(request, env)
    if (!user) return jsonUnauthorized('请先登录')
    await requireAdmin(db, user.user_id)

    // GET routes
    if (method === 'GET') {
      if (action === 'profile') return await handleProfile(db, user)
      if (action === 'users') return await handleUsersList(db, url)
      if (action === 'users_detail') return await handleUserDetail(db, url)
      if (action === 'feedbacks') return await handleFeedbacksList(db, url)
      if (action === 'feedback_detail') return await handleFeedbackDetail(db, url)
      if (action === 'dashboard') return await handleDashboard(db)
      if (action === 'notices') return await handleNoticesList(db, url)
      if (action === 'questions') return await handleQuestionsList(db, url)
      if (action === 'questions_detail') return await handleQuestionDetail(db, url)
      if (action === 'orders') return await handleOrdersList(db, url)
      if (action === 'orders_detail') return await handleOrderDetail(db, url)
      if (action === 'live') return await handleLiveList(db, url)
      if (action === 'live_stats') return await handleLiveStats(db)
      return jsonBad(`Unknown route: GET ${action}`)
    }

    // POST routes
    if (method === 'POST') {
      let body = {}
      try { body = await request.json() } catch {}

      if (action === 'user_coin_grant') return await handleUserCoinGrant(db, user, body)
      if (action === 'user_toggle_status') return await handleUserToggleStatus(db, body)
      if (action === 'feedback_reply') return await handleFeedbackReply(db, user, body)
      if (action === 'feedback_close') return await handleFeedbackClose(db, body)
      if (action === 'feedback_reward') return await handleFeedbackReward(db, body)
      if (action === 'notices') return await handleNoticeCreate(db, user, body)
      if (action === 'notices_update') return await handleNoticeUpdate(db, body)
      if (action === 'questions_create') return await handleQuestionCreate(db, body)
      if (action === 'questions_update') return await handleQuestionUpdate(db, body)
      if (action === 'questions_delete') return await handleQuestionDelete(db, body)
      if (action === 'questions_batch_import') return await handleQuestionsBatchImport(db, body)
      if (action === 'orders_refund') return await handleOrdersRefund(db, body)
      if (action === 'coin_compensate') return await handleCoinCompensate(db, user)
      return jsonBad(`Unknown route: POST ${action}`)
    }

    // PUT routes
    if (method === 'PUT') {
      let body = {}
      try { body = await request.json() } catch {}
      if (action === 'live-rooms' && segments[1] && segments[2] === 'disable') return await handleLiveDisable(db, segments[1])
      if (action === 'live-rooms' && segments[1] && segments[2] === 'enable') return await handleLiveEnable(db, segments[1])
      return jsonBad(`Unknown route: PUT ${action}`)
    }

    // DELETE routes
    if (method === 'DELETE') {
      if (action === 'notices' && segments[1]) return await handleNoticeDelete(db, segments[1])
      return jsonBad(`Unknown route: DELETE ${action}`)
    }

    return jsonBad('Method not allowed')
  } catch (err) {
    console.error(`[admin/${action}] Error:`, err)
    return jsonBad(err.message || 'Internal server error')
  }
}

// ── POST /admin/login ── Admin login (extra check: role === 'admin') ──

async function handleLogin(db, env, body) {
  const { phone, password } = body
  if (!phone || !password) return jsonBad('请填写手机号和密码')

  const user = await dbGet(db, 'SELECT * FROM users WHERE phone = ?', phone)
  if (!user) return jsonUnauthorized('账号不存在')

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return jsonUnauthorized('密码错误')

  if (user.role !== 'admin') return jsonUnauthorized('该账号无管理员权限')

  const token = await generateToken({ user_id: user.user_id, phone: user.phone, role: 'admin' }, env)

  return jsonOk('登录成功', {
    token,
    user_id: user.user_id,
    nickname: user.nickname,
    phone: user.phone,
    role: user.role,
  })
}

// ── GET /admin/profile ── Current admin info ──

async function handleProfile(db, user) {
  const admin = await dbGet(
    db,
    'SELECT user_id, nickname, phone, avatar, role, created_at FROM users WHERE user_id = ?',
    user.user_id
  )
  if (!admin) return jsonBad('管理员不存在')
  return jsonOk('success', admin)
}

// ── GET /admin/users ── Paginated user list with search ──

async function handleUsersList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const keyword = url.searchParams.get('keyword') || ''
  const status = url.searchParams.get('status') || ''
  const offset = (page - 1) * pageSize

  const conditions = []
  const params = []

  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.phone LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (status) {
    conditions.push('u.status = ?')
    params.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM users u ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT u.user_id, u.nickname, u.phone, u.avatar, u.role, u.status, u.created_at,
            COALESCE(ca.balance, 0) AS coin_balance
     FROM users u
     LEFT JOIN coin_accounts ca ON u.user_id = ca.user_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /admin/users_detail?id=xxx ── User detail with stats ──

async function handleUserDetail(db, url) {
  const userId = url.searchParams.get('id')
  if (!userId) return jsonBad('缺少用户ID')

  const user = await dbGet(
    db,
    'SELECT user_id, nickname, phone, avatar, bio, grade, role, status, created_at FROM users WHERE user_id = ?',
    userId
  )
  if (!user) return jsonBad('用户不存在')

  // Coin balance
  const account = await dbGet(db, 'SELECT balance, total_earned, total_spent FROM coin_accounts WHERE user_id = ?', userId)

  // Purchased products
  const assets = await dbAll(
    db,
    `SELECT ua.product_id, ua.created_at AS purchased_at, p.name AS product_name
     FROM user_assets ua
     LEFT JOIN products p ON ua.product_id = p.product_id
     WHERE ua.user_id = ?`,
    userId
  )

  // Wrong book count
  const wrongBookRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM wrong_book WHERE user_id = ? AND is_removed = 0', userId)

  // Posts count
  const postsRow = await dbGet(db, "SELECT COUNT(*) AS cnt FROM posts WHERE user_id = ? AND status = 'normal'", userId)

  // Exam sessions count
  const sessionsRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM exam_sessions WHERE user_id = ?', userId)

  return jsonOk('success', {
    ...user,
    coin_balance: account?.balance || 0,
    coin_total_earned: account?.total_earned || 0,
    coin_total_spent: account?.total_spent || 0,
    purchased_products: assets,
    wrong_book_count: wrongBookRow?.cnt || 0,
    posts_count: postsRow?.cnt || 0,
    exam_sessions_count: sessionsRow?.cnt || 0,
  })
}

// ── POST /admin/user_coin_grant ── Grant or deduct coins ──

async function handleUserCoinGrant(db, admin, body) {
  const { user_id, amount, reason } = body
  if (!user_id || !amount) return jsonBad('缺少用户ID或金额')
  if (!reason) return jsonBad('请填写操作原因（remark 必填）')

  const now = new Date().toISOString()

  // Ensure coin_accounts row exists
  let account = await dbGet(db, 'SELECT balance, total_earned, total_spent FROM coin_accounts WHERE user_id = ?', user_id)
  if (!account) {
    await dbRun(
      db,
      'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
      user_id, now, now
    )
    account = { balance: 0, total_earned: 0, total_spent: 0 }
  }

  const newBalance = account.balance + amount
  if (newBalance < 0) return jsonBad('余额不足，无法扣除')

  // Update coin_accounts
  if (amount > 0) {
    await dbRun(
      db,
      'UPDATE coin_accounts SET balance = ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?',
      newBalance, amount, now, user_id
    )
  } else {
    await dbRun(
      db,
      'UPDATE coin_accounts SET balance = ?, total_spent = total_spent + ?, updated_at = ? WHERE user_id = ?',
      newBalance, Math.abs(amount), now, user_id
    )
  }

  // Record transaction
  await dbRun(
    db,
    `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at)
     VALUES (?, ?, ?, ?, 'admin_adjust', ?, ?, ?)`,
    uuid(), user_id, amount, amount > 0 ? 'earn' : 'spend', reason, newBalance, now
  )

  return jsonOk(amount > 0 ? '发放成功' : '扣除成功', { balance: newBalance })
}

// ── POST /admin/user_toggle_status ── Enable/disable user ──

async function handleUserToggleStatus(db, body) {
  const { user_id } = body
  if (!user_id) return jsonBad('缺少用户ID')

  const user = await dbGet(db, 'SELECT user_id, status FROM users WHERE user_id = ?', user_id)
  if (!user) return jsonBad('用户不存在')

  const newStatus = user.status === 'disabled' ? 'active' : 'disabled'
  await dbRun(db, 'UPDATE users SET status = ? WHERE user_id = ?', newStatus, user_id)

  return jsonOk(newStatus === 'disabled' ? '已禁用' : '已启用', { status: newStatus })
}

// ── GET /admin/feedbacks ── Paginated feedback list ──

async function handleFeedbacksList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const status = url.searchParams.get('status') || ''
  const offset = (page - 1) * pageSize

  const conditions = []
  const params = []

  if (status) {
    conditions.push('f.status = ?')
    params.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM feedbacks f ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT f.*, u.nickname AS user_nickname, u.phone AS user_phone
     FROM feedbacks f
     LEFT JOIN users u ON f.user_id = u.user_id
     ${where}
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /admin/feedback_detail?id=xxx ── Single feedback detail ──

async function handleFeedbackDetail(db, url) {
  const feedbackId = url.searchParams.get('id')
  if (!feedbackId) return jsonBad('缺少工单ID')

  const feedback = await dbGet(
    db,
    `SELECT f.*, u.nickname AS user_nickname, u.phone AS user_phone
     FROM feedbacks f
     LEFT JOIN users u ON f.user_id = u.user_id
     WHERE f.feedback_id = ?`,
    feedbackId
  )
  if (!feedback) return jsonBad('工单不存在')

  return jsonOk('success', feedback)
}

// ── POST /admin/feedback_reply ── Admin replies to feedback ──

async function handleFeedbackReply(db, admin, body) {
  const { feedback_id, content } = body
  if (!feedback_id || !content) return jsonBad('缺少工单ID或回复内容')

  const feedback = await dbGet(db, 'SELECT * FROM feedbacks WHERE feedback_id = ?', feedback_id)
  if (!feedback) return jsonBad('工单不存在')

  const now = new Date().toISOString()

  // Parse existing replies, append new one
  let replies = []
  try { replies = JSON.parse(feedback.replies || '[]') } catch {}
  replies.push({
    admin_id: admin.user_id,
    content,
    created_at: now,
  })

  await dbRun(
    db,
    "UPDATE feedbacks SET replies = ?, status = 'replied', updated_at = ? WHERE feedback_id = ?",
    JSON.stringify(replies), now, feedback_id
  )

  // Notify the user
  const notifId = uuid()
  await dbRun(
    db,
    `INSERT INTO notifications (notification_id, user_id, type, sub_type, title, content, source_type, source_id, is_read, created_at)
     VALUES (?, ?, 'system', 'feedback', '工单回复', ?, 'feedback', ?, 0, ?)`,
    notifId, feedback.user_id, `您的工单（${feedback.title}）收到新回复`, feedback_id, now
  )

  return jsonOk('回复成功')
}

// ── POST /admin/feedback_close ── Close feedback ──

async function handleFeedbackClose(db, body) {
  const { feedback_id } = body
  if (!feedback_id) return jsonBad('缺少工单ID')

  const feedback = await dbGet(db, 'SELECT feedback_id FROM feedbacks WHERE feedback_id = ?', feedback_id)
  if (!feedback) return jsonBad('工单不存在')

  const now = new Date().toISOString()
  await dbRun(db, "UPDATE feedbacks SET status = 'closed', updated_at = ? WHERE feedback_id = ?", now, feedback_id)

  return jsonOk('已关闭')
}

// ── POST /admin/feedback_reward ── Grant coins to feedback submitter ──

async function handleFeedbackReward(db, body) {
  const { feedback_id, amount } = body
  if (!feedback_id || !amount) return jsonBad('缺少工单ID或金额')

  const feedback = await dbGet(db, 'SELECT * FROM feedbacks WHERE feedback_id = ?', feedback_id)
  if (!feedback) return jsonBad('工单不存在')

  const now = new Date().toISOString()

  // Update feedback reward_coins
  await dbRun(
    db,
    'UPDATE feedbacks SET reward_coins = reward_coins + ?, updated_at = ? WHERE feedback_id = ?',
    amount, now, feedback_id
  )

  // Ensure coin_accounts row exists
  let account = await dbGet(db, 'SELECT balance, total_earned FROM coin_accounts WHERE user_id = ?', feedback.user_id)
  if (!account) {
    await dbRun(
      db,
      'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
      feedback.user_id, now, now
    )
    account = { balance: 0, total_earned: 0 }
  }

  const newBalance = account.balance + amount
  const newTotalEarned = account.total_earned + amount

  await dbRun(
    db,
    'UPDATE coin_accounts SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?',
    newBalance, newTotalEarned, now, feedback.user_id
  )

  await dbRun(
    db,
    `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at)
     VALUES (?, ?, ?, 'earn', 'feedback_reward', ?, ?, ?)`,
    uuid(), feedback.user_id, amount, '工单奖励', newBalance, now
  )

  return jsonOk('发放成功', { reward_coins: (feedback.reward_coins || 0) + amount })
}

// ── GET /admin/dashboard ── Overview statistics ──

async function handleDashboard(db) {
  const today = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0]
  const todayStart = today + 'T00:00:00.000Z'

  const [totalUsers, pendingFeedbacks, todayActiveUsers, totalOrders, totalRevenue] = await Promise.all([
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM users').then(r => r?.cnt || 0),
    dbGet(db, "SELECT COUNT(*) AS cnt FROM feedbacks WHERE status = 'pending'").then(r => r?.cnt || 0),
    dbGet(db, 'SELECT COUNT(DISTINCT user_id) AS cnt FROM exam_sessions WHERE started_at >= ?', todayStart).then(r => r?.cnt || 0),
    dbGet(db, "SELECT COUNT(*) AS cnt FROM orders WHERE status = 'paid'").then(r => r?.cnt || 0),
    dbGet(db, "SELECT COALESCE(SUM(final_amount), 0) AS total FROM orders WHERE status = 'paid'").then(r => r?.total || 0),
  ])

  return jsonOk('success', {
    total_users: totalUsers,
    pending_feedbacks: pendingFeedbacks,
    today_active_users: todayActiveUsers,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
  })
}

// ── GET /admin/notices ── Paginated notice list ──

async function handleNoticesList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const countRow = await dbGet(db, 'SELECT COUNT(*) AS total FROM notices')
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    'SELECT * FROM notices ORDER BY created_at DESC LIMIT ? OFFSET ?',
    pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── POST /admin/notices ── Create notice ──

async function handleNoticeCreate(db, user, body) {
  const { title, content, type = 'system' } = body
  if (!title || !content) return jsonBad('请填写标题和内容')

  const now = new Date().toISOString()
  const noticeId = uuid()

  await dbRun(
    db,
    'INSERT INTO notices (notice_id, title, content, type, publisher_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    noticeId, title, content, type, user.user_id, 'published', now, now
  )

  return jsonOk('发布成功', { notice_id: noticeId })
}

// ── DELETE /admin/notices/{id} ── Delete notice ──

async function handleNoticeDelete(db, noticeId) {
  if (!noticeId) return jsonBad('缺少公告ID')

  const notice = await dbGet(db, 'SELECT notice_id FROM notices WHERE notice_id = ?', noticeId)
  if (!notice) return jsonBad('公告不存在')

  await dbRun(db, "UPDATE notices SET status = 'deleted', updated_at = ? WHERE notice_id = ?", new Date().toISOString(), noticeId)
  return jsonOk('删除成功')
}

// ── POST /admin/notices_update ── Update notice ──

async function handleNoticeUpdate(db, body) {
  const { notice_id, title, content, type, is_pinned } = body
  if (!notice_id) return jsonBad('缺少公告ID')

  const notice = await dbGet(db, 'SELECT notice_id FROM notices WHERE notice_id = ?', notice_id)
  if (!notice) return jsonBad('公告不存在')

  const now = new Date().toISOString()
  const sets = ['updated_at = ?']
  const params = [now]

  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (content !== undefined) { sets.push('content = ?'); params.push(content) }
  if (type !== undefined) { sets.push('type = ?'); params.push(type) }
  if (is_pinned !== undefined) { sets.push('is_pinned = ?'); params.push(is_pinned ? 1 : 0) }

  params.push(notice_id)
  await dbRun(db, `UPDATE notices SET ${sets.join(', ')} WHERE notice_id = ?`, ...params)
  return jsonOk('更新成功')
}

// ── GET /admin/questions ── Paginated question list ──

async function handleQuestionsList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const keyword = url.searchParams.get('keyword') || ''
  const questionType = url.searchParams.get('question_type') || ''
  const knowledgeId = url.searchParams.get('knowledge_id') || ''
  const status = url.searchParams.get('status') || 'active'
  const offset = (page - 1) * pageSize

  const conditions = []
  const params = []

  if (status) {
    conditions.push('q.status = ?')
    params.push(status)
  }
  if (keyword) {
    conditions.push('q.stem LIKE ?')
    params.push(`%${keyword}%`)
  }
  if (questionType) {
    conditions.push('q.question_type = ?')
    params.push(questionType)
  }
  if (knowledgeId) {
    conditions.push('q.knowledge_id = ?')
    params.push(knowledgeId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM questions q ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT q.question_id, q.stem, q.question_type, q.difficulty, q.knowledge_id,
            q.knowledge_path, q.source_type, q.status, q.created_at,
            q.options, q.answer
     FROM questions q
     ${where}
     ORDER BY q.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /admin/questions_detail?id=xxx ── Single question detail ──

async function handleQuestionDetail(db, url) {
  const questionId = url.searchParams.get('id')
  if (!questionId) return jsonBad('缺少题目ID')

  const question = await dbGet(db, 'SELECT * FROM questions WHERE question_id = ?', questionId)
  if (!question) return jsonBad('题目不存在')

  return jsonOk('success', question)
}

// ── POST /admin/questions_create ── Create question ──

async function handleQuestionCreate(db, body) {
  const { stem, options, answer, explanation, question_type, difficulty, knowledge_id, knowledge_path } = body
  if (!stem || !answer) return jsonBad('请填写题干和答案')

  const now = new Date().toISOString()
  const questionId = uuid()

  await dbRun(
    db,
    `INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_id, knowledge_path, source_type, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'active', ?)`,
    questionId, stem,
    typeof options === 'string' ? options : JSON.stringify(options || []),
    typeof answer === 'string' ? answer : JSON.stringify(answer),
    explanation || '',
    question_type || 'single',
    difficulty || 'medium',
    knowledge_id || '',
    knowledge_path || '',
    now
  )

  return jsonOk('创建成功', { question_id: questionId })
}

// ── POST /admin/questions_update ── Update question ──

async function handleQuestionUpdate(db, body) {
  const { question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_id, knowledge_path } = body
  if (!question_id) return jsonBad('缺少题目ID')

  const question = await dbGet(db, 'SELECT question_id FROM questions WHERE question_id = ?', question_id)
  if (!question) return jsonBad('题目不存在')

  const sets = []
  const params = []

  if (stem !== undefined) { sets.push('stem = ?'); params.push(stem) }
  if (options !== undefined) { sets.push('options = ?'); params.push(typeof options === 'string' ? options : JSON.stringify(options)) }
  if (answer !== undefined) { sets.push('answer = ?'); params.push(typeof answer === 'string' ? answer : JSON.stringify(answer)) }
  if (explanation !== undefined) { sets.push('explanation = ?'); params.push(explanation) }
  if (question_type !== undefined) { sets.push('question_type = ?'); params.push(question_type) }
  if (difficulty !== undefined) { sets.push('difficulty = ?'); params.push(difficulty) }
  if (knowledge_id !== undefined) { sets.push('knowledge_id = ?'); params.push(knowledge_id) }
  if (knowledge_path !== undefined) { sets.push('knowledge_path = ?'); params.push(knowledge_path) }

  if (sets.length === 0) return jsonBad('没有需要更新的字段')

  params.push(question_id)
  await dbRun(db, `UPDATE questions SET ${sets.join(', ')} WHERE question_id = ?`, ...params)
  return jsonOk('更新成功')
}

// ── POST /admin/questions_delete ── Soft delete question ──

async function handleQuestionDelete(db, body) {
  const { question_id } = body
  if (!question_id) return jsonBad('缺少题目ID')

  const question = await dbGet(db, 'SELECT question_id FROM questions WHERE question_id = ?', question_id)
  if (!question) return jsonBad('题目不存在')

  await dbRun(db, "UPDATE questions SET status = 'deleted' WHERE question_id = ?", question_id)
  return jsonOk('删除成功')
}

// ── POST /admin/questions_batch_import ── Batch import questions ──

async function handleQuestionsBatchImport(db, body) {
  const { questions } = body
  if (!Array.isArray(questions) || questions.length === 0) return jsonBad('请提供题目数组')
  if (questions.length > 200) return jsonBad('单次最多导入200题')

  const now = new Date().toISOString()
  let imported = 0
  const errors = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.stem || !q.answer) {
      errors.push(`第${i + 1}题：缺少题干或答案`)
      continue
    }

    const questionId = uuid()
    try {
      await dbRun(
        db,
        `INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_id, knowledge_path, source_type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', 'active', ?)`,
        questionId, q.stem,
        typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
        typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer),
        q.explanation || '',
        q.question_type || 'single',
        q.difficulty || 'medium',
        q.knowledge_id || '',
        q.knowledge_path || '',
        now
      )
      imported++
    } catch (err) {
      errors.push(`第${i + 1}题：${err.message}`)
    }
  }

  return jsonOk('导入完成', { imported, total: questions.length, errors })
}

// ── GET /admin/orders ── Paginated order list ──

async function handleOrdersList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const status = url.searchParams.get('status') || ''
  const userId = url.searchParams.get('user_id') || ''
  const offset = (page - 1) * pageSize

  const conditions = []
  const params = []

  if (status) {
    conditions.push('o.status = ?')
    params.push(status)
  }
  if (userId) {
    conditions.push('o.user_id = ?')
    params.push(userId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM orders o ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT o.order_id, o.user_id, o.product_id, o.product_name, o.original_amount,
            o.final_amount, o.payment_method, o.status, o.paid_at, o.created_at,
            u.nickname AS user_nickname, u.phone AS user_phone
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.user_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /admin/orders_detail?id=xxx ── Single order detail ──

async function handleOrderDetail(db, url) {
  const orderId = url.searchParams.get('id')
  if (!orderId) return jsonBad('缺少订单ID')

  const order = await dbGet(
    db,
    `SELECT o.*, u.nickname AS user_nickname, u.phone AS user_phone,
            p.name AS product_name_detail, p.description AS product_description, p.cover_image
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.user_id
     LEFT JOIN products p ON o.product_id = p.product_id
     WHERE o.order_id = ?`,
    orderId
  )
  if (!order) return jsonBad('订单不存在')

  return jsonOk('success', order)
}

// ── POST /admin/orders_refund ── Refund order ──

async function handleOrdersRefund(db, body) {
  const { order_id, reason } = body
  if (!order_id) return jsonBad('缺少订单ID')

  const order = await dbGet(db, 'SELECT * FROM orders WHERE order_id = ?', order_id)
  if (!order) return jsonBad('订单不存在')
  if (order.status !== 'paid') return jsonBad('仅已支付的订单可退款')

  const now = new Date().toISOString()

  // Update order status
  await dbRun(db, "UPDATE orders SET status = 'refunded' WHERE order_id = ?", order_id)

  // Remove user asset
  await dbRun(db, 'DELETE FROM user_assets WHERE user_id = ? AND product_id = ?', order.user_id, order.product_id)

  // Refund coins if paid by coin
  if (order.payment_method === 'coin' && order.final_amount > 0) {
    const account = await dbGet(db, 'SELECT balance FROM coin_accounts WHERE user_id = ?', order.user_id)
    if (account) {
      const newBalance = account.balance + order.final_amount
      await dbRun(db, 'UPDATE coin_accounts SET balance = ?, total_spent = MAX(total_spent - ?, 0), updated_at = ? WHERE user_id = ?',
        newBalance, order.final_amount, now, order.user_id)
      await dbRun(
        db,
        `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at)
         VALUES (?, ?, ?, 'earn', 'refund', ?, ?, ?)`,
        uuid(), order.user_id, order.final_amount, `订单退款 ${order_id}`, newBalance, now
      )
    }
  }

  return jsonOk('退款成功', { order_id, status: 'refunded' })
}

// ── GET /admin/live ── All live rooms list ──

async function handleLiveList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const status = url.searchParams.get('status') || ''
  const offset = (page - 1) * pageSize

  const conditions = []
  const params = []

  if (status) {
    conditions.push('lr.status = ?')
    params.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM live_rooms lr ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT lr.*, u.nickname AS host_nickname, u.phone AS host_phone
     FROM live_rooms lr
     LEFT JOIN users u ON lr.host_id = u.user_id
     ${where}
     ORDER BY lr.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /admin/live_stats ── Live statistics ──

async function handleLiveStats(db) {
  const [totalRooms, totalViews, totalPurchases, totalGifts] = await Promise.all([
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM live_rooms').then(r => r?.cnt || 0),
    dbGet(db, 'SELECT COALESCE(SUM(view_count), 0) AS cnt FROM live_rooms').then(r => r?.cnt || 0),
    dbGet(db, "SELECT COALESCE(SUM(amount), 0) AS cnt FROM live_purchases WHERE status = 'paid'").then(r => r?.cnt || 0),
    dbGet(db, 'SELECT COALESCE(SUM(coin_amount), 0) AS cnt FROM live_gifts').then(r => r?.cnt || 0),
  ])

  return jsonOk('success', {
    total_rooms: totalRooms,
    total_views: totalViews,
    total_purchases: totalPurchases,
    total_gifts: totalGifts,
  })
}

// ── PUT /admin/live-rooms/{roomId}/disable ── Disable live room (circuit breaker) ──

async function handleLiveDisable(db, roomId) {
  if (!roomId) return jsonBad('Missing room_id')

  const room = await dbGet(db, 'SELECT id FROM live_rooms WHERE id = ?', roomId)
  if (!room) return jsonBad('Room not found')

  await dbRun(db, "UPDATE live_rooms SET status = 'ended' WHERE id = ?", roomId)
  return jsonOk('Room disabled')
}

// ── PUT /admin/live-rooms/{roomId}/enable ── Enable live room ──

async function handleLiveEnable(db, roomId) {
  if (!roomId) return jsonBad('Missing room_id')

  const room = await dbGet(db, 'SELECT id FROM live_rooms WHERE id = ?', roomId)
  if (!room) return jsonBad('Room not found')

  await dbRun(db, "UPDATE live_rooms SET status = 'waiting' WHERE id = ?", roomId)
  return jsonOk('Room enabled')
}

// ── POST /admin/coin_compensate ── Grant 10000 coins to all old users who didn't get signup bonus ──

async function handleCoinCompensate(db, admin) {
  const now = new Date().toISOString()
  const bonus = 10000

  // Find users who haven't received the signup bonus
  const users = await dbAll(db,
    "SELECT user_id FROM users WHERE signup_bonus_given = 0 OR signup_bonus_given IS NULL"
  )

  if (users.length === 0) {
    return jsonOk('无需补偿，所有用户已领取', { count: 0, total_coins: 0 })
  }

  let compensated = 0
  for (const u of users) {
    // Ensure coin_accounts row exists
    let account = await dbGet(db, 'SELECT balance, total_earned FROM coin_accounts WHERE user_id = ?', u.user_id)
    if (!account) {
      await dbRun(db,
        'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
        u.user_id, bonus, bonus, now, now
      )
    } else {
      const newBalance = account.balance + bonus
      const newEarned = account.total_earned + bonus
      await dbRun(db,
        'UPDATE coin_accounts SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?',
        newBalance, newEarned, now, u.user_id
      )
    }

    // Record transaction
    await dbRun(db,
      'INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      uuid(), u.user_id, bonus, 'earn', 'admin_compensate', '老用户补偿10000虚拟币',
      (account?.balance || 0) + bonus, now
    )

    // Mark as compensated
    await dbRun(db, 'UPDATE users SET signup_bonus_given = 1 WHERE user_id = ?', u.user_id)
    compensated++
  }

  return jsonOk('补偿完成', { count: compensated, total_coins: compensated * bonus })
}
