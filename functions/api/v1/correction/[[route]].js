/**
 * Pages Function: Correction API catch-all route
 * Handles all /api/v1/correction/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 * Depends on tables: corrections, questions, users, notifications, coin_accounts, coin_transactions
 */
import {
  extractUser, jsonOk, jsonBad, jsonUnauthorized,
  uuid, dbRun, dbGet, dbAll, requireAdmin,
} from '../_utils'

// ── Entry point ──

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB

  if (!db) return jsonBad('Database not configured')

  const url = new URL(request.url)
  const segments = url.pathname.replace(/^\/api\/v1\/correction\//, '').split('/').filter(Boolean)
  const action = segments[0] || ''
  const method = request.method

  try {
    // GET routes
    if (method === 'GET') {
      if (action === 'list') return await handleList(db, request, env, url)
      if (action === 'detail') return await handleDetail(db, request, env, url)
      if (action === 'leaderboard') return await handleLeaderboard(db, request, env, url)
      return jsonBad(`Unknown route: GET ${action}`)
    }

    // POST routes
    if (method === 'POST') {
      let body = {}
      try { body = await request.json() } catch {}

      if (action === 'submit') return await handleSubmit(db, request, env, body)
      if (action === 'approve') return await handleApprove(db, request, env, body)
      if (action === 'reject') return await handleReject(db, request, env, body)
      if (action === 'leaderboard/hide') return await handleLeaderboardHide(db, request, env)
      return jsonBad(`Unknown route: POST ${action}`)
    }

    return jsonBad('Method not allowed')
  } catch (err) {
    console.error(`[correction/${action}] Error:`, err)
    return jsonBad(err.message || 'Internal server error')
  }
}

// ── POST /correction/submit ── User submits a correction ──

async function handleSubmit(db, request, env, body) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const { question_id, content, suggested_fix } = body
  if (!content) return jsonBad('请描述错误内容')

  const now = new Date().toISOString()
  const correctionId = uuid()

  await dbRun(
    db,
    `INSERT INTO corrections (correction_id, user_id, question_id, content, suggested_fix, status, apply_to_question, reward_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, 0, ?, ?)`,
    correctionId, user.user_id, question_id || null, content, suggested_fix || '', now, now
  )

  return jsonOk('提交成功', { correction_id: correctionId })
}

// ── GET /correction/list ── Paginated list with optional status filter ──
// Regular users see only their own; admins see all

async function handleList(db, request, env, url) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const status = url.searchParams.get('status') || ''
  const offset = (page - 1) * pageSize

  // Check if admin
  let isAdmin = false
  try {
    await requireAdmin(db, user.user_id)
    isAdmin = true
  } catch {}

  const conditions = []
  const params = []

  if (!isAdmin) {
    conditions.push('c.user_id = ?')
    params.push(user.user_id)
  }

  if (status) {
    conditions.push('c.status = ?')
    params.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(
    db,
    `SELECT COUNT(*) AS total FROM corrections c ${where}`,
    ...params
  )
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT c.correction_id, c.user_id, c.question_id, c.content, c.suggested_fix,
            c.status, c.apply_to_question, c.review_comment, c.reviewer_id, c.reviewed_at,
            c.reward_amount, c.created_at, c.updated_at,
            u.nickname AS user_nickname, u.avatar AS user_avatar
     FROM corrections c
     LEFT JOIN users u ON c.user_id = u.user_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /correction/detail?id=xxx ── Single correction detail ──

async function handleDetail(db, request, env, url) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const correctionId = url.searchParams.get('id') || url.searchParams.get('correction_id')
  if (!correctionId) return jsonBad('缺少纠错ID')

  const correction = await dbGet(
    db,
    `SELECT c.*, u.nickname AS user_nickname, u.avatar AS user_avatar,
            q.stem AS question_stem, q.answer AS question_answer
     FROM corrections c
     LEFT JOIN users u ON c.user_id = u.user_id
     LEFT JOIN questions q ON c.question_id = q.question_id
     WHERE c.correction_id = ?`,
    correctionId
  )

  if (!correction) return jsonBad('纠错工单不存在')

  // Non-admin users can only view their own
  let isAdmin = false
  try {
    await requireAdmin(db, user.user_id)
    isAdmin = true
  } catch {}

  if (!isAdmin && correction.user_id !== user.user_id) {
    return jsonUnauthorized('无权查看')
  }

  return jsonOk('success', correction)
}

// ── GET /correction/leaderboard ── Public leaderboard ──

async function handleLeaderboard(db, request, env, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(
    db,
    "SELECT COUNT(DISTINCT user_id) AS cnt FROM corrections WHERE status = 'approved'"
  )
  const total = totalRow?.cnt || 0

  const rows = await dbAll(
    db,
    `SELECT c.user_id, SUM(c.reward_amount) AS total_reward, COUNT(*) AS correction_count
     FROM corrections c
     WHERE c.status = 'approved'
     GROUP BY c.user_id
     ORDER BY total_reward DESC
     LIMIT ? OFFSET ?`,
    pageSize, offset
  )

  const list = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const u = await dbGet(db, 'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?', r.user_id)
    list.push({
      rank: offset + i + 1,
      user: u || { user_id: r.user_id, nickname: '未知', avatar: '' },
      total_reward: r.total_reward,
      correction_count: r.correction_count,
    })
  }

  return jsonOk('success', { list, total })
}

// ── POST /correction/leaderboard/hide ── Hide user from leaderboard (placeholder) ──

async function handleLeaderboardHide(db, request, env) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')
  return jsonOk('已隐藏')
}

// ── POST /correction/approve ── Admin approves a correction ──

async function handleApprove(db, request, env, body) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const { correction_id, apply_to_question = 0, review_comment = '', reward_amount = 2000 } = body
  if (!correction_id) return jsonBad('缺少纠错ID')

  // Admin guard
  await requireAdmin(db, user.user_id)

  const now = new Date().toISOString()

  // Get the pending correction
  const correction = await dbGet(
    db,
    "SELECT * FROM corrections WHERE correction_id = ? AND status = 'pending'",
    correction_id
  )
  if (!correction) return jsonBad('纠错工单不存在或已处理')

  // Update correction status
  await dbRun(
    db,
    `UPDATE corrections SET status = 'approved', apply_to_question = ?, review_comment = ?,
     reviewer_id = ?, reviewed_at = ?, reward_amount = ?, updated_at = ?
     WHERE correction_id = ?`,
    apply_to_question ? 1 : 0, review_comment, user.user_id, now, reward_amount, now, correction_id
  )

  // If apply_to_question, sync suggested_fix to the question's answer
  if (apply_to_question && correction.question_id && correction.suggested_fix) {
    await dbRun(
      db,
      'UPDATE questions SET answer = ? WHERE question_id = ?',
      correction.suggested_fix, correction.question_id
    )
  }

  // Grant reward coins
  if (reward_amount > 0) {
    let account = await dbGet(db, 'SELECT * FROM coin_accounts WHERE user_id = ?', correction.user_id)
    if (!account) {
      await dbRun(
        db,
        'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
        correction.user_id, now, now
      )
      account = { balance: 0, total_earned: 0 }
    }

    const newBalance = account.balance + reward_amount
    const newTotalEarned = account.total_earned + reward_amount

    await dbRun(
      db,
      'UPDATE coin_accounts SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?',
      newBalance, newTotalEarned, now, correction.user_id
    )

    await dbRun(
      db,
      `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at)
       VALUES (?, ?, ?, 'earn', 'correction_reward', '纠错奖励', ?, ?)`,
      uuid(), correction.user_id, reward_amount, newBalance, now
    )
  }

  // Notify the submitter
  const notifId = uuid()
  const notifContent = `您的纠错（${correction.content.substring(0, 50)}）已通过审核${apply_to_question ? '，题目已同步修正' : ''}，获得 ${reward_amount} 币奖励`
  await dbRun(
    db,
    `INSERT INTO notifications (notification_id, user_id, type, sub_type, title, content, source_type, source_id, is_read, created_at)
     VALUES (?, ?, 'system', 'correction', '纠错审核通过', ?, 'correction', ?, 0, ?)`,
    notifId, correction.user_id, notifContent, correction_id, now
  )

  return jsonOk('审核通过', { reward_amount, apply_to_question })
}

// ── POST /correction/reject ── Admin rejects a correction ──

async function handleReject(db, request, env, body) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const { correction_id, review_comment = '' } = body
  if (!correction_id) return jsonBad('缺少纠错ID')

  // Admin guard
  await requireAdmin(db, user.user_id)

  const now = new Date().toISOString()

  // Get the pending correction
  const correction = await dbGet(
    db,
    "SELECT * FROM corrections WHERE correction_id = ? AND status = 'pending'",
    correction_id
  )
  if (!correction) return jsonBad('纠错工单不存在或已处理')

  // Update correction status
  await dbRun(
    db,
    `UPDATE corrections SET status = 'rejected', review_comment = ?,
     reviewer_id = ?, reviewed_at = ?, updated_at = ?
     WHERE correction_id = ?`,
    review_comment, user.user_id, now, now, correction_id
  )

  // Notify the submitter
  const notifId = uuid()
  const notifContent = `您的纠错（${correction.content.substring(0, 50)}）未通过审核${review_comment ? '：' + review_comment : ''}`
  await dbRun(
    db,
    `INSERT INTO notifications (notification_id, user_id, type, sub_type, title, content, source_type, source_id, is_read, created_at)
     VALUES (?, ?, 'system', 'correction', '纠错被驳回', ?, 'correction', ?, 0, ?)`,
    notifId, correction.user_id, notifContent, correction_id, now
  )

  return jsonOk('已驳回')
}
