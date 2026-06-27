/**
 * Shared utilities for Pages Functions
 * Uses Web Crypto API (available in Cloudflare Workers runtime)
 */

const DEFAULT_JWT_SECRET = 'quiz-community-jwt-secret-2026'
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(env) {
  return env?.JWT_SECRET || DEFAULT_JWT_SECRET
}

function isSmsMock(env) {
  return env?.SMS_MOCK !== 'false' // default: mock ON
}

// ── Password hashing (PBKDF2-SHA256) ──

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256
  )
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
  const saltB64 = btoa(String.fromCharCode(...salt))
  return `pbkdf2:${saltB64}:${hash}`
}

export async function verifyPassword(password, stored) {
  try {
    const [, saltB64, expectedHash] = stored.split(':')
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256
    )
    const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
    return hash === expectedHash
  } catch {
    return false
  }
}

// ── JWT (HMAC-SHA256) ──

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)))
}

export async function generateToken(payload, env) {
  const secret = getSecret(env)
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64url(new TextEncoder().encode(JSON.stringify({
    ...payload, iat: Date.now(), exp: Date.now() + JWT_EXPIRES_MS,
  })))
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = base64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
  return `${data}.${sig}`
}

export async function verifyToken(token, env) {
  try {
    const secret = getSecret(env)
    const [header, body, sig] = token.split('.')
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC', key, base64urlDecode(sig), new TextEncoder().encode(`${header}.${body}`)
    )
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function extractUser(request, env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return null
  return verifyToken(token, env)
}

// ── Response helpers ──

export function json(code, message, data = null) {
  const res = { code, message }
  if (data !== null) res.data = data
  return new Response(JSON.stringify(res), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function jsonOk(message, data) { return json(200, message, data) }
export function jsonBad(message) { return json(400, message) }
export function jsonUnauthorized(message) { return json(401, message) }

// ── UUID ──

export function uuid() {
  return crypto.randomUUID()
}

// ── SMS ──

export function verifySmsCode(submittedCode, env) {
  if (isSmsMock(env)) {
    return submittedCode === '6666'
  }
  // Production: should verify against SMS provider
  return false
}

// ── Admin guard ──

export async function requireAdmin(db, userId) {
  const user = await dbGet(db, 'SELECT role FROM users WHERE user_id = ?', userId)
  if (!user || user.role !== 'admin') {
    throw new Error('无权操作，仅管理员可执行')
  }
  return user
}

// ── D1 helpers ──

export async function dbRun(db, sql, ...params) {
  const stmt = db.prepare(sql).bind(...params)
  return stmt.run()
}

export async function dbGet(db, sql, ...params) {
  const stmt = db.prepare(sql).bind(...params)
  return stmt.first()
}

export async function dbAll(db, sql, ...params) {
  const stmt = db.prepare(sql).bind(...params)
  const { results } = await stmt.all()
  return results
}
