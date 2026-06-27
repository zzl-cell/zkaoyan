/**
 * Pages Function: Third-party institution (tenant) API catch-all route
 * Handles all /api/v1/third/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 * Depends on tables: tenants, tenant_questions, questions, question_sync_logs, deposit_records, users
 */
import {
  hashPassword, verifyPassword, generateToken, extractUser,
  jsonOk, jsonBad, jsonUnauthorized, uuid, dbRun, dbGet, dbAll, requireAdmin,
} from '../_utils'

// ── Entry point ──

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB

  if (!db) return jsonBad('Database not configured')

  const url = new URL(request.url)
  const segments = url.pathname.replace(/^\/api\/v1\/third\//, '').split('/').filter(Boolean)
  const action = segments[0] || ''
  const method = request.method

  try {
    // ── Public routes (no auth) ──

    if (method === 'POST' && action === 'apply') {
      let body = {}
      try { body = await request.json() } catch {}
      return await handleApply(db, body)
    }

    if (method === 'POST' && action === 'login') {
      let body = {}
      try { body = await request.json() } catch {}
      return await handleLogin(db, env, body)
    }

    // ── Authenticated routes ──

    const user = await extractUser(request, env)
    if (!user) return jsonUnauthorized('请先登录')

    // GET routes
    if (method === 'GET') {
      if (action === 'list_questions') return await handleListQuestions(db, user, url)
      if (action === 'stats') return await handleStats(db, user, url)
      return jsonBad(`Unknown route: GET ${action}`)
    }

    // POST routes
    if (method === 'POST') {
      let body = {}
      try { body = await request.json() } catch {}

      if (action === 'audit') return await handleAudit(db, user, body)
      if (action === 'upload') return await handleUpload(db, user, body)
      if (action === 'sync_to_main') return await handleSyncToMain(db, user, body)
      if (action === 'withdraw') return await handleWithdraw()
      return jsonBad(`Unknown route: POST ${action}`)
    }

    return jsonBad('Method not allowed')
  } catch (err) {
    console.error(`[third/${action}] Error:`, err)
    return jsonBad(err.message || 'Internal server error')
  }
}

// ── POST /third/apply ── Public: institution applies to join ──

async function handleApply(db, body) {
  const { name, contact_name, contact_phone, password, description } = body
  if (!name || !contact_phone || !password) return jsonBad('请填写完整信息（机构名称、联系手机、密码）')

  // Check phone not already registered
  const existing = await dbGet(db, 'SELECT tenant_id FROM tenants WHERE contact_phone = ?', contact_phone)
  if (existing) return jsonBad('该手机号已注册')

  const now = new Date().toISOString()
  const tenantId = uuid()
  const passwordHash = await hashPassword(password)

  await dbRun(
    db,
    `INSERT INTO tenants (tenant_id, name, contact_name, contact_phone, password_hash, description, status, deposit_balance, coin_balance, commission_rate, settlement_cycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0, 6, 'T+3', ?, ?)`,
    tenantId, name, contact_name || '', contact_phone, passwordHash, description || '', now, now
  )

  return jsonOk('申请已提交，等待管理员审核', { tenant_id: tenantId })
}

// ── POST /third/audit ── Admin: approve or reject institution ──

async function handleAudit(db, user, body) {
  await requireAdmin(db, user.user_id)

  const { tenant_id, action: audit_action, reason = '' } = body
  if (!tenant_id) return jsonBad('缺少机构ID')
  if (!['active', 'disabled'].includes(audit_action)) return jsonBad('审核操作无效，应为 active 或 disabled')

  const tenant = await dbGet(db, "SELECT * FROM tenants WHERE tenant_id = ? AND status = 'pending'", tenant_id)
  if (!tenant) return jsonBad('机构不存在或已审核')

  const now = new Date().toISOString()

  // Update tenant status
  await dbRun(
    db,
    'UPDATE tenants SET status = ?, updated_at = ? WHERE tenant_id = ?',
    audit_action, now, tenant_id
  )

  // If approved, create a user account with role=tenant (for login via users table)
  if (audit_action === 'active') {
    const existingUser = await dbGet(db, 'SELECT user_id FROM users WHERE phone = ?', tenant.contact_phone)
    if (!existingUser) {
      const userId = uuid()
      await dbRun(
        db,
        `INSERT INTO users (user_id, phone, nickname, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'tenant', ?, ?)`,
        userId, tenant.contact_phone, tenant.name, tenant.password_hash, now, now
      )
    } else {
      // Update existing user's role to tenant
      await dbRun(db, "UPDATE users SET role = 'tenant', updated_at = ? WHERE phone = ?", now, tenant.contact_phone)
    }
  }

  return jsonOk(`机构已${audit_action === 'active' ? '通过审核' : '禁用'}`)
}

// ── POST /third/login ── Institution login (via tenants table, returns JWT) ──

async function handleLogin(db, env, body) {
  const { contact_phone, password } = body
  if (!contact_phone || !password) return jsonBad('请填写手机号和密码')

  const tenant = await dbGet(db, 'SELECT * FROM tenants WHERE contact_phone = ?', contact_phone)
  if (!tenant) return jsonUnauthorized('账号不存在')

  const ok = await verifyPassword(password, tenant.password_hash)
  if (!ok) return jsonUnauthorized('密码错误')
  if (tenant.status === 'disabled') return jsonUnauthorized('账号已被禁用')
  if (tenant.status === 'pending') return jsonUnauthorized('账号审核中，请等待')

  const token = await generateToken({ user_id: tenant.contact_phone, phone: contact_phone, role: 'tenant', tenant_id: tenant.tenant_id }, env)

  return jsonOk('登录成功', {
    token,
    tenant_id: tenant.tenant_id,
    name: tenant.name,
    status: tenant.status,
  })
}

// ── Helper: extract tenant from authenticated user ──

async function resolveTenant(db, user) {
  // If JWT contains tenant_id directly
  if (user.tenant_id) {
    return await dbGet(db, 'SELECT * FROM tenants WHERE tenant_id = ?', user.tenant_id)
  }
  // Otherwise look up by phone
  if (user.phone) {
    return await dbGet(db, 'SELECT * FROM tenants WHERE contact_phone = ?', user.phone)
  }
  return null
}

function isTenantUser(user) {
  return user.role === 'tenant' || user.tenant_id
}

// ── POST /third/upload ── Tenant: batch upload questions to tenant_questions ──

async function handleUpload(db, user, body) {
  if (!isTenantUser(user)) return jsonUnauthorized('仅机构可操作')

  const tenant = await resolveTenant(db, user)
  if (!tenant) return jsonBadRequest('机构信息不存在')
  if (tenant.status !== 'active') return jsonBad('机构未通过审核')

  const { questions } = body
  if (!questions || !Array.isArray(questions) || questions.length === 0) return jsonBad('请提供题目列表')

  const now = new Date().toISOString()
  const tenantId = tenant.tenant_id
  let imported = 0
  let duplicated = 0

  // Get existing stems for this tenant
  const existingRows = await dbAll(db, 'SELECT stem FROM tenant_questions WHERE tenant_id = ?', tenantId)
  const existingStems = new Set(existingRows.map(r => r.stem))

  for (const q of questions) {
    if (!q.stem || !q.answer) continue
    if (existingStems.has(q.stem)) {
      duplicated++
      continue
    }

    await dbRun(
      db,
      `INSERT INTO tenant_questions (question_id, tenant_id, question_type, stem, options, answer, explanation, difficulty, knowledge_path, knowledge_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      uuid(), tenantId, q.question_type || 'single', q.stem,
      JSON.stringify(q.options || []), q.answer, q.explanation || '',
      q.difficulty || 'medium', q.knowledge_path || '', q.knowledge_id || '',
      now, now
    )
    existingStems.add(q.stem)
    imported++
  }

  return jsonOk('上传完成', { imported, duplicated, total: questions.length })
}

// ── GET /third/list_questions ── Tenant: list own questions / Admin: list all ──

async function handleListQuestions(db, user, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const status = url.searchParams.get('status') || ''
  const offset = (page - 1) * pageSize

  let isAdmin = false
  try { await requireAdmin(db, user.user_id); isAdmin = true } catch {}

  const conditions = []
  const params = []

  if (!isAdmin) {
    const tenant = await resolveTenant(db, user)
    if (!tenant) return jsonBad('机构信息不存在')
    conditions.push('tq.tenant_id = ?')
    params.push(tenant.tenant_id)
  }

  if (status) {
    conditions.push('tq.status = ?')
    params.push(status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM tenant_questions tq ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT tq.*, ten.name AS tenant_name
     FROM tenant_questions tq
     LEFT JOIN tenants ten ON tq.tenant_id = ten.tenant_id
     ${where}
     ORDER BY tq.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── POST /third/sync_to_main ── Admin: copy tenant_questions to main questions table ──

async function handleSyncToMain(db, user, body) {
  await requireAdmin(db, user.user_id)

  const { question_ids } = body
  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
    return jsonBad('请提供要同步的题目ID列表')
  }

  const now = new Date().toISOString()
  const synced = []
  const skipped = []

  for (const qid of question_ids) {
    // Get from tenant_questions
    const tq = await dbGet(db, 'SELECT * FROM tenant_questions WHERE question_id = ?', qid)
    if (!tq) { skipped.push(qid); continue }

    // Check if already synced (by stem)
    const existing = await dbGet(db, 'SELECT question_id FROM questions WHERE stem = ?', tq.stem)
    if (existing) { skipped.push(qid); continue }

    // Insert into main questions table
    const newQuestionId = uuid()
    await dbRun(
      db,
      `INSERT INTO questions (question_id, tenant_id, question_type, stem, options, answer, explanation, difficulty, knowledge_path, knowledge_id, source_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'third_party', 'active', ?, ?)`,
      newQuestionId, tq.tenant_id, tq.question_type, tq.stem, tq.options, tq.answer,
      tq.explanation, tq.difficulty, tq.knowledge_path, tq.knowledge_id, now, now
    )

    // Update tenant_questions status
    await dbRun(db, "UPDATE tenant_questions SET status = 'published', updated_at = ? WHERE question_id = ?", now, qid)

    // Log sync
    await dbRun(
      db,
      `INSERT INTO question_sync_logs (log_id, tenant_id, question_id, action, operator_id, created_at)
       VALUES (?, ?, ?, 'sync', ?, ?)`,
      uuid(), tq.tenant_id, qid, user.user_id, now
    )

    synced.push(qid)
  }

  return jsonOk('同步完成', { synced: synced.length, skipped: skipped.length })
}

// ── GET /third/stats ── Tenant: own stats / Admin: all stats ──

async function handleStats(db, user, url) {
  let isAdmin = false
  try { await requireAdmin(db, user.user_id); isAdmin = true } catch {}

  if (isAdmin) {
    // Admin: aggregate stats for all tenants
    const tenantCount = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM tenants')
    const activeCount = await dbGet(db, "SELECT COUNT(*) AS cnt FROM tenants WHERE status = 'active'")
    const totalQuestions = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM tenant_questions')
    const totalSynced = await dbGet(db, "SELECT COUNT(*) AS cnt FROM tenant_questions WHERE status = 'published'")

    return jsonOk('success', {
      tenant_total: tenantCount?.cnt || 0,
      tenant_active: activeCount?.cnt || 0,
      questions_total: totalQuestions?.cnt || 0,
      questions_synced: totalSynced?.cnt || 0,
    })
  }

  // Tenant: own stats
  const tenant = await resolveTenant(db, user)
  if (!tenant) return jsonBad('机构信息不存在')

  const questionCount = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM tenant_questions WHERE tenant_id = ?', tenant.tenant_id)
  const syncedCount = await dbGet(db, "SELECT COUNT(*) AS cnt FROM tenant_questions WHERE tenant_id = ? AND status = 'published'", tenant.tenant_id)
  const draftCount = await dbGet(db, "SELECT COUNT(*) AS cnt FROM tenant_questions WHERE tenant_id = ? AND status = 'draft'", tenant.tenant_id)

  return jsonOk('success', {
    tenant_id: tenant.tenant_id,
    name: tenant.name,
    status: tenant.status,
    deposit_balance: tenant.deposit_balance,
    questions_total: questionCount?.cnt || 0,
    questions_synced: syncedCount?.cnt || 0,
    questions_draft: draftCount?.cnt || 0,
  })
}

// ── POST /third/withdraw ── Tenant: withdraw request (placeholder) ──

async function handleWithdraw() {
  return jsonOk('提现功能开发中', null)
}
