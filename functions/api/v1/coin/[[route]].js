/**
 * Pages Function: Coin API catch-all route
 * Handles all /api/v1/coin/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 */
import {
  extractUser, jsonOk, jsonBad, jsonUnauthorized, uuid, dbRun, dbGet, dbAll,
} from '../_utils'

// ── Hardcoded recharge plans ──

const RECHARGE_PLANS = [
  { plan_id: 'r1', rmb: 6,   coin: 60,   tag: '' },
  { plan_id: 'r2', rmb: 18,  coin: 180,  tag: '热卖' },
  { plan_id: 'r3', rmb: 30,  coin: 300,  tag: '' },
  { plan_id: 'r4', rmb: 68,  coin: 680,  tag: '超值' },
  { plan_id: 'r5', rmb: 128, coin: 1280, tag: '' },
  { plan_id: 'r6', rmb: 328, coin: 3280, tag: '至尊' },
]

// ── Entry point ──

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB
  const url = new URL(request.url)
  const segments = url.pathname.replace(/^\/api\/v1\/coin\//, '').split('/').filter(Boolean)
  const action = segments.join('/')
  const method = request.method

  // GET routes (no body parsing)
  if (method === 'GET') {
    const routes = {
      'sign/status':   () => handleSignStatus(db, request, env),
      'sign/logs':     () => handleSignLogs(db, request, env),
      'balance':       () => handleBalance(db, request, env),
      'transactions':  () => handleTransactions(db, request, env),
      'prob-log':      () => handleProbLog(db, request, env),
      'recharge/plans': () => handleRechargePlans(),
    }
    if (routes[action]) return routes[action]()
    return jsonBad('Unknown route')
  }

  // POST routes
  if (method === 'POST') {
    let body = {}
    try { body = await request.json() } catch {}
    const routes = {
      'sign':           () => handleSign(db, request, env),
      'recharge/create': () => handleRechargeCreate(db, request, env, body),
    }
    if (routes[action]) return routes[action]()
    return jsonBad('Unknown route')
  }

  return jsonBad('Unknown route')
}

// ── Sign-in ──

async function handleSign(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Check if already signed today
  const existing = await dbGet(db, 'SELECT * FROM sign_logs WHERE user_id = ? AND date = ?', userId, today)
  if (existing) return jsonBad('今日已签到')

  // Get last sign log to determine streak
  const lastSign = await dbGet(db, 'SELECT * FROM sign_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1', userId)
  const streakDays = (lastSign && lastSign.date === yesterday) ? lastSign.streak_days + 1 : 1

  // Fixed reward
  let fixedReward
  if (streakDays <= 7) {
    fixedReward = streakDays
  } else if (streakDays <= 14) {
    fixedReward = 8
  } else {
    fixedReward = 10
  }

  // Prob reward (streak >= 15 and streak % 3 === 0)
  let probReward = null
  let probRange = null
  if (streakDays >= 15 && streakDays % 3 === 0) {
    const rand = Math.random()
    if (rand < 0.5) {
      probRange = '20-50'
      probReward = Math.floor(Math.random() * 31) + 20  // 20..50
    } else if (rand < 0.85) {
      probRange = '50-80'
      probReward = Math.floor(Math.random() * 31) + 50  // 50..80
    } else {
      probRange = '80-100'
      probReward = Math.floor(Math.random() * 21) + 80  // 80..100
    }
  }

  const totalReward = fixedReward + (probReward || 0)
  const now = new Date().toISOString()
  const transactionId = uuid()

  // Ensure coin_accounts row exists, then update
  let account = await dbGet(db, 'SELECT * FROM coin_accounts WHERE user_id = ?', userId)
  if (!account) {
    await dbRun(db,
      'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
      userId, now, now,
    )
    account = { balance: 0, total_earned: 0, total_spent: 0 }
  }

  const newBalance = account.balance + totalReward
  const newTotalEarned = account.total_earned + totalReward

  await dbRun(db,
    'UPDATE coin_accounts SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?',
    newBalance, newTotalEarned, now, userId,
  )

  // Insert sign log
  await dbRun(db,
    'INSERT INTO sign_logs (user_id, date, streak_days, fixed_reward, prob_reward, prob_range, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, today, streakDays, fixedReward, probReward, probRange, now,
  )

  // Insert coin transaction
  await dbRun(db,
    'INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    transactionId, userId, totalReward, 'earn', 'sign', `签到奖励（连续${streakDays}天）`, newBalance, now,
  )

  return jsonOk('签到成功', {
    streak_days: streakDays,
    fixed_reward: fixedReward,
    prob_reward: probReward,
    prob_range: probRange,
    total_reward: totalReward,
    balance: newBalance,
  })
}

// ── Sign status ──

async function handleSignStatus(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  const today = new Date().toISOString().slice(0, 10)

  // Check if signed today
  const todayLog = await dbGet(db, 'SELECT * FROM sign_logs WHERE user_id = ? AND date = ?', userId, today)
  const signedToday = !!todayLog

  // Current streak
  const lastSign = await dbGet(db, 'SELECT * FROM sign_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1', userId)
  const streakDays = lastSign ? lastSign.streak_days : 0

  // Last 7 signed dates
  const recentLogs = await dbAll(db,
    'SELECT date FROM sign_logs WHERE user_id = ? ORDER BY date DESC LIMIT 7', userId,
  )
  const signedDates = recentLogs.map(r => r.date)

  return jsonOk('success', {
    signed_today: signedToday,
    streak_days: streakDays,
    signed_dates: signedDates,
  })
}

// ── Sign logs (paginated) ──

async function handleSignLogs(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM sign_logs WHERE user_id = ?', userId)
  const list = await dbAll(db,
    'SELECT * FROM sign_logs WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    userId, pageSize, offset,
  )

  return jsonOk('success', { list, total: totalRow.cnt })
}

// ── Balance ──

async function handleBalance(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  let account = await dbGet(db, 'SELECT balance, total_earned, total_spent FROM coin_accounts WHERE user_id = ?', userId)
  if (!account) {
    // Auto-create account with zero balance
    const now = new Date().toISOString()
    await dbRun(db,
      'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
      userId, now, now,
    )
    account = { balance: 0, total_earned: 0, total_spent: 0 }
  }

  return jsonOk('success', {
    balance: account.balance,
    total_earned: account.total_earned,
    total_spent: account.total_spent,
  })
}

// ── Transactions (paginated) ──

async function handleTransactions(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM coin_transactions WHERE user_id = ?', userId)
  const list = await dbAll(db,
    'SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    userId, pageSize, offset,
  )

  return jsonOk('success', { list, total: totalRow.cnt })
}

// ── Prob log ──

async function handleProbLog(db, request, env) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const userId = payload.user_id
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const totalRow = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM sign_logs WHERE user_id = ? AND prob_reward IS NOT NULL', userId)
  const list = await dbAll(db,
    'SELECT * FROM sign_logs WHERE user_id = ? AND prob_reward IS NOT NULL ORDER BY date DESC LIMIT ? OFFSET ?',
    userId, pageSize, offset,
  )

  return jsonOk('success', { list, total: totalRow.cnt })
}

// ── Recharge plans ──

function handleRechargePlans() {
  return jsonOk('success', { plans: RECHARGE_PLANS })
}

// ── Recharge create ──

async function handleRechargeCreate(db, request, env, body) {
  const payload = await extractUser(request, env)
  if (!payload) return jsonUnauthorized('请先登录')

  const { plan_id } = body
  if (!plan_id) return jsonBad('请选择充值方案')

  const plan = RECHARGE_PLANS.find(p => p.plan_id === plan_id)
  if (!plan) return jsonBad('充值方案不存在')

  const userId = payload.user_id
  const now = new Date().toISOString()
  const rechargeId = uuid()

  // Ensure coin_accounts row exists
  let account = await dbGet(db, 'SELECT * FROM coin_accounts WHERE user_id = ?', userId)
  if (!account) {
    await dbRun(db,
      'INSERT INTO coin_accounts (user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
      userId, now, now,
    )
    account = { balance: 0, total_earned: 0, total_spent: 0 }
  }

  // Create recharge order (simplified: immediately paid)
  await dbRun(db,
    'INSERT INTO coin_recharge_orders (recharge_id, user_id, plan_id, rmb, coin, status, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    rechargeId, userId, plan.plan_id, plan.rmb, plan.coin, 'paid', now, now,
  )

  // Credit the account
  const newBalance = account.balance + plan.coin
  const newTotalEarned = account.total_earned + plan.coin

  await dbRun(db,
    'UPDATE coin_accounts SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?',
    newBalance, newTotalEarned, now, userId,
  )

  // Record transaction
  const transactionId = uuid()
  await dbRun(db,
    'INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    transactionId, userId, plan.coin, 'earn', 'recharge', `充值${plan.rmb}元（${plan.coin}金币）`, newBalance, now,
  )

  return jsonOk('充值成功', {
    recharge_id: rechargeId,
    status: 'paid',
    amount_coin: plan.coin,
    balance: newBalance,
  })
}
