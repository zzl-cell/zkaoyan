/**
 * Pages Function: User API catch-all route
 * Handles all /api/v1/user/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 */
import {
  hashPassword, verifyPassword, generateToken, extractUser,
  jsonOk, jsonBad, jsonUnauthorized, uuid, verifySmsCode, dbRun, dbGet, dbAll,
} from '../_utils'

const MOCK_CODE = '6666'

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB
  const url = new URL(request.url)
  const segments = url.pathname.replace(/^\/api\/v1\/user\//, '').split('/').filter(Boolean)
  const action = segments.join('/')
  const method = request.method

  // GET routes
  if (method === 'GET') {
    const routes = {
      'profile': () => handleGetProfile(db, request, env),
    }
    // Dynamic: /user/{userId}/profile, /user/{userId}/following, /user/{userId}/followers
    if (segments.length === 2 && segments[1] === 'profile') {
      return handleGetOtherProfile(db, request, env, segments[0])
    }
    if (segments.length === 2 && segments[1] === 'following') {
      return handleFollowingList(db, request, env, segments[0], url)
    }
    if (segments.length === 2 && segments[1] === 'followers') {
      return handleFollowersList(db, request, env, segments[0], url)
    }
    if (routes[action]) return routes[action]()
    return new Response('Method Not Allowed', { status: 405 })
  }

  // PUT routes
  if (method === 'PUT') {
    let body = {}
    try { body = await request.json() } catch {}
    const routes = {
      'profile': () => handleUpdateProfile(db, request, env, body),
      'privacy': () => handleUpdatePrivacy(db, request, env, body),
      'interests': () => handleUpdateInterests(db, request, env, body),
      'interest-mode': () => handleInterestModeSwitch(db, request, env, body),
    }
    if (routes[action]) return routes[action]()
    return new Response('Method Not Allowed', { status: 405 })
  }

  // POST routes
  if (method === 'POST') {
    let body = {}
    try { body = await request.json() } catch {}
    const routes = {
      'sms/send': () => handleSmsSend(db, env, body),
      'register': () => handleRegister(db, env, body),
      'login/password': () => handleLoginPassword(db, env, body),
      'login/sms': () => handleLoginSms(db, env, body),
      'password/reset': () => handlePasswordReset(db, env, body),
      'logout': () => jsonOk('已退出登录'),
      'privacy/toggle': () => handlePrivacyToggle(db, request, env),
      'feedback': () => handleFeedback(db, request, env, body),
    }
    if (action.startsWith('follow/')) {
      return handleFollow(db, request, env, segments[1])
    }
    if (routes[action]) return routes[action]()
    return jsonBad(`Unknown action: ${action}`)
  }

  // DELETE routes
  if (method === 'DELETE') {
    if (action.startsWith('follow/')) {
      return handleUnfollow(db, request, env, segments[1])
    }
    return new Response('Method Not Allowed', { status: 405 })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

// ── Auth ──

async function handleSmsSend(db, env, { phone }) {
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return jsonBad('手机号格式不正确')
  return jsonOk('验证码已发送', { code: MOCK_CODE })
}

async function handleRegister(db, env, { phone, code, password }) {
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return jsonBad('手机号格式不正确')
  if (!code) return jsonBad('请输入验证码')
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return jsonBad('密码需8位以上，包含数字和字母')
  }
  if (!verifySmsCode(code, env)) return jsonBad('验证码无效或已过期')

  const existing = await dbGet(db, 'SELECT user_id FROM users WHERE phone = ?', phone)
  if (existing) return jsonBad('该手机号已注册')

  const userId = uuid()
  const now = new Date().toISOString()
  const passwordHash = await hashPassword(password)
  const privacy = JSON.stringify({
    totalQuestions: '公开', accuracy: '公开', studyTime: '仅自己',
    streak: '仅自己', mockRank: '公开', dynamicList: '公开',
    badgeWall: '公开', followers: '公开', following: '公开', correctionRank: '公开',
  })

  await dbRun(db,
    `INSERT INTO users (user_id, phone, nickname, avatar, bio, password_hash, privacy_settings, signup_bonus_given, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    userId, phone, `用户${phone.slice(-4)}`, '', '', passwordHash, privacy, now, now,
  )

  // Create coin account with 10000 register bonus
  const bonus = 10000
  await dbRun(db,
    'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    userId, bonus, bonus, now, now,
  )
  await dbRun(db,
    'INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(), userId, bonus, 'earn', 'register_bonus', '注册赠送10000虚拟币', bonus, now,
  )

  const token = await generateToken({ user_id: userId, phone }, env)
  return jsonOk('注册成功', {
    token,
    user: { user_id: userId, nickname: `用户${phone.slice(-4)}`, avatar: '', phone },
  })
}

async function handleLoginPassword(db, env, { phone, password }) {
  if (!phone || !password) return jsonBad('请输入手机号和密码')
  const user = await dbGet(db, 'SELECT * FROM users WHERE phone = ?', phone)
  if (!user) return jsonUnauthorized('手机号或密码错误')
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return jsonUnauthorized('手机号或密码错误')

  await dbRun(db, 'UPDATE users SET last_login_at = ? WHERE user_id = ?', new Date().toISOString(), user.user_id)
  const token = await generateToken({ user_id: user.user_id, phone }, env)
  return jsonOk('登录成功', {
    token,
    user: { user_id: user.user_id, nickname: user.nickname, avatar: user.avatar, phone, role: user.role || 'user' },
  })
}

async function handleLoginSms(db, env, { phone, code }) {
  if (!phone || !code) return jsonBad('请输入手机号和验证码')
  if (!verifySmsCode(code, env)) return jsonBad('验证码无效或已过期')
  const user = await dbGet(db, 'SELECT * FROM users WHERE phone = ?', phone)
  if (!user) return jsonUnauthorized('该手机号未注册')

  await dbRun(db, 'UPDATE users SET last_login_at = ? WHERE user_id = ?', new Date().toISOString(), user.user_id)
  const token = await generateToken({ user_id: user.user_id, phone }, env)
  return jsonOk('登录成功', {
    token,
    user: { user_id: user.user_id, nickname: user.nickname, avatar: user.avatar, phone, role: user.role || 'user' },
  })
}

async function handlePasswordReset(db, env, { phone, code, new_password }) {
  if (!phone || !code || !new_password) return jsonBad('请填写完整信息')
  if (new_password.length < 8 || !/[a-zA-Z]/.test(new_password) || !/\d/.test(new_password)) {
    return jsonBad('密码需8位以上，包含数字和字母')
  }
  if (!verifySmsCode(code, env)) return jsonBad('验证码无效或已过期')
  const user = await dbGet(db, 'SELECT user_id FROM users WHERE phone = ?', phone)
  if (!user) return jsonBad('该手机号未注册')

  const passwordHash = await hashPassword(new_password)
  await dbRun(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?',
    passwordHash, new Date().toISOString(), user.user_id)
  return jsonOk('密码重置成功')
}

// ── Profile ──

async function handleGetProfile(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const user = await dbGet(db,
    'SELECT user_id, phone, nickname, avatar, bio, grade, exam_goals, interest_tags, is_private, privacy_settings, role, created_at FROM users WHERE user_id = ?',
    payload.user_id,
  )
  if (!user) return jsonBad('用户不存在')

  // Real counts
  const [followingRow, followersRow, coinRow, studyRow, likesRow] = await Promise.all([
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = ?', payload.user_id),
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE followee_id = ?', payload.user_id),
    dbGet(db, 'SELECT balance FROM coin_accounts WHERE user_id = ?', payload.user_id),
    dbGet(db, 'SELECT COALESCE(SUM(question_count),0) AS total, COALESCE(SUM(correct_count),0) AS correct FROM study_records WHERE user_id = ?', payload.user_id),
    dbGet(db, 'SELECT COALESCE(SUM(like_count),0) AS cnt FROM posts WHERE user_id = ? AND status = ?', payload.user_id, 'normal'),
  ])

  const totalQ = studyRow?.total || 0
  const totalC = studyRow?.correct || 0

  return jsonOk('success', {
    ...user,
    privacy_settings: safeJson(user.privacy_settings, {}),
    exam_goals: safeJson(user.exam_goals, []),
    interest_tags: safeJson(user.interest_tags, []),
    is_private: !!user.is_private,
    coin_balance: coinRow?.balance ?? 0,
    following_count: followingRow?.cnt || 0,
    followers_count: followersRow?.cnt || 0,
    like_count: likesRow?.cnt || 0,
    total_questions: totalQ,
    accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
  })
}

async function handleGetOtherProfile(db, request, env, targetUserId) {
  const payload = await extractUser(request, env)
  const currentUser = payload

  const target = await dbGet(db,
    'SELECT user_id, nickname, avatar, bio, grade, is_private, privacy_settings FROM users WHERE user_id = ?',
    targetUserId,
  )
  if (!target) return jsonBad('用户不存在')

  const isSelf = currentUser?.user_id === targetUserId
  let isFollower = false
  if (currentUser && !isSelf) {
    const followDoc = await dbGet(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', currentUser.user_id, targetUserId)
    isFollower = !!followDoc
  }

  if (target.is_private && !isSelf && !isFollower) {
    return jsonOk('success', {
      user_id: target.user_id, nickname: target.nickname, avatar: target.avatar,
      is_private: true, total_questions: null, accuracy: null,
      following_count: null, followers_count: null,
    })
  }

  const privacy = safeJson(target.privacy_settings, {})
  const [followingRow, followersRow, studyRow, likesRow] = await Promise.all([
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = ?', targetUserId),
    dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE followee_id = ?', targetUserId),
    dbGet(db, 'SELECT COALESCE(SUM(question_count),0) AS total, COALESCE(SUM(correct_count),0) AS correct FROM study_records WHERE user_id = ?', targetUserId),
    dbGet(db, 'SELECT COALESCE(SUM(like_count),0) AS cnt FROM posts WHERE user_id = ? AND status = ?', targetUserId, 'normal'),
  ])

  const totalQ = studyRow?.total || 0
  const totalC = studyRow?.correct || 0
  const result = {
    user_id: target.user_id, nickname: target.nickname, avatar: target.avatar,
    bio: target.bio, grade: target.grade, is_private: !!target.is_private,
    total_questions: (privacy.totalQuestions === '公开' || isSelf) ? totalQ : null,
    accuracy: (privacy.accuracy === '公开' || isSelf) ? (totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0) : null,
    following_count: (privacy.following === '公开' || isSelf) ? (followingRow?.cnt || 0) : null,
    followers_count: (privacy.followers === '公开' || isSelf) ? (followersRow?.cnt || 0) : null,
    like_count: (likesRow?.cnt || 0),
  }

  if (currentUser && !isSelf) {
    const reverse = await dbGet(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', targetUserId, currentUser.user_id)
    result.is_following = isFollower
    result.is_followed_by = !!reverse
    result.is_mutual = isFollower && !!reverse
  }

  return jsonOk('success', result)
}

async function handleUpdateProfile(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const { nickname, avatar, bio, grade, exam_goals } = body
  const sets = ['updated_at = ?']
  const params = [new Date().toISOString()]

  if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname) }
  if (avatar !== undefined) { sets.push('avatar = ?'); params.push(avatar) }
  if (bio !== undefined) { sets.push('bio = ?'); params.push(bio) }
  if (grade !== undefined) { sets.push('grade = ?'); params.push(grade) }
  if (exam_goals !== undefined) { sets.push('exam_goals = ?'); params.push(JSON.stringify(exam_goals)) }

  params.push(payload.user_id)
  await dbRun(db, `UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, ...params)
  return jsonOk('资料更新成功')
}

async function handleUpdatePrivacy(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const { settings } = body
  if (!settings || typeof settings !== 'object') return jsonBad('无效的设置数据')

  const user = await dbGet(db, 'SELECT privacy_settings FROM users WHERE user_id = ?', payload.user_id)
  const current = safeJson(user.privacy_settings, {})
  const merged = { ...current, ...settings }

  await dbRun(db, 'UPDATE users SET privacy_settings = ?, updated_at = ? WHERE user_id = ?',
    JSON.stringify(merged), new Date().toISOString(), payload.user_id)
  return jsonOk('隐私设置已更新')
}

async function handleUpdateInterests(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')
  const { interest_tags } = body
  if (!Array.isArray(interest_tags)) return jsonBad('interest_tags 必须是数组')
  await dbRun(db, 'UPDATE users SET interest_tags = ?, updated_at = ? WHERE user_id = ?',
    JSON.stringify(interest_tags), new Date().toISOString(), payload.user_id)
  return jsonOk('兴趣标签更新成功')
}

async function handleInterestModeSwitch(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')
  const { mode } = body
  if (!['auto', 'manual'].includes(mode)) return jsonBad('模式必须是 auto 或 manual')
  await dbRun(db, 'UPDATE users SET interest_mode = ?, updated_at = ? WHERE user_id = ?',
    mode, new Date().toISOString(), payload.user_id)
  return jsonOk(`已切换为${mode === 'auto' ? '自动' : '手动'}模式`)
}

async function handlePrivacyToggle(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')
  const user = await dbGet(db, 'SELECT is_private FROM users WHERE user_id = ?', payload.user_id)
  const newState = user.is_private ? 0 : 1
  await dbRun(db, 'UPDATE users SET is_private = ?, updated_at = ? WHERE user_id = ?',
    newState, new Date().toISOString(), payload.user_id)
  return jsonOk(`私密模式已${newState ? '开启' : '关闭'}`)
}

// ── Follow ──

async function handleFollow(db, request, env, targetUserId) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')
  if (targetUserId === payload.user_id) return jsonBad('不能关注自己')

  const target = await dbGet(db, 'SELECT user_id, nickname FROM users WHERE user_id = ?', targetUserId)
  if (!target) return jsonBad('用户不存在')

  const existing = await dbGet(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', payload.user_id, targetUserId)
  if (existing) return jsonBad('已关注该用户')

  const now = new Date().toISOString()
  await dbRun(db, 'INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)',
    payload.user_id, targetUserId, now)

  // Create notification for the target user
  const currentUser = await dbGet(db, 'SELECT nickname FROM users WHERE user_id = ?', payload.user_id)
  await dbRun(db,
    'INSERT INTO notifications (notification_id, user_id, type, sub_type, title, content, source_type, source_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(), targetUserId, 'follow', 'new_follower', '新粉丝',
    `${currentUser?.nickname || '用户'}关注了你`, 'user', payload.user_id, 0, now)

  return jsonOk('关注成功')
}

async function handleUnfollow(db, request, env, targetUserId) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  await dbRun(db, 'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', payload.user_id, targetUserId)
  return jsonOk('已取消关注')
}

async function handleFollowingList(db, request, env, userId, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = ?', userId)
  const rows = await dbAll(db,
    `SELECT f.followee_id AS user_id, f.created_at AS followed_at, u.nickname, u.avatar, u.bio
     FROM follows f JOIN users u ON f.followee_id = u.user_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    userId, pageSize, offset)

  return jsonOk('success', { list: rows, total: totalRow?.cnt || 0, page, page_size: pageSize })
}

async function handleFollowersList(db, request, env, userId, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM follows WHERE followee_id = ?', userId)
  const rows = await dbAll(db,
    `SELECT f.follower_id AS user_id, f.created_at AS followed_at, u.nickname, u.avatar, u.bio
     FROM follows f JOIN users u ON f.follower_id = u.user_id
     WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    userId, pageSize, offset)

  // If current user is logged in, mark which followers they are following back
  const payload = await extractUser(request, env)
  if (payload) {
    for (const row of rows) {
      const reverse = await dbGet(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', payload.user_id, row.user_id)
      row.is_following = !!reverse
    }
  }

  return jsonOk('success', { list: rows, total: totalRow?.cnt || 0, page, page_size: pageSize })
}

// ── Feedback ──

async function handleFeedback(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const { content, images, contact } = body
  if (!content || !content.trim()) return jsonBad('请输入反馈内容')

  const feedbackId = uuid()
  const now = new Date().toISOString()

  await dbRun(db,
    `INSERT INTO feedbacks (feedback_id, user_id, title, content, type, contact, images, status, reward_coins, replies, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'feedback', ?, ?, 'pending', 0, '[]', ?, ?)`,
    feedbackId, payload.user_id,
    content.trim().slice(0, 50),
    content.trim(),
    contact || '',
    JSON.stringify(images || []),
    now, now
  )

  return jsonOk('提交成功', { feedback_id: feedbackId })
}

// ── Helpers ──

function safeJson(val, fallback) {
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return val ?? fallback
}
