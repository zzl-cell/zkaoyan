/**
 * Pages Function: Badge module catch-all route
 * Handles all /api/v1/badge/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 * Depends on tables: badges, user_badges, study_records, sign_logs, follows, comments, interactions
 */
import {
  extractUser, jsonOk, jsonBad, jsonUnauthorized,
  uuid, dbRun, dbGet, dbAll,
} from '../_utils'

// ── Badge seed data (4 lines x 3 levels = 12 badges) ──

const badgeSeed = [
  // Question count line
  { badge_id: 'badge_q_1', name: '初出茅庐', type: 'question_count', level: 1, icon: 'seedling', description: '完成第1次刷题', unlock_condition: { type: 'question_count', threshold: 1 }, next_badge_id: 'badge_q_2', sort_order: 1 },
  { badge_id: 'badge_q_2', name: '百题斩', type: 'question_count', level: 2, icon: 'book', description: '累计刷题≥100题', unlock_condition: { type: 'question_count', threshold: 100 }, next_badge_id: 'badge_q_3', sort_order: 2 },
  { badge_id: 'badge_q_3', name: '千题王', type: 'question_count', level: 3, icon: 'crown', description: '累计刷题≥1000题', unlock_condition: { type: 'question_count', threshold: 1000 }, next_badge_id: null, sort_order: 3 },

  // Streak line
  { badge_id: 'badge_s_1', name: '初来乍到', type: 'streak', level: 1, icon: 'calendar-o', description: '连续签到≥3天', unlock_condition: { type: 'streak', threshold: 3 }, next_badge_id: 'badge_s_2', sort_order: 4 },
  { badge_id: 'badge_s_2', name: '签到达人', type: 'streak', level: 2, icon: 'fire-o', description: '连续签到≥7天', unlock_condition: { type: 'streak', threshold: 7 }, next_badge_id: 'badge_s_3', sort_order: 5 },
  { badge_id: 'badge_s_3', name: '全勤王者', type: 'streak', level: 3, icon: 'diamond-o', description: '连续签到≥30天', unlock_condition: { type: 'streak', threshold: 30 }, next_badge_id: null, sort_order: 6 },

  // Accuracy line
  { badge_id: 'badge_a_1', name: '小有所成', type: 'accuracy', level: 1, icon: 'star-o', description: '正确率≥60%且刷题≥50题', unlock_condition: { type: 'accuracy', accuracy_threshold: 60, question_threshold: 50 }, next_badge_id: 'badge_a_2', sort_order: 7 },
  { badge_id: 'badge_a_2', name: '学霸', type: 'accuracy', level: 2, icon: 'medal-o', description: '正确率≥80%且刷题≥200题', unlock_condition: { type: 'accuracy', accuracy_threshold: 80, question_threshold: 200 }, next_badge_id: 'badge_a_3', sort_order: 8 },
  { badge_id: 'badge_a_3', name: '学神', type: 'accuracy', level: 3, icon: 'gem-o', description: '正确率≥90%且刷题≥500题', unlock_condition: { type: 'accuracy', accuracy_threshold: 90, question_threshold: 500 }, next_badge_id: null, sort_order: 9 },

  // Social line
  { badge_id: 'badge_sc_1', name: '乐于助人', type: 'social', level: 1, icon: 'chat-o', description: '累计评论/回复≥10次', unlock_condition: { type: 'social', metric: 'comment_count', threshold: 10 }, next_badge_id: 'badge_sc_2', sort_order: 10 },
  { badge_id: 'badge_sc_2', name: '社区明星', type: 'social', level: 2, icon: 'good-job-o', description: '累计获得点赞≥100次', unlock_condition: { type: 'social', metric: 'like_received', threshold: 100 }, next_badge_id: 'badge_sc_3', sort_order: 11 },
  { badge_id: 'badge_sc_3', name: '意见领袖', type: 'social', level: 3, icon: 'bullhorn-o', description: '累计粉丝≥500人', unlock_condition: { type: 'social', metric: 'follower_count', threshold: 500 }, next_badge_id: null, sort_order: 12 },
]

// ── Main handler ──

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const method = request.method
  const segments = url.pathname.replace(/^\/api\/v1\/badge\//, '').split('/').filter(Boolean)
  const db = env.DB

  if (!db) return jsonBad('Database not configured')

  try {
    // GET routes
    if (method === 'GET') {
      if (segments[0] === 'list') return await handleList(db, request, env)
      if (segments[0] === 'my') return await handleMy(db, request, env)
      if (segments[0] === 'progress') return await handleProgress(db, request, env)
      return jsonBad(`Unknown route: GET ${segments.join('/')}`)
    }

    // POST routes
    if (method === 'POST') {
      let body = {}
      try { body = await request.json() } catch {}

      if (segments[0] === 'check') return await handleCheck(db, request, env)
      if (segments[0] === 'wear') return await handleWear(db, request, env, body)
      if (segments[0] === 'unwear') return await handleUnwear(db, request, env, body)
      return jsonBad(`Unknown route: POST ${segments.join('/')}`)
    }

    return jsonBad('Method not allowed')
  } catch (err) {
    console.error('[badge] Error:', err)
    return jsonBad(err.message || 'Internal server error')
  }
}

// ── GET /badge/list ── All badge definitions merged with user unlock status ──

async function handleList(db, request, env) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const earned = await dbAll(
    db,
    'SELECT badge_id, is_wearing, unlocked_at FROM user_badges WHERE user_id = ?',
    user.user_id
  )
  const earnedMap = Object.fromEntries(earned.map(b => [b.badge_id, b]))

  const badges = badgeSeed.map(b => ({
    badge_id: b.badge_id,
    name: b.name,
    type: b.type,
    level: b.level,
    icon: b.icon,
    description: b.description,
    next_badge_id: b.next_badge_id,
    sort_order: b.sort_order,
    is_unlocked: !!earnedMap[b.badge_id],
    is_wearing: earnedMap[b.badge_id]?.is_wearing === 1,
    unlocked_at: earnedMap[b.badge_id]?.unlocked_at || null,
  }))

  return jsonOk('success', { badges, total: badges.length })
}

// ── GET /badge/my ── User's earned badges only ──

async function handleMy(db, request, env) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const earned = await dbAll(
    db,
    'SELECT badge_id, is_wearing, unlocked_at FROM user_badges WHERE user_id = ?',
    user.user_id
  )

  const badgeMap = Object.fromEntries(badgeSeed.map(b => [b.badge_id, b]))
  const badges = earned.map(e => ({
    ...badgeMap[e.badge_id],
    unlock_condition: undefined,
    is_unlocked: true,
    is_wearing: e.is_wearing === 1,
    unlocked_at: e.unlocked_at,
  }))

  return jsonOk('success', { badges, total: badges.length })
}

// ── GET /badge/progress ── Unlock progress for each badge line ──

async function handleProgress(db, request, env) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const stats = await getUserStats(db, user.user_id)
  const earned = await dbAll(
    db,
    'SELECT badge_id FROM user_badges WHERE user_id = ?',
    user.user_id
  )
  const earnedIds = new Set(earned.map(b => b.badge_id))

  const progress = badgeSeed.map(badge => {
    if (earnedIds.has(badge.badge_id)) {
      return { badge_id: badge.badge_id, name: badge.name, type: badge.type, level: badge.level, progress: 100, unlocked: true }
    }
    const { percent } = calcProgress(badge, stats)
    return { badge_id: badge.badge_id, name: badge.name, type: badge.type, level: badge.level, progress: percent, unlocked: false }
  })

  return jsonOk('success', { progress })
}

// ── POST /badge/check ── Check & auto-claim newly qualified badges ──

async function handleCheck(db, request, env) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const earned = await dbAll(
    db,
    'SELECT badge_id FROM user_badges WHERE user_id = ?',
    user.user_id
  )
  const earnedIds = new Set(earned.map(b => b.badge_id))

  const stats = await getUserStats(db, user.user_id)
  const newBadges = []
  const now = new Date().toISOString()

  for (const badge of badgeSeed) {
    if (earnedIds.has(badge.badge_id)) continue

    const { qualified } = calcProgress(badge, stats)
    if (qualified) {
      await dbRun(
        db,
        'INSERT INTO user_badges (user_badge_id, user_id, badge_id, is_wearing, unlocked_at) VALUES (?, ?, ?, 0, ?)',
        uuid(), user.user_id, badge.badge_id, now
      )
      newBadges.push({ badge_id: badge.badge_id, name: badge.name, icon: badge.icon })
    }
  }

  return jsonOk('success', { new_badges: newBadges, new_count: newBadges.length })
}

// ── POST /badge/wear ── Wear a badge (unwears all others first) ──

async function handleWear(db, request, env, body) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const { badge_id } = body
  if (!badge_id) return jsonBad('缺少勋章ID')

  // Verify user owns this badge
  const owned = await dbGet(
    db,
    'SELECT user_badge_id FROM user_badges WHERE user_id = ? AND badge_id = ?',
    user.user_id, badge_id
  )
  if (!owned) return jsonBad('未获得该勋章')

  // Unwear all, then wear target (atomic via D1 batch)
  await db.batch(db, [
    db.prepare('UPDATE user_badges SET is_wearing = 0 WHERE user_id = ?').bind(user.user_id),
    db.prepare('UPDATE user_badges SET is_wearing = 1 WHERE user_id = ? AND badge_id = ?').bind(user.user_id, badge_id),
  ])

  return jsonOk('佩戴成功')
}

// ── POST /badge/unwear ── Unwear a badge ──

async function handleUnwear(db, request, env, body) {
  const user = await extractUser(request, env)
  if (!user) return jsonUnauthorized('请先登录')

  const { badge_id } = body
  if (!badge_id) return jsonBad('缺少勋章ID')

  await dbRun(
    db,
    'UPDATE user_badges SET is_wearing = 0 WHERE user_id = ? AND badge_id = ?',
    user.user_id, badge_id
  )

  return jsonOk('已取消佩戴')
}

// ── Helper: gather user stats for badge condition checks ──

async function getUserStats(db, userId) {
  // Practice stats from study_records
  const studyRow = await dbGet(
    db,
    'SELECT COALESCE(SUM(question_count), 0) AS total_questions, COALESCE(SUM(correct_count), 0) AS total_correct FROM study_records WHERE user_id = ?',
    userId
  )
  const totalQuestions = studyRow?.total_questions || 0
  const totalCorrect = studyRow?.total_correct || 0
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  // Streak from sign_logs (count consecutive days ending today, UTC+8)
  let streakDays = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = new Date(checkDate.getTime() + 8 * 3600000).toISOString().split('T')[0]
    const log = await dbGet(db, 'SELECT id FROM sign_logs WHERE user_id = ? AND date = ?', userId, dateStr)
    if (log) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Social stats
  const commentRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM comments WHERE user_id = ?', userId)
  const likeRow = await dbGet(
    db,
    "SELECT COUNT(*) AS cnt FROM interactions WHERE target_id = ? AND action_type = 'like'",
    userId
  )
  const followerRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE followee_id = ?', userId)

  return {
    totalQuestions,
    totalCorrect,
    accuracy,
    streakDays,
    commentCount: commentRow?.cnt || 0,
    likeReceived: likeRow?.cnt || 0,
    followerCount: followerRow?.cnt || 0,
  }
}

// ── Helper: calculate badge progress & qualification ──

function calcProgress(badge, stats) {
  const cond = badge.unlock_condition
  let percent = 0
  let qualified = false

  switch (cond.type) {
    case 'question_count':
      percent = Math.min(100, Math.round((stats.totalQuestions / cond.threshold) * 100))
      qualified = stats.totalQuestions >= cond.threshold
      break
    case 'streak':
      percent = Math.min(100, Math.round((stats.streakDays / cond.threshold) * 100))
      qualified = stats.streakDays >= cond.threshold
      break
    case 'accuracy': {
      const accPct = Math.min(100, Math.round((stats.accuracy / cond.accuracy_threshold) * 100))
      const qPct = Math.min(100, Math.round((stats.totalQuestions / cond.question_threshold) * 100))
      percent = Math.min(accPct, qPct)
      qualified = stats.accuracy >= cond.accuracy_threshold && stats.totalQuestions >= cond.question_threshold
      break
    }
    case 'social': {
      const val = stats[cond.metric] || 0
      percent = Math.min(100, Math.round((val / cond.threshold) * 100))
      qualified = val >= cond.threshold
      break
    }
  }

  return { percent, qualified }
}
