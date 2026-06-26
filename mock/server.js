/**
 * Mock API server for local development
 * Intercepts /api/v1/* requests and returns mock responses
 *
 * Universal verification code: 6666
 */

import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MOCK_CODE = '6666'
const BCRYPT_ROUNDS = 10

// In-memory mock data
const mockUsers = new Map()
// Pre-create admin user for seed posts
mockUsers.set('admin', {
  user_id: 'admin', nickname: 'Z考研官方', avatar: '', phone: '',
  password_hash: '', bio: '官方账号', grade: '', exam_goals: [],
  interest_tags: [], is_private: false, privacy_settings: {},
  default_exam_duration: 60, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
})
const mockTokens = new Map()
let userCounter = 0

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function now() {
  return new Date().toISOString()
}

function response(code, message, data) {
  const res = { code, message }
  if (data !== undefined) res.data = data
  return res
}

// SMS code store
const smsCodes = new Map()

/**
 * Vite plugin that serves mock API endpoints
 */
export function mockApiPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        // Parse body for POST/PUT
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            req.body = body ? JSON.parse(body) : {}
          } catch {
            req.body = {}
          }

          // Route matching
          const urlParts = req.url.split('?')
          const url = urlParts[0].replace(/^\//, '')
          const method = req.method

          // Parse query string into req.query
          req.query = {}
          if (urlParts[1]) {
            urlParts[1].split('&').forEach(pair => {
              const [key, val] = pair.split('=')
              if (key) req.query[decodeURIComponent(key)] = decodeURIComponent(val || '')
            })
          }

          res.setHeader('Content-Type', 'application/json')

          // ---- User SMS ----
          if (url === 'v1/user/sms/send' && method === 'POST') {
            const { phone } = req.body
            if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
              res.end(JSON.stringify(response(400, '手机号格式不正确')))
              return
            }
            smsCodes.set(phone, { code: MOCK_CODE, expiresAt: Date.now() + 5 * 60 * 1000 })
            console.log(`[Mock SMS] 当前为测试模式，验证码已设为 ${MOCK_CODE}`)
            res.end(JSON.stringify(response(200, '验证码已发送', { code: MOCK_CODE })))
            return
          }

          // ---- User Register ----
          if (url === 'v1/user/register' && method === 'POST') {
            const { phone, code, password } = req.body
            if (!phone || !code || !password) {
              res.end(JSON.stringify(response(400, '请填写完整信息')))
              return
            }
            if (code !== MOCK_CODE) {
              const entry = smsCodes.get(phone)
              if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
                res.end(JSON.stringify(response(400, '验证码无效或已过期')))
                return
              }
            }
            if (password.length < 8) {
              res.end(JSON.stringify(response(400, '密码需8位以上')))
              return
            }

            // Check duplicate
            for (const [, u] of mockUsers) {
              if (u.phone === phone) {
                res.end(JSON.stringify(response(400, '该手机号已注册')))
                return
              }
            }

            userCounter++
            const userId = `user_${userCounter}`
            const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
            const user = {
              user_id: userId,
              nickname: `用户${phone.slice(-4)}`,
              avatar: '',
              phone,
              password_hash: passwordHash,
              bio: '',
              grade: '',
              exam_goals: [],
              interest_tags: [],
              is_private: false,
              privacy_settings: {},
              default_exam_duration: 60,
              created_at: now(),
              updated_at: now(),
            }
            mockUsers.set(userId, user)

            const token = `mock_token_${userId}_${Date.now()}`
            mockTokens.set(token, userId)
            smsCodes.delete(phone)

            // Give 1000 coins as register bonus
            if (!globalThis.__mockCoinData) {
              globalThis.__mockCoinData = {
                signLogs: new Map(),
                coinAccounts: new Map(),
                transactions: [],
              }
            }
            const coinData = globalThis.__mockCoinData
            {
              coinData.coinAccounts.set(userId, {
                account_id: 'ca_' + uuid().split('-')[0],
                user_id: userId,
                balance: 1000,
                total_earned: 1000,
                total_spent: 0,
                created_at: now(),
                updated_at: now(),
              })
              coinData.transactions.push({
                transaction_id: 'tx_' + uuid().split('-')[0],
                user_id: userId,
                amount: 1000,
                type: 'earn',
                scene: 'register_bonus',
                description: '注册赠送1000虚拟币',
                balance_after: 1000,
                created_at: now(),
              })
            }

            console.log(`[Mock] User registered: ${phone} -> ${userId}, bonus 1000 coins`)
            res.end(JSON.stringify(response(200, '注册成功', {
              token,
              user: { user_id: userId, nickname: user.nickname, avatar: '', phone },
            })))
            return
          }

          // ---- User Login (password) ----
          if (url === 'v1/user/login/password' && method === 'POST') {
            const { phone, password } = req.body
            if (!phone || !password) {
              res.end(JSON.stringify(response(400, '请输入手机号和密码')))
              return
            }

            let found = null
            for (const [, u] of mockUsers) {
              if (u.phone === phone) { found = u; break }
            }

            if (!found) {
              res.end(JSON.stringify(response(401, '该手机号未注册')))
              return
            }

            // Verify password with bcrypt
            if (!found.password_hash || !bcrypt.compareSync(password, found.password_hash)) {
              res.end(JSON.stringify(response(401, '手机号或密码错误')))
              return
            }

            const token = `mock_token_${found.user_id}_${Date.now()}`
            mockTokens.set(token, found.user_id)

            console.log(`[Mock] User logged in: ${phone}`)
            res.end(JSON.stringify(response(200, '登录成功', {
              token,
              user: { user_id: found.user_id, nickname: found.nickname, avatar: found.avatar, phone },
            })))
            return
          }

          // ---- User Login (SMS) ----
          if (url === 'v1/user/login/sms' && method === 'POST') {
            const { phone, code } = req.body
            if (!phone || !code) {
              res.end(JSON.stringify(response(400, '请输入手机号和验证码')))
              return
            }
            if (code !== MOCK_CODE) {
              res.end(JSON.stringify(response(400, '验证码无效或已过期')))
              return
            }

            let found = null
            for (const [, u] of mockUsers) {
              if (u.phone === phone) { found = u; break }
            }
            if (!found) {
              res.end(JSON.stringify(response(401, '该手机号未注册')))
              return
            }

            const token = `mock_token_${found.user_id}_${Date.now()}`
            mockTokens.set(token, found.user_id)

            console.log(`[Mock] User logged in via SMS: ${phone}`)
            res.end(JSON.stringify(response(200, '登录成功', {
              token,
              user: { user_id: found.user_id, nickname: found.nickname, avatar: found.avatar, phone },
            })))
            return
          }

          // ---- Password Reset ----
          if (url === 'v1/user/password/reset' && method === 'POST') {
            const { phone, code, new_password } = req.body
            if (!phone || !code || !new_password) {
              res.end(JSON.stringify(response(400, '请填写完整信息')))
              return
            }
            if (code !== MOCK_CODE) {
              res.end(JSON.stringify(response(400, '验证码无效或已过期')))
              return
            }
            res.end(JSON.stringify(response(200, '密码重置成功')))
            return
          }

          // ---- Get Profile ----
          if (url === 'v1/user/profile' && method === 'GET') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            const userId = mockTokens.get(token)

            if (!userId) {
              res.end(JSON.stringify(response(401, '请先登录')))
              return
            }

            const user = mockUsers.get(userId)
            if (!user) {
              res.end(JSON.stringify(response(404, '用户不存在')))
              return
            }

            // Compute follow counts from mock data
            const follows = globalThis.__mockFollows || []
            const followingCount = follows.filter(f => f.follower_id === userId).length
            const followersCount = follows.filter(f => f.following_id === userId).length

            // Compute study stats (use globalThis to avoid ordering issues)
            const pStatsData = globalThis.__mockPracticeData || { studyRecords: [] }
            const userRecords = (pStatsData.studyRecords || []).filter(r => r.user_id === userId)
            const totalQ = userRecords.reduce((sum, r) => sum + (r.question_count || 0), 0)
            const totalCorrect = userRecords.reduce((sum, r) => sum + (r.correct_count || 0), 0)
            const acc = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0

            // Coin balance (use globalThis to avoid ordering issues)
            const cData = globalThis.__mockCoinData || { coinAccounts: new Map() }
            const coinAcct = cData.coinAccounts.get(userId)
            const coinBal = coinAcct?.balance || 0

            res.end(JSON.stringify(response(200, 'success', {
              ...user,
              coin_balance: coinBal,
              following_count: followingCount,
              followers_count: followersCount,
              total_questions: totalQ,
              accuracy: acc,
              password_hash: undefined,
            })))
            return
          }

          // ---- Update Profile ----
          if (url === 'v1/user/profile' && method === 'PUT') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            const userId = mockTokens.get(token)

            if (!userId) {
              res.end(JSON.stringify(response(401, '请先登录')))
              return
            }

            const user = mockUsers.get(userId)
            if (!user) {
              res.end(JSON.stringify(response(404, '用户不存在')))
              return
            }

            const updates = req.body
            if (updates.nickname !== undefined) user.nickname = updates.nickname
            if (updates.bio !== undefined) user.bio = updates.bio
            if (updates.avatar !== undefined) user.avatar = updates.avatar
            if (updates.grade !== undefined) user.grade = updates.grade
            if (updates.exam_goals !== undefined) user.exam_goals = updates.exam_goals
            user.updated_at = now()

            console.log(`[Mock] Profile updated: ${userId}`)
            res.end(JSON.stringify(response(200, '资料更新成功')))
            return
          }

          // ---- Get Privacy ----
          if (url === 'v1/user/privacy' && method === 'GET') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            const userId = mockTokens.get(token)

            if (!userId) {
              res.end(JSON.stringify(response(401, '请先登录')))
              return
            }

            const user = mockUsers.get(userId)
            res.end(JSON.stringify(response(200, 'success', {
              privacy_settings: user?.privacy_settings || {},
              is_private: user?.is_private || false,
            })))
            return
          }

          // ---- Update Privacy ----
          if (url === 'v1/user/privacy' && method === 'PUT') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            const userId = mockTokens.get(token)

            if (!userId) {
              res.end(JSON.stringify(response(401, '请先登录')))
              return
            }

            const user = mockUsers.get(userId)
            if (user && req.body.settings) {
              user.privacy_settings = { ...user.privacy_settings, ...req.body.settings }
            }

            console.log(`[Mock] Privacy updated: ${userId}`)
            res.end(JSON.stringify(response(200, '隐私设置已更新')))
            return
          }

          // ---- Toggle Private ----
          if (url === 'v1/user/privacy/toggle' && method === 'POST') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            const userId = mockTokens.get(token)

            if (!userId) {
              res.end(JSON.stringify(response(401, '请先登录')))
              return
            }

            const user = mockUsers.get(userId)
            if (user) {
              user.is_private = !user.is_private
              console.log(`[Mock] Private mode ${user.is_private ? 'enabled' : 'disabled'}: ${userId}`)
            }

            res.end(JSON.stringify(response(200, `私密模式已${user?.is_private ? '开启' : '关闭'}`)))
            return
          }

          // ---- User: Get other user profile ----
          if (url.match(/^v1\/user\/profile\/[^/]+$/) && method === 'GET') {
            const targetId = url.split('/')[3]
            const target = mockUsers.get(targetId)
            if (!target) { res.end(JSON.stringify(response(404, '用户不存在'))); return }
            res.end(JSON.stringify(response(200, 'success', {
              user_id: target.user_id, nickname: target.nickname, avatar: target.avatar,
              bio: target.bio || '', grade: target.grade || '',
              total_questions: 0, accuracy: 0, following_count: 0, followers_count: 0,
            })))
            return
          }

          // ---- Follow ----
          if (!globalThis.__mockFollows) { globalThis.__mockFollows = [] }

          if (url === 'v1/user/follow' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { user_id: targetId } = req.body
            if (!targetId) { res.end(JSON.stringify(response(400, '缺少用户ID'))); return }
            if (targetId === userId) { res.end(JSON.stringify(response(400, '不能关注自己'))); return }
            if (globalThis.__mockFollows.some(f => f.follower_id === userId && f.following_id === targetId)) {
              res.end(JSON.stringify(response(200, '已关注'))); return
            }
            globalThis.__mockFollows.push({ follower_id: userId, following_id: targetId, created_at: now() })
            res.end(JSON.stringify(response(200, '关注成功')))
            return
          }

          if (url === 'v1/user/unfollow' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { user_id: targetId } = req.body
            globalThis.__mockFollows = globalThis.__mockFollows.filter(
              f => !(f.follower_id === userId && f.following_id === targetId)
            )
            res.end(JSON.stringify(response(200, '已取消关注')))
            return
          }

          if (url === 'v1/user/following/list' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const targetUserId = req.query?.user_id || userId
            const following = globalThis.__mockFollows
              .filter(f => f.follower_id === targetUserId)
              .map(f => {
                const u = mockUsers.get(f.following_id)
                return { user_id: f.following_id, nickname: u?.nickname || '未知', avatar: u?.avatar || '', following_id: f.following_id }
              })
            res.end(JSON.stringify(response(200, 'success', { list: following, total: following.length })))
            return
          }

          if (url === 'v1/user/followers/list' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const targetUserId = req.query?.user_id || userId
            const followers = globalThis.__mockFollows
              .filter(f => f.following_id === targetUserId)
              .map(f => {
                const u = mockUsers.get(f.follower_id)
                return { user_id: f.follower_id, nickname: u?.nickname || '未知', avatar: u?.avatar || '' }
              })
            res.end(JSON.stringify(response(200, 'success', { list: followers, total: followers.length })))
            return
          }

          // ========================
          // Notice Mock Data
          // ========================
          if (!globalThis.__mockNotices) {
            globalThis.__mockNotices = [
              {
                notice_id: 'notice_001',
                title: '欢迎使用Z考研',
                content: '<p>Z考研是一个面向大学生的在线刷题平台，支持乱序练习、模拟考试、错题重做等功能。快来开始你的学习之旅吧！</p>',
                type: 'system',
                cover_image: '',
                publisher_id: 'admin',
                status: 'published',
                created_at: '2026-06-20T08:00:00.000Z',
                updated_at: '2026-06-20T08:00:00.000Z',
              },
              {
                notice_id: 'notice_002',
                title: '虚拟币充值功能上线预告',
                content: '<p>虚拟币充值功能即将上线，支持微信和支付宝充值。敬请期待！</p>',
                type: 'activity',
                cover_image: '',
                publisher_id: 'admin',
                status: 'published',
                created_at: '2026-06-22T10:00:00.000Z',
                updated_at: '2026-06-22T10:00:00.000Z',
              },
              {
                notice_id: 'notice_003',
                title: '纠错奖励说明',
                content: '<p>发现题目有误？提交纠错工单，审核通过后可获得2000虚拟币奖励！</p>',
                type: 'correction',
                cover_image: '',
                publisher_id: 'admin',
                status: 'published',
                created_at: '2026-06-24T14:00:00.000Z',
                updated_at: '2026-06-24T14:00:00.000Z',
              },
            ]
          }
          const noticesData = globalThis.__mockNotices

          // ---- Notice: List ----
          if (url === 'v1/notice/list' && method === 'GET') {
            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            const type = req.query?.type

            let list = noticesData.filter(n => n.status === 'published')
            if (type) list = list.filter(n => n.type === type)
            list.sort((a, b) => b.created_at.localeCompare(a.created_at))

            const total = list.length
            const start = (page - 1) * pageSize
            const paged = list.slice(start, start + pageSize).map(({ content, ...rest }) => rest)

            res.end(JSON.stringify(response(200, 'success', { list: paged, total, page, page_size: pageSize })))
            return
          }

          // ---- Notice: Detail ----
          if (url.match(/^v1\/notice\/[^/]+$/) && !url.includes('/list') && method === 'GET') {
            const noticeId = url.split('/')[2]
            const notice = noticesData.find(n => n.notice_id === noticeId && n.status === 'published')
            if (!notice) { res.end(JSON.stringify(response(404, '公告不存在'))); return }
            res.end(JSON.stringify(response(200, 'success', notice)))
            return
          }

          // ---- Notice: Create (admin) ----
          if (url === 'v1/notice/create' && method === 'POST') {
            const { title, content, type = 'system' } = req.body
            if (!title || !content) { res.end(JSON.stringify(response(400, '缺少标题或内容'))); return }
            const noticeId = 'notice_' + uuid().split('-')[0]
            noticesData.push({
              notice_id: noticeId, title, content, type,
              cover_image: '', publisher_id: 'admin', status: 'published',
              created_at: now(), updated_at: now(),
            })
            res.end(JSON.stringify(response(200, '发布成功', { notice_id: noticeId })))
            return
          }

          // ========================
          // Notification Mock Data
          // ========================
          if (!globalThis.__mockNotifications) {
            globalThis.__mockNotifications = []
          }
          const notifData = globalThis.__mockNotifications

          // ---- Notification: Unread ----
          if (url === 'v1/notification/unread' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const userNotifs = notifData.filter(n => n.user_id === userId)
            const types = ['comment', 'reply', 'mention', 'follow', 'system']
            const counts = {}
            for (const t of types) {
              counts[t] = userNotifs.filter(n => n.type === t && !n.is_read).length
            }
            const hasUnread = Object.values(counts).some(c => c > 0)
            res.end(JSON.stringify(response(200, 'success', { has_unread: hasUnread, unread_by_type: counts })))
            return
          }

          // ---- Notification: List ----
          if (url === 'v1/notification/list' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            const type = req.query?.type

            let list = notifData.filter(n => n.user_id === userId)
            if (type) list = list.filter(n => n.type === type)
            list.sort((a, b) => b.created_at.localeCompare(a.created_at))

            const total = list.length
            const start = (page - 1) * pageSize
            const paged = list.slice(start, start + pageSize)

            res.end(JSON.stringify(response(200, 'success', { list: paged, total, page, page_size: pageSize })))
            return
          }

          // ---- Notification: Mark read ----
          if (url === 'v1/notification/read' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const { ids } = req.body || {}
            if (ids && ids.length > 0) {
              notifData.filter(n => ids.includes(n.notification_id) && n.user_id === userId)
                .forEach(n => { n.is_read = true; n.updated_at = now() })
            } else {
              notifData.filter(n => n.user_id === userId && !n.is_read)
                .forEach(n => { n.is_read = true; n.updated_at = now() })
            }
            res.end(JSON.stringify(response(200, '已标记已读')))
            return
          }

          // ---- Notification: Delete ----
          if (url.match(/^v1\/notification\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const notifId = url.split('/')[2]
            const idx = notifData.findIndex(n => n.notification_id === notifId && n.user_id === userId)
            if (idx === -1) { res.end(JSON.stringify(response(404, '通知不存在'))); return }
            notifData.splice(idx, 1)
            res.end(JSON.stringify(response(200, '删除成功')))
            return
          }

          // ---- Logout ----
          if (url === 'v1/user/logout' && method === 'POST') {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            mockTokens.delete(token)
            res.end(JSON.stringify(response(200, '已退出登录')))
            return
          }

          // ========================
          // Practice Mock Data (in-memory)
          // ========================
          if (!globalThis.__mockPracticeData) {
            globalThis.__mockPracticeData = {
              questions: generateMockQuestions(),
              sessions: new Map(),
              wrongBook: new Map(),
              favorites: new Map(),
              studyRecords: [],
            }
          }
          const practiceData = globalThis.__mockPracticeData

          // ========================
          // Shop Mock Data (initialized early because practice endpoints reference shopData)
          // ========================
          if (!globalThis.__mockShopData) {
            globalThis.__mockShopData = {
              products: [
                { product_id: 'prod_001', name: '高等数学期末冲刺笔记', description: '涵盖极限、导数、积分、微分方程四大模块，重点公式汇总+经典例题解析，适合期末考前一周突击。', cover_url: '', price: 500, category: '高等数学', sales_count: 326, status: 'active', question_count: 0, is_question_bank: false, created_at: '2026-05-10T08:00:00.000Z' },
                { product_id: 'prod_002', name: '微观经济学名词解释大全', description: '整理了80+个高频名词解释，含中英对照，覆盖需求理论、市场结构、福利经济学等全部章节。', cover_url: '', price: 300, category: '经济学', sales_count: 218, status: 'active', question_count: 0, is_question_bank: false, created_at: '2026-05-15T08:00:00.000Z' },
                { product_id: 'prod_003', name: '英语四级高频词汇2000', description: '按真题词频排序，附例句和记忆技巧，配套音频可在资料库中下载。', cover_url: '', price: 800, category: '英语', sales_count: 512, status: 'active', question_count: 0, is_question_bank: false, created_at: '2026-04-20T08:00:00.000Z' },
                { product_id: 'prod_004', name: '线性代数必考题型30道', description: '精选历年期末高频题型，含矩阵、行列式、向量空间、特征值四大专题。', cover_url: '', price: 400, category: '高等数学', sales_count: 145, status: 'active', question_count: 0, is_question_bank: false, created_at: '2026-06-01T08:00:00.000Z' },
                { product_id: 'prod_005', name: '会计学原理思维导图合集', description: '全书12章思维导图，帮助建立知识框架，适合复习梳理。', cover_url: '', price: 600, category: '会计学', sales_count: 89, status: 'active', question_count: 0, is_question_bank: false, created_at: '2026-06-10T08:00:00.000Z' },
                { product_id: 'prod_bank_micro', name: '微观经济学题库', description: '包含微观经济学相关题目，涵盖需求理论、市场结构、消费者行为等知识点，支持在线刷题、模拟考试。', cover_url: '', price: 100, category: '经济学', sales_count: 0, status: 'active', question_count: 153, is_question_bank: true, created_at: '2026-06-24T08:00:00.000Z' },
              ],
              orders: [],
              library: [],
              corrections: [],
            }
          }
          const shopData = globalThis.__mockShopData

          function generateMockQuestions() {
            try {
              const questionsPath = join(__dirname, '..', '..', 'parsed_questions.json')
              const raw = readFileSync(questionsPath, 'utf-8')
              return JSON.parse(raw)
            } catch (e) {
              console.warn('[Mock] Failed to load parsed_questions.json, using empty bank:', e.message)
              return []
            }
          }

          function shuffleArray(arr) {
            const shuffled = [...arr]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
          }

          function getAuthUser(req) {
            const authHeader = req.headers.authorization || ''
            const token = authHeader.replace(/^Bearer\s+/i, '')
            return mockTokens.get(token) || null
          }

          // ---- Practice: Questions list ----
          if (url === 'v1/practice/questions' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            const productId = req.query?.product_id

            let allQuestions = practiceData.questions.filter(q => q.status === 'active')

            // Filter by product_id (match knowledge_path to product category)
            if (productId) {
              const product = shopData.products.find(p => p.product_id === productId)
              if (product && product.category) {
                allQuestions = allQuestions.filter(q =>
                  q.knowledge_path && q.knowledge_path.includes(product.category)
                )
              }
            }

            const total = allQuestions.length
            const start = (page - 1) * pageSize
            const list = allQuestions.slice(start, start + pageSize)

            // Stats
            const singleCount = allQuestions.filter(q => q.question_type === 'single').length
            const multiCount = allQuestions.filter(q => q.question_type === 'multi').length
            const judgeCount = allQuestions.filter(q => q.question_type === 'judge').length

            res.end(JSON.stringify(response(200, 'success', {
              list, total, page, page_size: pageSize,
              stats: { total, single: singleCount, multiple: multiCount, judge: judgeCount },
            })))
            return
          }

          // ---- Practice: Get sprint papers ----
          if (url === 'v1/practice/sprint/papers' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            res.end(JSON.stringify(response(200, 'success', [
              { paper_id: 'paper_001', name: '高等数学冲刺卷（一）', total_count: 10, suggest_duration: 15, knowledge_scope: ['高等数学'], status: 'active' },
              { paper_id: 'paper_002', name: '微观经济学冲刺卷（一）', total_count: 10, suggest_duration: 15, knowledge_scope: ['微观经济学'], status: 'active' },
              { paper_id: 'paper_003', name: '英语冲刺卷（一）', total_count: 10, suggest_duration: 15, knowledge_scope: ['英语'], status: 'active' },
            ])))
            return
          }

          // ---- Practice: Start random practice ----
          if (url === 'v1/practice/random/start' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            // Check if user has purchased any question bank
            const { product_id } = req.body || {}
            const hasBank = product_id
              ? shopData.library.some(l => l.user_id === userId && l.product_id === product_id)
              : shopData.library.some(l => l.user_id === userId && shopData.products.find(p => p.product_id === l.product_id && p.is_question_bank))
            if (!hasBank) {
              res.end(JSON.stringify(response(403, '请先购买题库'))); return
            }

            // Check for ongoing session
            for (const [, s] of practiceData.sessions) {
              if (s.user_id === userId && s.status === 'ongoing') {
                res.end(JSON.stringify(response(400, '有未完成的练习，请先完成或放弃', { session_id: s.session_id })))
                return
              }
            }

            const questions = shuffleArray(practiceData.questions).slice(0, 20)
            const sessionId = 'sess_' + uuid().split('-')[0]
            const session = {
              session_id: sessionId,
              user_id: userId,
              paper_type: 'random',
              paper_snapshot: { paper_id: null, title: '乱序练习', duration: null, questions, total_count: questions.length },
              user_answers: {},
              current_index: 1,
              total_duration: null,
              remaining_seconds: null,
              start_time: now(),
              end_time: null,
              total_score: null,
              correct_count: null,
              wrong_count: null,
              unanswered_count: null,
              score_detail: null,
              status: 'ongoing',
              created_at: now(),
              updated_at: now(),
            }
            practiceData.sessions.set(sessionId, session)
            console.log(`[Mock] Random practice started: ${sessionId} (${questions.length} questions)`)
            // Strip answers from response
            const safeSession = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: questions.map(q => { const { answer, explanation, ...s } = q; return s }),
              },
            }
            res.end(JSON.stringify(response(200, 'success', safeSession)))
            return
          }

          // ---- Practice: Start mock exam ----
          if (url === 'v1/practice/mock/start' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            // Check if user has purchased any question bank
            const mockProduct = (req.body || {}).product_id
            const hasBankMock = mockProduct
              ? shopData.library.some(l => l.user_id === userId && l.product_id === mockProduct)
              : shopData.library.some(l => l.user_id === userId && shopData.products.find(p => p.product_id === l.product_id && p.is_question_bank))
            if (!hasBankMock) {
              res.end(JSON.stringify(response(403, '请先购买题库'))); return
            }

            for (const [, s] of practiceData.sessions) {
              if (s.user_id === userId && s.status === 'ongoing') {
                res.end(JSON.stringify(response(400, '有未完成的练习，请先完成或放弃', { session_id: s.session_id })))
                return
              }
            }

            const duration = req.body.duration || 60
            const count = Math.min(duration, practiceData.questions.length)
            const questions = shuffleArray(practiceData.questions).slice(0, count)
            const sessionId = 'sess_' + uuid().split('-')[0]
            const session = {
              session_id: sessionId,
              user_id: userId,
              paper_type: 'mock',
              paper_snapshot: { paper_id: null, title: `模拟考试-${duration}分钟`, duration: duration * 60, questions, total_count: questions.length },
              user_answers: {},
              current_index: 1,
              total_duration: duration * 60,
              remaining_seconds: duration * 60,
              start_time: now(),
              end_time: null,
              total_score: null,
              correct_count: null,
              wrong_count: null,
              unanswered_count: null,
              score_detail: null,
              status: 'ongoing',
              created_at: now(),
              updated_at: now(),
            }
            practiceData.sessions.set(sessionId, session)
            console.log(`[Mock] Mock exam started: ${sessionId} (${questions.length} questions, ${duration}min)`)
            const safeMock = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: questions.map(q => { const { answer, explanation, ...s } = q; return s }),
              },
            }
            res.end(JSON.stringify(response(200, 'success', safeMock)))
            return
          }

          // ---- Practice: Start sprint ----
          if (url.startsWith('v1/practice/sprint/') && url.endsWith('/start') && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            // Check if user has purchased any question bank
            const sprintProduct = (req.body || {}).product_id
            const hasBankSprint = sprintProduct
              ? shopData.library.some(l => l.user_id === userId && l.product_id === sprintProduct)
              : shopData.library.some(l => l.user_id === userId && shopData.products.find(p => p.product_id === l.product_id && p.is_question_bank))
            if (!hasBankSprint) {
              res.end(JSON.stringify(response(403, '请先购买题库'))); return
            }

            for (const [, s] of practiceData.sessions) {
              if (s.user_id === userId && s.status === 'ongoing') {
                res.end(JSON.stringify(response(400, '有未完成的练习'))); return
              }
            }

            const questions = shuffleArray(practiceData.questions).slice(0, 10)
            const sessionId = 'sess_' + uuid().split('-')[0]
            const session = {
              session_id: sessionId, user_id: userId, paper_type: 'sprint',
              paper_snapshot: { paper_id: 'paper_001', title: '模拟练习', duration: null, questions, total_count: questions.length },
              user_answers: {}, current_index: 1, total_duration: null, remaining_seconds: null,
              start_time: now(), end_time: null, total_score: null, correct_count: null,
              wrong_count: null, unanswered_count: null, score_detail: null, status: 'ongoing',
              created_at: now(), updated_at: now(),
            }
            practiceData.sessions.set(sessionId, session)
            console.log(`[Mock] Sprint started: ${sessionId}`)
            // Sprint mode: keep answers for instant feedback
            const safeSprint = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: questions, // keep answer/explanation for client-side feedback
              },
            }
            res.end(JSON.stringify(response(200, 'success', safeSprint)))
            return
          }

          // ---- Practice: Get session ----
          if (url.startsWith('v1/practice/session/') && !url.includes('/save') && !url.includes('/pause') && !url.includes('/resume') && !url.includes('/submit') && !url.includes('/abandon') && !url.includes('/ongoing') && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session) { res.end(JSON.stringify(response(404, '会话不存在'))); return }
            if (session.user_id !== userId) { res.end(JSON.stringify(response(403, '无权访问'))); return }
            // Strip answers from questions for client (keep answers for sprint mode)
            const safeSession = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: session.paper_type === 'sprint'
                  ? session.paper_snapshot.questions
                  : session.paper_snapshot.questions.map(q => {
                      const { answer, explanation, ...safe } = q
                      return safe
                    }),
              },
            }
            res.end(JSON.stringify(response(200, 'success', safeSession)))
            return
          }

          // ---- Practice: Save progress ----
          if (url.match(/^v1\/practice\/session\/[^/]+\/save$/) && method === 'PUT') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session || session.user_id !== userId) { res.end(JSON.stringify(response(403, '无权访问'))); return }
            if (session.status !== 'ongoing') { res.end(JSON.stringify(response(400, '会话已结束'))); return }

            if (req.body.user_answers) session.user_answers = { ...session.user_answers, ...req.body.user_answers }
            if (req.body.current_index) session.current_index = req.body.current_index
            if (req.body.remaining_seconds !== undefined) session.remaining_seconds = req.body.remaining_seconds
            session.updated_at = now()

            res.end(JSON.stringify(response(200, '进度已保存')))
            return
          }

          // ---- Practice: Submit exam ----
          if (url.match(/^v1\/practice\/session\/[^/]+\/submit$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session || session.user_id !== userId) { res.end(JSON.stringify(response(403, '无权访问'))); return }
            if (session.status !== 'ongoing') { res.end(JSON.stringify(response(400, '会话已结束'))); return }

            // Grade the exam
            const questions = session.paper_snapshot.questions
            let correct = 0, wrong = 0, unanswered = 0
            const scoreDetail = {}

            questions.forEach((q, idx) => {
              const userAnswer = session.user_answers[String(idx + 1)]
              const correctAnswer = q.answer

              if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
                unanswered++
                scoreDetail[String(idx + 1)] = { user_answer: null, correct_answer: correctAnswer, is_correct: false }
              } else if (q.question_type === 'multi') {
                // Multi-choice: compare sorted arrays
                const userSorted = Array.isArray(userAnswer) ? [...userAnswer].sort() : String(userAnswer).split('').sort()
                const correctSorted = String(correctAnswer).split('').sort()
                const isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted)
                if (isCorrect) {
                  correct++
                } else {
                  wrong++
                }
                scoreDetail[String(idx + 1)] = { user_answer: userSorted, correct_answer: correctSorted, is_correct: isCorrect }
                // Add to wrong book for multi-choice
                if (!isCorrect) {
                  const wbKey = `${userId}_${q.question_id}`
                  if (!practiceData.wrongBook.has(wbKey)) {
                    practiceData.wrongBook.set(wbKey, {
                      record_id: 'wb_' + uuid().split('-')[0],
                      user_id: userId,
                      question_id: q.question_id,
                      question_snapshot: q,
                      wrong_count: 1,
                      last_wrong_time: now(),
                      is_removed: false,
                    })
                  } else {
                    const wb = practiceData.wrongBook.get(wbKey)
                    wb.wrong_count++
                    wb.last_wrong_time = now()
                  }
                }
              } else {
                // Single/judge
                const userStr = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer
                if (userStr === correctAnswer) {
                  correct++
                  scoreDetail[String(idx + 1)] = { user_answer: userStr, correct_answer: correctAnswer, is_correct: true }
                } else {
                  wrong++
                  scoreDetail[String(idx + 1)] = { user_answer: userStr, correct_answer: correctAnswer, is_correct: false }
                  // Add to wrong book for single/judge
                  const wbKey = `${userId}_${q.question_id}`
                  if (!practiceData.wrongBook.has(wbKey)) {
                    practiceData.wrongBook.set(wbKey, {
                      record_id: 'wb_' + uuid().split('-')[0],
                      user_id: userId,
                      question_id: q.question_id,
                      question_snapshot: q,
                      wrong_count: 1,
                      last_wrong_time: now(),
                      is_removed: false,
                    })
                  } else {
                    const wb = practiceData.wrongBook.get(wbKey)
                    wb.wrong_count++
                    wb.last_wrong_time = now()
                  }
                }
              }
            })

            const total = questions.length
            const score = Math.round((correct / total) * 100)

            session.status = 'finished'
            session.end_time = now()
            session.total_score = score
            session.correct_count = correct
            session.wrong_count = wrong
            session.unanswered_count = unanswered
            session.score_detail = scoreDetail
            session.updated_at = now()

            // Record study record
            practiceData.studyRecords.push({
              record_id: 'sr_' + uuid().split('-')[0],
              user_id: userId,
              date: new Date().toISOString().split('T')[0],
              session_id: sessionId,
              paper_type: session.paper_type,
              question_count: total,
              correct_count: correct,
              duration_seconds: session.total_duration ? session.total_duration - (session.remaining_seconds || 0) : Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000),
              created_at: now(),
            })

            console.log(`[Mock] Exam submitted: ${sessionId} (score: ${score}, correct: ${correct}/${total})`)
            // Strip answers from response
            const safeResult = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: session.paper_snapshot.questions.map(q => { const { answer, explanation, ...s } = q; return s }),
              },
            }
            res.end(JSON.stringify(response(200, '交卷成功', safeResult)))
            return
          }

          // ---- Practice: Abandon session ----
          if (url.match(/^v1\/practice\/session\/[^/]+\/abandon$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session || session.user_id !== userId) { res.end(JSON.stringify(response(403, '无权访问'))); return }
            session.status = 'abandoned'
            session.updated_at = now()
            res.end(JSON.stringify(response(200, '已放弃')))
            return
          }

          // ---- Practice: Get ongoing session ----
          if (url === 'v1/practice/session/ongoing' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            for (const [, s] of practiceData.sessions) {
              if (s.user_id === userId && s.status === 'ongoing') {
                // Strip answers from questions for client
                const safeSession = {
                  ...s,
                  paper_snapshot: {
                    ...s.paper_snapshot,
                    questions: s.paper_snapshot.questions.map(q => {
                      const { answer, explanation, ...safe } = q
                      return safe
                    }),
                  },
                }
                res.end(JSON.stringify(response(200, 'success', safeSession)))
                return
              }
            }
            res.end(JSON.stringify(response(200, 'success', null)))
            return
          }

          // ---- Practice: Get result ----
          if (url.match(/^v1\/practice\/result\/[^/]+$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session) { res.end(JSON.stringify(response(404, '会话不存在'))); return }
            if (session.status !== 'finished') { res.end(JSON.stringify(response(400, '尚未交卷'))); return }

            const result = {
              ...session,
              duration_display: session.total_duration
                ? `${Math.floor((session.total_duration - (session.remaining_seconds || 0)) / 60)}分${(session.total_duration - (session.remaining_seconds || 0)) % 60}秒`
                : `${Math.floor(Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000) / 60)}分${Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000) % 60}秒`,
              questions_with_answers: session.paper_snapshot.questions.map((q, idx) => ({
                ...q,
                index: idx + 1,
                user_answer: session.user_answers[String(idx + 1)] || null,
                is_correct: session.score_detail[String(idx + 1)]?.is_correct || false,
              })),
            }
            res.end(JSON.stringify(response(200, 'success', result)))
            return
          }

          // ---- Practice: Personal rank ----
          if (url.match(/^v1\/practice\/result\/[^/]+\/rank$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const sessionId = url.split('/')[3]
            const session = practiceData.sessions.get(sessionId)
            if (!session) { res.end(JSON.stringify(response(404, '会话不存在'))); return }

            // Personal history
            const userSessions = [...practiceData.sessions.values()].filter(
              s => s.user_id === userId && s.status === 'finished' && s.paper_type === session.paper_type
            )
            const scores = userSessions.map(s => s.total_score).filter(Boolean)
            const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
            const bestScore = scores.length ? Math.max(...scores) : 0

            res.end(JSON.stringify(response(200, 'success', {
              current_score: session.total_score,
              avg_score: avgScore,
              best_score: bestScore,
              total_attempts: scores.length,
            })))
            return
          }

          // ---- Wrong book ----
          if (url === 'v1/practice/wrongbook' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const list = [...practiceData.wrongBook.values()].filter(w => w.user_id === userId && !w.is_removed)
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Wrong book add (immediate) ----
          if (url === 'v1/practice/wrongbook/add' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { question_id } = req.body
            if (!question_id) { res.end(JSON.stringify(response(400, '缺少题目ID'))); return }
            const wbKey = `${userId}_${question_id}`
            if (!practiceData.wrongBook.has(wbKey)) {
              const q = practiceData.questions.find(q => q.question_id === question_id)
              practiceData.wrongBook.set(wbKey, {
                record_id: 'wb_' + uuid().split('-')[0],
                user_id: userId,
                question_id,
                question_snapshot: q || { question_id, stem: '题目数据', options: [], answer: '' },
                wrong_count: 1,
                last_wrong_time: now(),
                is_removed: false,
              })
            } else {
              const wb = practiceData.wrongBook.get(wbKey)
              wb.wrong_count++
              wb.last_wrong_time = now()
              wb.is_removed = false
            }
            res.end(JSON.stringify(response(200, '已记录')))
            return
          }

          // ---- Wrong book export ----
          if (url === 'v1/practice/wrongbook/export' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const items = [...practiceData.wrongBook.values()]
              .filter(w => w.user_id === userId && !w.is_removed)
              .sort((a, b) => (b.last_wrong_time || '').localeCompare(a.last_wrong_time || ''))
              .slice(0, 200)
            // Add user_answer from sessions
            const enriched = items.map(item => {
              const q = item.question_snapshot || {}
              return {
                ...item,
                user_answer: null, // not tracked in wrongbook snapshot
                is_correct: false,
              }
            })
            res.end(JSON.stringify(response(200, 'success', { items: enriched, total: enriched.length })))
            return
          }

          // ---- Wrong book remove ----
          if (url.match(/^v1\/practice\/wrongbook\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const recordId = url.split('/')[3]
            for (const [key, wb] of practiceData.wrongBook) {
              if (wb.record_id === recordId && wb.user_id === userId) {
                wb.is_removed = true
                res.end(JSON.stringify(response(200, '已移除')))
                return
              }
            }
            res.end(JSON.stringify(response(404, '记录不存在')))
            return
          }

          // ---- Wrong book redo ----
          if (url.match(/^v1\/practice\/wrongbook\/[^/]+\/redo$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            // Check for ongoing session
            for (const [, s] of practiceData.sessions) {
              if (s.user_id === userId && s.status === 'ongoing') {
                res.end(JSON.stringify(response(400, '有未完成的练习，请先完成或放弃', { session_id: s.session_id })))
                return
              }
            }

            // Get wrong book entries for this user
            const wrongEntries = [...practiceData.wrongBook.values()].filter(w => w.user_id === userId && !w.is_removed)
            if (wrongEntries.length === 0) {
              res.end(JSON.stringify(response(400, '错题本为空')))
              return
            }

            // Take up to 20 wrong questions
            const redoQuestions = shuffleArray(wrongEntries).slice(0, 20).map(w => w.question_snapshot)
            const sessionId = 'sess_' + uuid().split('-')[0]
            const session = {
              session_id: sessionId,
              user_id: userId,
              paper_type: 'wrongbook',
              paper_snapshot: { paper_id: null, title: '错题重做', duration: null, questions: redoQuestions, total_count: redoQuestions.length },
              user_answers: {},
              current_index: 1,
              total_duration: null,
              remaining_seconds: null,
              start_time: now(),
              end_time: null,
              total_score: null,
              correct_count: null,
              wrong_count: null,
              unanswered_count: null,
              score_detail: null,
              status: 'ongoing',
              created_at: now(),
              updated_at: now(),
            }
            practiceData.sessions.set(sessionId, session)
            console.log(`[Mock] Wrongbook redo started: ${sessionId} (${redoQuestions.length} questions)`)
            const safeSession = {
              ...session,
              paper_snapshot: {
                ...session.paper_snapshot,
                questions: redoQuestions.map(q => { const { answer, explanation, ...s } = q; return s }),
              },
            }
            res.end(JSON.stringify(response(200, 'success', safeSession)))
            return
          }

          // ---- Favorites ----
          if (url === 'v1/practice/favorites' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const list = [...practiceData.favorites.values()].filter(f => f.user_id === userId)
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          if (url.match(/^v1\/practice\/favorites\/[^/]+$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const questionId = url.split('/')[3]
            const key = `${userId}_${questionId}`
            if (practiceData.favorites.has(key)) { res.end(JSON.stringify(response(400, '已收藏'))); return }
            practiceData.favorites.set(key, { favorite_id: 'fav_' + uuid().split('-')[0], user_id: userId, question_id: questionId, created_at: now() })
            res.end(JSON.stringify(response(200, '收藏成功')))
            return
          }

          if (url.match(/^v1\/practice\/favorites\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const questionId = url.split('/')[3]
            practiceData.favorites.delete(`${userId}_${questionId}`)
            res.end(JSON.stringify(response(200, '已取消收藏')))
            return
          }

          // ---- Study stats ----
          if (url === 'v1/practice/stats' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const records = practiceData.studyRecords.filter(r => r.user_id === userId)
            const totalQuestions = records.reduce((sum, r) => sum + r.question_count, 0)
            const totalCorrect = records.reduce((sum, r) => sum + r.correct_count, 0)
            const totalDuration = records.reduce((sum, r) => sum + r.duration_seconds, 0)
            const today = new Date().toISOString().split('T')[0]
            const todayRecords = records.filter(r => r.date === today)
            const todayQuestions = todayRecords.reduce((sum, r) => sum + r.question_count, 0)

            res.end(JSON.stringify(response(200, 'success', {
              today_questions: todayQuestions,
              total_questions: totalQuestions,
              accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
              total_duration_hours: Math.round(totalDuration / 3600 * 10) / 10,
            })))
            return
          }

          // ---- Study history ----
          if (url === 'v1/practice/history' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const records = practiceData.studyRecords.filter(r => r.user_id === userId)
            res.end(JSON.stringify(response(200, 'success', { list: records, total: records.length })))
            return
          }

          // ---- Wrong book stats ----
          if (url === 'v1/practice/wrongbook/stats' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const list = [...practiceData.wrongBook.values()].filter(w => w.user_id === userId && !w.is_removed)
            res.end(JSON.stringify(response(200, 'success', { total: list.length })))
            return
          }

          // ---- Practice: Pause session (stub) ----
          if (url.match(/^v1\/practice\/session\/[^/]+\/pause$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            res.end(JSON.stringify(response(200, '已暂停')))
            return
          }

          // ---- Practice: Resume session (stub) ----
          if (url.match(/^v1\/practice\/session\/[^/]+\/resume$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            res.end(JSON.stringify(response(200, '已恢复')))
            return
          }

          // ---- Practice: Stats trend (30 days) ----
          if (url === 'v1/practice/stats/trend' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const records = practiceData.studyRecords.filter(r => r.user_id === userId)
            // Build 30-day trend
            const trend = []
            for (let i = 29; i >= 0; i--) {
              const d = new Date()
              d.setDate(d.getDate() - i)
              const dateStr = d.toISOString().split('T')[0]
              const dayRecords = records.filter(r => r.date === dateStr)
              const questions = dayRecords.reduce((sum, r) => sum + r.question_count, 0)
              const correct = dayRecords.reduce((sum, r) => sum + r.correct_count, 0)
              const duration = dayRecords.reduce((sum, r) => sum + r.duration_seconds, 0)
              trend.push({
                date: dateStr,
                questions,
                correct,
                accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
                duration_seconds: duration,
              })
            }
            res.end(JSON.stringify(response(200, 'success', { trend })))
            return
          }

          // ---- Practice: Knowledge tree ----
          if (url === 'v1/practice/knowledge/tree' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            // Return a simple knowledge tree based on question categories
            const categories = {}
            practiceData.questions.forEach(q => {
              const path = q.knowledge_path || '未分类'
              if (!categories[path]) categories[path] = { name: path, count: 0 }
              categories[path].count++
            })
            const tree = Object.values(categories).map(c => ({
              id: c.name,
              name: c.name,
              question_count: c.count,
              children: [],
            }))
            res.end(JSON.stringify(response(200, 'success', { tree })))
            return
          }

          // ========================
          // Coin & Sign-in Mock Data
          // ========================
          if (!globalThis.__mockCoinData) {
            globalThis.__mockCoinData = {
              signLogs: new Map(),
              coinAccounts: new Map(),
              transactions: [],
            }
          }
          const coinData = globalThis.__mockCoinData

          function getTodayStr() {
            return new Date().toISOString().split('T')[0]
          }

          function getYesterdayStr() {
            const d = new Date()
            d.setDate(d.getDate() - 1)
            return d.toISOString().split('T')[0]
          }

          function calcFixedReward(streak) {
            if (streak <= 0) return 0
            if (streak <= 7) return streak
            if (streak <= 14) return 8
            return 10
          }

          function ensureCoinAccount(userId) {
            if (!coinData.coinAccounts.has(userId)) {
              coinData.coinAccounts.set(userId, {
                account_id: 'ca_' + uuid().split('-')[0],
                user_id: userId,
                balance: 0,
                total_earned: 0,
                total_spent: 0,
                created_at: now(),
                updated_at: now(),
              })
            }
            return coinData.coinAccounts.get(userId)
          }

          function addTransaction(userId, amount, type, scene, description) {
            const account = ensureCoinAccount(userId)
            account.balance += amount
            if (amount > 0) account.total_earned += amount
            else account.total_spent += Math.abs(amount)
            account.updated_at = now()

            const tx = {
              transaction_id: 'tx_' + uuid().split('-')[0],
              user_id: userId,
              amount,
              type,
              scene,
              description,
              balance_after: account.balance,
              created_at: now(),
            }
            coinData.transactions.push(tx)
            return tx
          }

          // ---- Coin: Sign in ----
          if (url === 'v1/coin/sign' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const today = getTodayStr()
            const yesterday = getYesterdayStr()
            const signKey = `${userId}_${today}`

            if (coinData.signLogs.has(signKey)) {
              res.end(JSON.stringify(response(400, '今天已签到')))
              return
            }

            const { random_number } = req.body || {}

            // Calculate streak
            const yesterdayKey = `${userId}_${yesterday}`
            const yesterdayLog = coinData.signLogs.get(yesterdayKey)
            const streakDays = yesterdayLog ? yesterdayLog.streak_days + 1 : 1

            // Fixed reward
            const fixedReward = calcFixedReward(streakDays)

            // Probability reward (every 3 days when streak >= 15)
            let probReward = null
            let probRange = null
            const rand = (typeof random_number === 'number' && random_number >= 0 && random_number <= 1)
              ? random_number
              : Math.random()

            if (streakDays >= 15 && streakDays % 3 === 0) {
              if (rand < 0.5) {
                probReward = Math.floor(Math.random() * 31) + 20 // 20-50
                probRange = '20-50'
              } else if (rand < 0.85) {
                probReward = Math.floor(Math.random() * 31) + 50 // 50-80
                probRange = '51-80'
              } else {
                probReward = Math.floor(Math.random() * 21) + 80 // 80-100
                probRange = '81-100'
              }
            }

            const totalReward = fixedReward + (probReward || 0)

            // Write sign log
            const log = {
              log_id: 'sl_' + uuid().split('-')[0],
              user_id: userId,
              sign_date: today,
              streak_days: streakDays,
              fixed_reward: fixedReward,
              prob_reward: probReward,
              random_number: rand,
              prob_range: probRange,
              created_at: now(),
            }
            coinData.signLogs.set(signKey, log)

            // Write coin transaction
            ensureCoinAccount(userId)
            addTransaction(userId, totalReward, 'earn', 'sign', `签到奖励（第${streakDays}天）`)

            const account = coinData.coinAccounts.get(userId)

            console.log(`[Mock] Sign-in: ${userId} day ${streakDays}, +${totalReward} coins (fixed:${fixedReward} prob:${probReward || 0})`)
            res.end(JSON.stringify(response(200, '签到成功', {
              streak_days: streakDays,
              fixed_reward: fixedReward,
              prob_reward: probReward,
              prob_range: probRange,
              total_reward: totalReward,
              balance: account.balance,
            })))
            return
          }

          // ---- Coin: Sign status ----
          if (url === 'v1/coin/sign/status' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const today = getTodayStr()
            const todayKey = `${userId}_${today}`
            const todayLog = coinData.signLogs.get(todayKey)

            // Calculate current streak
            let streakDays = 0
            let checkDate = new Date()
            while (true) {
              const dateStr = checkDate.toISOString().split('T')[0]
              const key = `${userId}_${dateStr}`
              if (coinData.signLogs.has(key)) {
                streakDays++
                checkDate.setDate(checkDate.getDate() - 1)
              } else {
                break
              }
            }

            res.end(JSON.stringify(response(200, 'success', {
              signed_today: !!todayLog,
              streak_days: streakDays,
              today_reward: todayLog ? todayLog.fixed_reward + (todayLog.prob_reward || 0) : null,
            })))
            return
          }

          // ---- Coin: Sign logs ----
          if (url === 'v1/coin/sign/logs' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const logs = [...coinData.signLogs.values()]
              .filter(l => l.user_id === userId)
              .sort((a, b) => b.sign_date.localeCompare(a.sign_date))

            res.end(JSON.stringify(response(200, 'success', { list: logs, total: logs.length })))
            return
          }

          // ---- Coin: Balance ----
          if (url === 'v1/coin/balance' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const account = ensureCoinAccount(userId)
            res.end(JSON.stringify(response(200, 'success', {
              balance: account.balance,
              total_earned: account.total_earned,
              total_spent: account.total_spent,
            })))
            return
          }

          // ---- Coin: Transactions ----
          if (url === 'v1/coin/transactions' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const list = coinData.transactions
              .filter(tx => tx.user_id === userId)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))

            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Coin: Probability log ----
          if (url === 'v1/coin/prob-log' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const logs = [...coinData.signLogs.values()]
              .filter(l => l.user_id === userId && l.prob_reward !== null)
              .sort((a, b) => b.sign_date.localeCompare(a.sign_date))

            res.end(JSON.stringify(response(200, 'success', { list: logs, total: logs.length })))
            return
          }

          // ---- Coin: Recharge plans ----
          if (url === 'v1/coin/recharge/plans' && method === 'GET') {
            res.end(JSON.stringify(response(200, 'success', { plans: [
              { plan_id: 'plan_6',   rmb: 6,   coin: 600,   tag: '' },
              { plan_id: 'plan_18',  rmb: 18,  coin: 1800,  tag: '热门' },
              { plan_id: 'plan_30',  rmb: 30,  coin: 3000,  tag: '超值' },
              { plan_id: 'plan_68',  rmb: 68,  coin: 6800,  tag: '' },
              { plan_id: 'plan_128', rmb: 128, coin: 12800, tag: '' },
              { plan_id: 'plan_328', rmb: 328, coin: 32800, tag: '' },
            ]})))
            return
          }

          // ---- Coin: Recharge create ----
          if (url === 'v1/coin/recharge/create' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const { plan_id, payment_method = 'wechat' } = req.body
            const plans = [
              { plan_id: 'plan_6',   rmb: 6,   coin: 600 },
              { plan_id: 'plan_18',  rmb: 18,  coin: 1800 },
              { plan_id: 'plan_30',  rmb: 30,  coin: 3000 },
              { plan_id: 'plan_68',  rmb: 68,  coin: 6800 },
              { plan_id: 'plan_128', rmb: 128, coin: 12800 },
              { plan_id: 'plan_328', rmb: 328, coin: 32800 },
            ]
            const plan = plans.find(p => p.plan_id === plan_id)
            if (!plan) { res.end(JSON.stringify(response(404, '套餐不存在'))); return }

            const rechargeId = 'rch_' + uuid().split('-')[0]
            if (!globalThis.__mockRechargeOrders) globalThis.__mockRechargeOrders = []
            globalThis.__mockRechargeOrders.push({
              recharge_id: rechargeId, user_id: userId, plan_id,
              amount_rmb: plan.rmb * 100, amount_coin: plan.coin,
              payment_method, status: 'pending', created_at: now(),
              expire_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            })

            res.end(JSON.stringify(response(200, 'success', {
              recharge_id: rechargeId, amount_rmb: plan.rmb, amount_coin: plan.coin,
              payment_method, status: 'pending',
            })))
            return
          }

          // ---- Coin: Recharge pay ----
          if (url.match(/^v1\/coin\/recharge\/[^/]+\/pay$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const rechargeId = url.split('/')[3]
            if (!globalThis.__mockRechargeOrders) globalThis.__mockRechargeOrders = []
            const order = globalThis.__mockRechargeOrders.find(o => o.recharge_id === rechargeId)
            if (!order) { res.end(JSON.stringify(response(404, '充值订单不存在'))); return }
            if (order.user_id !== userId) { res.end(JSON.stringify(response(403, '无权操作'))); return }
            if (order.status === 'paid') { res.end(JSON.stringify(response(200, '已支付', { recharge_id: rechargeId, status: 'paid' }))); return }
            if (order.status !== 'pending') { res.end(JSON.stringify(response(400, `订单状态异常：${order.status}`))); return }

            // Simulate successful payment
            order.status = 'paid'
            order.paid_at = now()
            addTransaction(userId, order.amount_coin, 'earn', 'recharge', `充值${order.amount_rmb / 100}元获得${order.amount_coin}虚拟币`)

            const account = coinData.coinAccounts.get(userId)
            console.log(`[Mock] Recharge paid: ${rechargeId}, +${order.amount_coin} coins`)
            res.end(JSON.stringify(response(200, '充值成功', {
              recharge_id: rechargeId, status: 'paid', amount_coin: order.amount_coin, balance: account.balance,
            })))
            return
          }

          // ---- Coin: Recharge callback ----
          if (url === 'v1/coin/recharge/callback' && method === 'POST') {
            const { recharge_id, transaction_id, status: payStatus } = req.body
            if (!recharge_id) { res.end(JSON.stringify(response(400, '缺少充值订单ID'))); return }
            if (!globalThis.__mockRechargeOrders) globalThis.__mockRechargeOrders = []
            const order = globalThis.__mockRechargeOrders.find(o => o.recharge_id === recharge_id)
            if (!order) { res.end(JSON.stringify(response(404, '充值订单不存在'))); return }
            if (order.status !== 'pending') { res.end(JSON.stringify(response(200, '已处理'))); return }

            if (payStatus === 'success') {
              order.status = 'paid'
              order.paid_at = now()
              order.transaction_id = transaction_id
              addTransaction(order.user_id, order.amount_coin, 'earn', 'recharge', `充值${order.amount_rmb / 100}元获得${order.amount_coin}虚拟币`)
              console.log(`[Mock] Recharge callback (success): ${recharge_id}`)
              res.end(JSON.stringify(response(200, '充值确认成功')))
              return
            }
            res.end(JSON.stringify(response(400, '充值未成功')))
            return
          }

          // ---- Coin: Invite code ----
          if (url === 'v1/coin/invite/code' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const user = mockUsers.get(userId)
            let code = user?.invite_code
            if (!code) {
              code = userId.slice(-4) + Math.random().toString(36).slice(2, 6).toUpperCase()
              if (user) user.invite_code = code
            }

            const invitedCount = [...mockUsers.values()].filter(u => u.invited_by === userId).length
            res.end(JSON.stringify(response(200, 'success', { invite_code: code, invited_count: invitedCount, invite_reward: 200 })))
            return
          }

          // ---- Coin: Invite records ----
          if (url === 'v1/coin/invite/records' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const invited = [...mockUsers.values()]
              .filter(u => u.invited_by === userId)
              .map(u => ({ user_id: u.user_id, nickname: u.nickname, reward: 200, invited_at: u.created_at }))
              .sort((a, b) => b.invited_at.localeCompare(a.invited_at))

            res.end(JSON.stringify(response(200, 'success', { list: invited, total: invited.length })))
            return
          }

          // ========================
          // Correction Mock Data
          // ========================
          if (!globalThis.__mockCorrections) {
            globalThis.__mockCorrections = []
          }
          const correctionsData = globalThis.__mockCorrections

          // ---- Correction: Submit ----
          if (url === 'v1/correction/submit' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { question_id, product_id, error_description, correct_content } = req.body
            if (!error_description) { res.end(JSON.stringify(response(400, '请描述错误'))); return }
            const correctionId = 'cor_' + uuid().split('-')[0]
            correctionsData.push({
              correction_id: correctionId, user_id: userId, question_id: question_id || null,
              product_id: product_id || null, error_description, correct_content: correct_content || '',
              status: 'pending', reward_amount: 0, created_at: now(), updated_at: now(),
            })
            res.end(JSON.stringify(response(200, '提交成功', { correction_id: correctionId })))
            return
          }

          // ---- Correction: My list ----
          if (url === 'v1/correction/my/list' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const list = correctionsData.filter(c => c.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Correction: Leaderboard ----
          if (url === 'v1/correction/leaderboard' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            res.end(JSON.stringify(response(200, 'success', { list: [], total: 0 })))
            return
          }

          // ========================
          // Feed Mock Data
          // ========================
          if (!globalThis.__mockFeedData) {
            globalThis.__mockFeedData = {
              posts: [],
              comments: [],
              interactions: [],
              searchHistory: [],
            }
          }
          const feedData = globalThis.__mockFeedData

          function enrichPost(post, userId) {
            const user = mockUsers.get(post.user_id)
            const liked = feedData.interactions.some(i => i.user_id === userId && i.target_type === 'post' && i.target_id === post.post_id && i.action_type === 'like')
            const favorited = feedData.interactions.some(i => i.user_id === userId && i.target_type === 'post' && i.target_id === post.post_id && i.action_type === 'favorite')
            return {
              ...post,
              user: user ? { user_id: user.user_id, nickname: user.nickname, avatar: user.avatar } : { user_id: post.user_id, nickname: '未知用户', avatar: '' },
              is_liked: liked,
              is_favorited: favorited,
            }
          }

          // Seed some posts if empty
          if (feedData.posts.length === 0) {
            const seedPosts = [
              { content: '高数期末复习心得：极限和积分是重点，建议先把课本例题过一遍再刷题。', topic_tags: ['高等数学', '期末复习'], user_id: 'admin' },
              { content: '微观经济学的弹性概念终于搞懂了！关键是要理解价格变动对需求量的敏感程度。', topic_tags: ['微观经济学', '学习笔记'], user_id: 'admin' },
              { content: '英语四级单词打卡 Day 15 📝 坚持就是胜利！', topic_tags: ['英语', '四级'], user_id: 'admin' },
            ]
            seedPosts.forEach((sp, idx) => {
              feedData.posts.push({
                post_id: `post_seed_${idx + 1}`,
                user_id: sp.user_id,
                content: sp.content,
                images: [],
                topic_tags: sp.topic_tags,
                wearing_badge_id: null,
                knowledge_id: null,
                is_official: false,
                visibility: 'public',
                is_promoted: false,
                promote_expire_at: null,
                like_count: Math.floor(Math.random() * 50),
                comment_count: Math.floor(Math.random() * 10),
                share_count: Math.floor(Math.random() * 5),
                favorite_count: Math.floor(Math.random() * 20),
                initial_heat: 10,
                status: 'normal',
                created_at: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
                updated_at: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
              })
            })
          }

          // ---- Feed: Recommend ----
          if (url === 'v1/feed/recommend' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            const sortType = req.query?.sort || 'time'
            const filtered = [...feedData.posts].filter(p => p.status === 'normal')
            let sorted
            if (sortType === 'hot') {
              sorted = filtered.sort((a, b) => {
                const heatA = a.initial_heat + a.like_count * 2 + a.comment_count * 3 + (a.is_promoted ? 100 : 0)
                const heatB = b.initial_heat + b.like_count * 2 + b.comment_count * 3 + (b.is_promoted ? 100 : 0)
                return heatB - heatA || new Date(b.created_at) - new Date(a.created_at)
              })
            } else {
              sorted = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            }
            const start = (page - 1) * pageSize
            const list = sorted.slice(start, start + pageSize).map(p => enrichPost(p, userId))
            res.end(JSON.stringify(response(200, 'success', { list, total: sorted.length, page, page_size: pageSize })))
            return
          }

          // ---- Feed: Following ----
          if (url === 'v1/feed/following' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const follows = (globalThis.__mockFollows || []).filter(f => f.follower_id === userId)
            const followingIds = follows.map(f => f.following_id)
            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            let posts = feedData.posts.filter(p => followingIds.includes(p.user_id) && p.status === 'normal')
            posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const start = (page - 1) * pageSize
            const list = posts.slice(start, start + pageSize).map(p => enrichPost(p, userId))
            res.end(JSON.stringify(response(200, 'success', { list, total: posts.length, page, page_size: pageSize })))
            return
          }

          // ---- Feed: Post detail ----
          if (url.match(/^v1\/feed\/post\/[^/]+$/) && !url.includes('/comments') && !url.includes('/promote') && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId && p.status !== 'deleted')
            if (!post) { res.end(JSON.stringify(response(404, '帖子不存在'))); return }
            res.end(JSON.stringify(response(200, 'success', enrichPost(post, userId))))
            return
          }

          // ---- Feed: Create post ----
          if (url === 'v1/feed/post' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { content, images, topic_tags, visibility = 'public' } = req.body
            if (!content || !content.trim()) { res.end(JSON.stringify(response(400, '请输入内容'))); return }
            const postId = 'post_' + uuid().split('-')[0]
            const ts = now()
            feedData.posts.push({
              post_id: postId, user_id: userId, content: content.trim(), images: images || [],
              topic_tags: topic_tags || [], wearing_badge_id: null, knowledge_id: null,
              is_official: false, visibility, is_promoted: false, promote_expire_at: null,
              like_count: 0, comment_count: 0, share_count: 0, favorite_count: 0,
              initial_heat: 10, status: 'normal', created_at: ts, updated_at: ts,
            })
            res.end(JSON.stringify(response(200, '发布成功', { post_id: postId })))
            return
          }

          // ---- Feed: Delete post ----
          if (url.match(/^v1\/feed\/post\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId)
            if (!post) { res.end(JSON.stringify(response(404, '帖子不存在'))); return }
            if (post.user_id !== userId) { res.end(JSON.stringify(response(403, '无权删除'))); return }
            post.status = 'deleted'
            post.updated_at = now()
            res.end(JSON.stringify(response(200, '删除成功')))
            return
          }

          // ---- Feed: Update visibility ----
          if (url.match(/^v1\/feed\/post\/[^/]+\/visibility$/) && method === 'PUT') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId)
            if (!post) { res.end(JSON.stringify(response(404, '帖子不存在'))); return }
            if (post.user_id !== userId) { res.end(JSON.stringify(response(403, '无权操作'))); return }
            const { visibility } = req.body
            if (!['public', 'followers', 'private'].includes(visibility)) { res.end(JSON.stringify(response(400, '无效的可见性'))); return }
            if (visibility === 'private') post.prev_visibility = post.visibility
            post.visibility = visibility
            post.updated_at = now()
            res.end(JSON.stringify(response(200, '更新成功')))
            return
          }

          // ---- Feed: Comments list ----
          if (url.match(/^v1\/feed\/post\/[^/]+\/comments$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const topLevel = feedData.comments.filter(c => c.post_id === postId && c.status === 'normal' && !c.parent_id)
            const replies = feedData.comments.filter(c => c.post_id === postId && c.status === 'normal' && c.parent_id)
            const userMap = {}
            ;[...topLevel, ...replies].forEach(c => {
              if (!userMap[c.user_id]) {
                const u = mockUsers.get(c.user_id)
                userMap[c.user_id] = u ? { user_id: u.user_id, nickname: u.nickname, avatar: u.avatar } : { user_id: c.user_id, nickname: '未知', avatar: '' }
              }
            })
            const list = topLevel.map(c => ({
              ...c, user: userMap[c.user_id],
              replies: replies.filter(r => r.parent_id === c.comment_id).map(r => ({ ...r, user: userMap[r.user_id] })),
            }))
            res.end(JSON.stringify(response(200, 'success', { list, total: topLevel.length })))
            return
          }

          // ---- Feed: Create comment ----
          if (url.match(/^v1\/feed\/post\/[^/]+\/comment$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId && p.status === 'normal')
            if (!post) { res.end(JSON.stringify(response(404, '帖子不存在'))); return }
            const { content, parent_id, reply_to_user_id, mentioned_users } = req.body
            if (!content) { res.end(JSON.stringify(response(400, '请输入评论内容'))); return }
            const commentId = 'cmt_' + uuid().split('-')[0]
            feedData.comments.push({
              comment_id: commentId, post_id: postId, user_id: userId, content,
              parent_id: parent_id || null, reply_to_user_id: reply_to_user_id || null,
              mentioned_users: mentioned_users || [], like_count: 0, status: 'normal', created_at: now(),
            })
            post.comment_count++
            res.end(JSON.stringify(response(200, '评论成功', { comment_id: commentId })))
            return
          }

          // ---- Feed: Delete comment ----
          if (url.match(/^v1\/feed\/comment\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const commentId = url.split('/')[3]
            const comment = feedData.comments.find(c => c.comment_id === commentId)
            if (!comment) { res.end(JSON.stringify(response(404, '评论不存在'))); return }
            if (comment.user_id !== userId) { res.end(JSON.stringify(response(403, '无权删除'))); return }
            comment.status = 'deleted'
            const post = feedData.posts.find(p => p.post_id === comment.post_id)
            if (post) post.comment_count--
            res.end(JSON.stringify(response(200, '删除成功')))
            return
          }

          // ---- Feed: Like ----
          if (url === 'v1/feed/like' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { target_type = 'post', target_id } = req.body
            if (feedData.interactions.some(i => i.user_id === userId && i.target_type === target_type && i.target_id === target_id && i.action_type === 'like')) {
              res.end(JSON.stringify(response(200, '已点赞'))); return
            }
            feedData.interactions.push({ interaction_id: uuid(), user_id: userId, target_type, target_id, action_type: 'like', created_at: now() })
            if (target_type === 'post') { const p = feedData.posts.find(x => x.post_id === target_id); if (p) p.like_count++ }
            res.end(JSON.stringify(response(200, '点赞成功')))
            return
          }

          // ---- Feed: Unlike ----
          if (url === 'v1/feed/like' && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { target_type = 'post', target_id } = req.body
            const idx = feedData.interactions.findIndex(i => i.user_id === userId && i.target_type === target_type && i.target_id === target_id && i.action_type === 'like')
            if (idx !== -1) {
              feedData.interactions.splice(idx, 1)
              if (target_type === 'post') { const p = feedData.posts.find(x => x.post_id === target_id); if (p) p.like_count-- }
            }
            res.end(JSON.stringify(response(200, '已取消点赞')))
            return
          }

          // ---- Feed: Favorite ----
          if (url === 'v1/feed/favorite' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { target_id } = req.body
            if (feedData.interactions.some(i => i.user_id === userId && i.target_id === target_id && i.action_type === 'favorite')) {
              res.end(JSON.stringify(response(200, '已收藏'))); return
            }
            feedData.interactions.push({ interaction_id: uuid(), user_id: userId, target_type: 'post', target_id, action_type: 'favorite', created_at: now() })
            const p = feedData.posts.find(x => x.post_id === target_id); if (p) p.favorite_count++
            res.end(JSON.stringify(response(200, '收藏成功')))
            return
          }

          // ---- Feed: Unfavorite ----
          if (url === 'v1/feed/favorite' && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { target_id } = req.body
            const idx = feedData.interactions.findIndex(i => i.user_id === userId && i.target_id === target_id && i.action_type === 'favorite')
            if (idx !== -1) { feedData.interactions.splice(idx, 1); const p = feedData.posts.find(x => x.post_id === target_id); if (p) p.favorite_count-- }
            res.end(JSON.stringify(response(200, '已取消收藏')))
            return
          }

          // ---- Feed: Favorites list ----
          if (url === 'v1/feed/favorites' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const favs = feedData.interactions.filter(i => i.user_id === userId && i.action_type === 'favorite')
            const list = favs.map(f => {
              const post = feedData.posts.find(p => p.post_id === f.target_id && p.status === 'normal')
              return post ? enrichPost(post, userId) : null
            }).filter(Boolean)
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Feed: Share ----
          if (url === 'v1/feed/share' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { target_id } = req.body
            const p = feedData.posts.find(x => x.post_id === target_id); if (p) p.share_count++
            res.end(JSON.stringify(response(200, '分享成功')))
            return
          }

          // ---- Feed: Promote buy ----
          if (url.match(/^v1\/feed\/post\/[^/]+\/promote$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId && p.user_id === userId)
            if (!post) { res.end(JSON.stringify(response(404, '帖子不存在或无权操作'))); return }
            const { duration_hours = 24 } = req.body
            const cost = duration_hours * 10
            const account = ensureCoinAccount(userId)
            if (account.balance < cost) { res.end(JSON.stringify(response(400, '余额不足', { required: cost, balance: account.balance }))); return }
            addTransaction(userId, -cost, 'spend', 'promote', `帖子推广${duration_hours}小时`)
            const expireAt = new Date(Date.now() + duration_hours * 3600000).toISOString()
            post.is_promoted = true
            post.promote_expire_at = expireAt
            res.end(JSON.stringify(response(200, '推广成功', { expire_at: expireAt, cost, balance: account.balance })))
            return
          }

          // ---- Feed: Promote status ----
          if (url.match(/^v1\/feed\/post\/[^/]+\/promote-status$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const postId = url.split('/')[3]
            const post = feedData.posts.find(p => p.post_id === postId)
            const isActive = post?.is_promoted && post.promote_expire_at && new Date(post.promote_expire_at) > new Date()
            res.end(JSON.stringify(response(200, 'success', { is_promoted: !!isActive, expire_at: post?.promote_expire_at })))
            return
          }

          // ---- Feed: Promote daily count ----
          if (url === 'v1/feed/promote/daily-count' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            res.end(JSON.stringify(response(200, 'success', { daily_count: 0, max_daily: 5 })))
            return
          }

          // ---- Feed: Search users ----
          if (url === 'v1/feed/search/users' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const keyword = req.query?.keyword || ''
            const list = [...mockUsers.values()].filter(u => u.nickname.includes(keyword)).map(u => ({ user_id: u.user_id, nickname: u.nickname, avatar: u.avatar, bio: u.bio }))
            if (keyword) feedData.searchHistory.push({ history_id: uuid(), user_id: userId, keyword, created_at: now() })
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Feed: User posts ----
          if (url.match(/^v1\/feed\/user\/[^/]+\/posts$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const targetUserId = url.split('/')[3]
            const page = parseInt(req.query?.page) || 1
            const pageSize = parseInt(req.query?.page_size) || 20
            const userPosts = feedData.posts
              .filter(p => p.user_id === targetUserId && p.status === 'normal')
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const start = (page - 1) * pageSize
            const list = userPosts.slice(start, start + pageSize).map(p => enrichPost(p, userId))
            res.end(JSON.stringify(response(200, 'success', { list, total: userPosts.length, page, page_size: pageSize })))
            return
          }

          // ---- Feed: Search topics ----
          if (url === 'v1/feed/search/topics' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const keyword = req.query?.keyword || ''
            const list = feedData.posts.filter(p => p.status === 'normal' && p.topic_tags.some(t => t.includes(keyword)))
            if (keyword) feedData.searchHistory.push({ history_id: uuid(), user_id: userId, keyword, created_at: now() })
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Feed: Search history ----
          if (url === 'v1/feed/search/history' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const list = feedData.searchHistory.filter(h => h.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20)
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Feed: Clear search history ----
          if (url === 'v1/feed/search/history' && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            feedData.searchHistory = feedData.searchHistory.filter(h => h.user_id !== userId)
            res.end(JSON.stringify(response(200, '已清空')))
            return
          }

          // ---- Feed: Delete search history item ----
          if (url.match(/^v1\/feed\/search\/history\/[^/]+$/) && method === 'DELETE') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const historyId = url.split('/')[4]
            const idx = feedData.searchHistory.findIndex(h => h.history_id === historyId && h.user_id === userId)
            if (idx !== -1) feedData.searchHistory.splice(idx, 1)
            res.end(JSON.stringify(response(200, '已删除')))
            return
          }

          // ========================
          // Badge Mock Data
          // ========================
          const BADGE_SEED = [
            { badge_id: 'badge_q_1', name: '初出茅庐', type: 'question_count', level: 1, icon: 'seedling', description: '完成第1次刷题', unlock_condition: { type: 'question_count', threshold: 1 }, next_badge_id: 'badge_q_2', sort_order: 1 },
            { badge_id: 'badge_q_2', name: '百题斩', type: 'question_count', level: 2, icon: 'book', description: '累计刷题≥100题', unlock_condition: { type: 'question_count', threshold: 100 }, next_badge_id: 'badge_q_3', sort_order: 2 },
            { badge_id: 'badge_q_3', name: '千题王', type: 'question_count', level: 3, icon: 'crown', description: '累计刷题≥1000题', unlock_condition: { type: 'question_count', threshold: 1000 }, next_badge_id: null, sort_order: 3 },
            { badge_id: 'badge_s_1', name: '初来乍到', type: 'streak', level: 1, icon: 'calendar-o', description: '连续签到≥3天', unlock_condition: { type: 'streak', threshold: 3 }, next_badge_id: 'badge_s_2', sort_order: 4 },
            { badge_id: 'badge_s_2', name: '签到达人', type: 'streak', level: 2, icon: 'fire-o', description: '连续签到≥7天', unlock_condition: { type: 'streak', threshold: 7 }, next_badge_id: 'badge_s_3', sort_order: 5 },
            { badge_id: 'badge_s_3', name: '全勤王者', type: 'streak', level: 3, icon: 'diamond-o', description: '连续签到≥30天', unlock_condition: { type: 'streak', threshold: 30 }, next_badge_id: null, sort_order: 6 },
            { badge_id: 'badge_a_1', name: '小有所成', type: 'accuracy', level: 1, icon: 'star-o', description: '正确率≥60%且刷题≥50题', unlock_condition: { type: 'accuracy', accuracy_threshold: 60, question_threshold: 50 }, next_badge_id: 'badge_a_2', sort_order: 7 },
            { badge_id: 'badge_a_2', name: '学霸', type: 'accuracy', level: 2, icon: 'medal-o', description: '正确率≥80%且刷题≥200题', unlock_condition: { type: 'accuracy', accuracy_threshold: 80, question_threshold: 200 }, next_badge_id: 'badge_a_3', sort_order: 8 },
            { badge_id: 'badge_a_3', name: '学神', type: 'accuracy', level: 3, icon: 'gem-o', description: '正确率≥90%且刷题≥500题', unlock_condition: { type: 'accuracy', accuracy_threshold: 90, question_threshold: 500 }, next_badge_id: null, sort_order: 9 },
            { badge_id: 'badge_sc_1', name: '乐于助人', type: 'social', level: 1, icon: 'chat-o', description: '累计评论/回复≥10次', unlock_condition: { type: 'social', metric: 'comment_count', threshold: 10 }, next_badge_id: 'badge_sc_2', sort_order: 10 },
            { badge_id: 'badge_sc_2', name: '社区明星', type: 'social', level: 2, icon: 'good-job-o', description: '累计获得点赞≥100次', unlock_condition: { type: 'social', metric: 'like_received', threshold: 100 }, next_badge_id: 'badge_sc_3', sort_order: 11 },
            { badge_id: 'badge_sc_3', name: '意见领袖', type: 'social', level: 3, icon: 'bullhorn-o', description: '累计粉丝≥500人', unlock_condition: { type: 'social', metric: 'follower_count', threshold: 500 }, next_badge_id: null, sort_order: 12 },
          ]

          if (!globalThis.__mockUserBadges) {
            globalThis.__mockUserBadges = new Map()
          }
          const userBadgesData = globalThis.__mockUserBadges

          // ---- Badge: List all definitions ----
          if (url === 'v1/badge/list' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const earned = userBadgesData.get(userId) || []
            const earnedMap = Object.fromEntries(earned.map(b => [b.badge_id, b]))
            const badges = BADGE_SEED.map(b => ({
              ...b,
              is_unlocked: !!earnedMap[b.badge_id],
              is_wearing: earnedMap[b.badge_id]?.is_wearing || false,
              unlocked_at: earnedMap[b.badge_id]?.unlocked_at || null,
            }))
            res.end(JSON.stringify(response(200, 'success', { badges, total: badges.length })))
            return
          }

          // ---- Badge: My earned badges ----
          if (url === 'v1/badge/my' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const earned = userBadgesData.get(userId) || []
            const badgeMap = Object.fromEntries(BADGE_SEED.map(b => [b.badge_id, b]))
            const badges = earned.map(e => ({ ...e, ...badgeMap[e.badge_id] }))
            res.end(JSON.stringify(response(200, 'success', { badges, total: badges.length })))
            return
          }

          // ---- Badge: Check for new badges ----
          if (url === 'v1/badge/check' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            if (!userBadgesData.has(userId)) userBadgesData.set(userId, [])
            const earned = userBadgesData.get(userId)
            const earnedIds = new Set(earned.map(b => b.badge_id))

            // Calculate stats
            const records = practiceData.studyRecords.filter(r => r.user_id === userId)
            const totalQuestions = records.reduce((sum, r) => sum + r.question_count, 0)
            const totalCorrect = records.reduce((sum, r) => sum + r.correct_count, 0)
            const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

            // Calculate streak
            let streakDays = 0
            const checkDate = new Date()
            while (true) {
              const dateStr = checkDate.toISOString().split('T')[0]
              const key = `${userId}_${dateStr}`
              if (coinData.signLogs.has(key)) {
                streakDays++
                checkDate.setDate(checkDate.getDate() - 1)
              } else {
                break
              }
            }

            const newBadges = []
            for (const badge of BADGE_SEED) {
              if (earnedIds.has(badge.badge_id)) continue
              const cond = badge.unlock_condition
              let qualified = false
              if (cond.type === 'question_count') qualified = totalQuestions >= cond.threshold
              else if (cond.type === 'streak') qualified = streakDays >= cond.threshold
              else if (cond.type === 'accuracy') qualified = accuracy >= cond.accuracy_threshold && totalQuestions >= cond.question_threshold
              if (qualified) {
                earned.push({ badge_id: badge.badge_id, is_wearing: false, unlocked_at: now() })
                newBadges.push(badge)
              }
            }
            res.end(JSON.stringify(response(200, 'success', { new_badges: newBadges, new_count: newBadges.length })))
            return
          }

          // ---- Badge: Wear ----
          if (url === 'v1/badge/wear' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { badge_id } = req.body
            const earned = userBadgesData.get(userId) || []
            const badge = earned.find(b => b.badge_id === badge_id)
            if (!badge) { res.end(JSON.stringify(response(404, '未获得该勋章'))); return }
            badge.is_wearing = true
            res.end(JSON.stringify(response(200, '佩戴成功')))
            return
          }

          // ---- Badge: Unwear ----
          if (url === 'v1/badge/unwear' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { badge_id } = req.body
            const earned = userBadgesData.get(userId) || []
            const badge = earned.find(b => b.badge_id === badge_id)
            if (badge) badge.is_wearing = false
            res.end(JSON.stringify(response(200, '已取消佩戴')))
            return
          }

          // ========================
          // Feedback Mock Data
          // ========================
          if (!globalThis.__mockFeedbacks) {
            globalThis.__mockFeedbacks = []
          }

          // ---- User: Submit feedback ----
          if (url === 'v1/user/feedback' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }
            const { content, images, contact } = req.body
            if (!content || !content.trim()) { res.end(JSON.stringify(response(400, '请输入反馈内容'))); return }

            const feedback = {
              feedback_id: 'fb_' + uuid().split('-')[0],
              user_id: userId,
              content: content.trim(),
              images: images || [],
              contact: contact || '',
              status: 'unread',
              created_at: now(),
            }
            globalThis.__mockFeedbacks.push(feedback)
            console.log(`[Mock] Feedback submitted: ${feedback.feedback_id}`)
            res.end(JSON.stringify(response(200, '提交成功')))
            return
          }

          // ---- Admin: List feedbacks ----
          if (url === 'v1/admin/feedbacks' && method === 'GET') {
            const list = [...globalThis.__mockFeedbacks].reverse()
            const unread = list.filter(f => f.status === 'unread').length
            res.end(JSON.stringify(response(200, 'success', { list, total: list.length, unread_count: unread })))
            return
          }

          // ---- Admin: Mark feedback as read ----
          if (url.match(/^v1\/admin\/feedbacks\/[^/]+\/read$/) && method === 'POST') {
            const fbId = url.split('/')[3]
            const fb = globalThis.__mockFeedbacks.find(f => f.feedback_id === fbId)
            if (fb) fb.status = 'read'
            res.end(JSON.stringify(response(200, '已标记已读')))
            return
          }

          // ---- Shop: Product list ----
          if (url.startsWith('v1/shop/products') && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            let list = shopData.products.filter(p => p.status === 'active')

            // Category filter
            const catMatch = url.match(/[?&]category=([^&]+)/)
            if (catMatch && catMatch[1] !== '全部') {
              list = list.filter(p => p.category === decodeURIComponent(catMatch[1]))
            }

            // Sort
            const sortMatch = url.match(/[?&]sort=([^&]+)/)
            const sortVal = sortMatch ? sortMatch[1] : 'default'
            if (sortVal === 'price_asc') list.sort((a, b) => a.price - b.price)
            else if (sortVal === 'price_desc') list.sort((a, b) => b.price - a.price)
            else if (sortVal === 'sales') list.sort((a, b) => b.sales_count - a.sales_count)
            else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

            // Mark purchased
            const userPurchases = shopData.library.filter(l => l.user_id === userId).map(l => l.product_id)
            const result = list.map(p => ({
              ...p,
              is_purchased: userPurchases.includes(p.product_id),
            }))

            res.end(JSON.stringify(response(200, 'success', { list: result, total: result.length })))
            return
          }

          // ---- Shop: Product detail ----
          if (url.match(/^v1\/shop\/product\/[^/]+$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const productId = url.split('/')[3]
            const product = shopData.products.find(p => p.product_id === productId)
            if (!product) { res.end(JSON.stringify(response(404, '商品不存在'))); return }

            const isPurchased = shopData.library.some(l => l.user_id === userId && l.product_id === productId)

            res.end(JSON.stringify(response(200, 'success', {
              ...product,
              file_url: isPurchased ? `/files/${productId}.pdf` : null,
              detail_images: [],
              is_purchased: isPurchased,
            })))
            return
          }

          // ---- Shop: Product preview (first 5 questions, no answers) ----
          if (url.match(/^v1\/shop\/product\/[^/]+\/preview$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const productId = url.split('/')[3]
            const product = shopData.products.find(p => p.product_id === productId)
            if (!product) { res.end(JSON.stringify(response(404, '商品不存在'))); return }

            // For question banks, return first 5 questions without answers
            if (product.is_question_bank) {
              const preview = practiceData.questions.slice(0, 5).map(q => ({
                question_id: q.question_id,
                question_type: q.question_type,
                stem: q.stem,
                options: q.options,
                difficulty: q.difficulty,
              }))
              res.end(JSON.stringify(response(200, 'success', { questions: preview, total: practiceData.questions.length })))
            } else {
              res.end(JSON.stringify(response(200, 'success', { questions: [], total: 0 })))
            }
            return
          }

          // ---- Shop: Order calculate ----
          if (url === 'v1/shop/order/calculate' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const { product_id, payment_method = 'coin' } = req.body
            if (!product_id) { res.end(JSON.stringify(response(400, '缺少商品ID'))); return }

            const product = shopData.products.find(p => p.product_id === product_id && p.status === 'active')
            if (!product) { res.end(JSON.stringify(response(404, '商品不存在'))); return }

            if (shopData.library.some(l => l.user_id === userId && l.product_id === product_id)) {
              res.end(JSON.stringify(response(400, '已购买过该资料'))); return
            }

            const account = ensureCoinAccount(userId)
            const originalAmount = product.price
            let coinDiscount = 0
            let finalAmount = originalAmount

            if (payment_method === 'coin') {
              const maxDiscount = Math.floor(originalAmount * (product.max_discount_ratio || 5) / 100)
              coinDiscount = Math.min(account.balance, maxDiscount)
              finalAmount = originalAmount - coinDiscount
            }

            res.end(JSON.stringify(response(200, 'success', {
              product_id: product.product_id,
              product_name: product.name,
              original_amount: originalAmount,
              coin_discount: coinDiscount,
              final_amount: finalAmount,
              payment_method,
            })))
            return
          }

          // ---- Shop: Order pay ----
          if (url.match(/^v1\/shop\/order\/[^/]+\/pay$/) && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const orderId = url.split('/')[3]
            const order = shopData.orders.find(o => o.order_id === orderId)
            if (!order) { res.end(JSON.stringify(response(404, '订单不存在'))); return }
            if (order.user_id !== userId) { res.end(JSON.stringify(response(403, '无权操作'))); return }

            if (order.status === 'paid') {
              res.end(JSON.stringify(response(200, '订单已支付', { order_id: orderId, status: 'paid' })))
              return
            }
            if (order.status !== 'pending') {
              res.end(JSON.stringify(response(400, `订单状态异常：${order.status}`))); return
            }

            if (order.payment_method === 'coin') {
              const product = shopData.products.find(p => p.product_id === order.product_id)
              if (!product) { res.end(JSON.stringify(response(404, '商品不存在'))); return }

              const account = ensureCoinAccount(userId)
              if (account.balance < order.original_amount) {
                res.end(JSON.stringify(response(400, '余额不足', { error: '余额不足', required: order.original_amount, balance: account.balance })))
                return
              }

              addTransaction(userId, -order.original_amount, 'spend', 'purchase', `购买资料：${order.product_name}`)
              order.status = 'paid'
              order.paid_at = now()
              order.coin_used = order.original_amount
              order.final_amount = 0

              shopData.library.push({
                product_id: order.product_id, user_id: userId, order_id: orderId,
                name: product.name, cover_url: product.cover_url, file_url: `/files/${order.product_id}.pdf`, purchased_at: now(),
              })
              product.sales_count++

              const updatedAcct = coinData.coinAccounts.get(userId)
              console.log(`[Mock] Order paid (coin): ${orderId}`)
              res.end(JSON.stringify(response(200, '支付成功', { order_id: orderId, status: 'paid', balance: updatedAcct.balance })))
              return
            }

            // External payment placeholder
            res.end(JSON.stringify(response(200, 'success', {
              order_id: orderId, status: 'pending', payment_method: order.payment_method,
              payment_url: null, message: '外部支付接口待接入',
            })))
            return
          }

          // ---- Shop: Order callback ----
          if (url === 'v1/shop/order/callback' && method === 'POST') {
            const { order_id, transaction_id, status: payStatus } = req.body
            if (!order_id) { res.end(JSON.stringify(response(400, '缺少订单ID'))); return }

            const order = shopData.orders.find(o => o.order_id === order_id)
            if (!order) { res.end(JSON.stringify(response(404, '订单不存在'))); return }
            if (order.status !== 'pending') { res.end(JSON.stringify(response(200, '已处理'))); return }

            if (payStatus === 'success') {
              order.status = 'paid'
              order.paid_at = now()
              order.transaction_id = transaction_id

              const product = shopData.products.find(p => p.product_id === order.product_id)
              shopData.library.push({
                product_id: order.product_id, user_id: order.user_id, order_id,
                name: product?.name || '', cover_url: product?.cover_url || '', file_url: `/files/${order.product_id}.pdf`, purchased_at: now(),
              })
              if (product) product.sales_count++

              console.log(`[Mock] Order callback (success): ${order_id}`)
              res.end(JSON.stringify(response(200, '支付确认成功')))
              return
            }

            res.end(JSON.stringify(response(400, '支付未成功')))
            return
          }

          // ---- Shop: Order status ----
          if (url.match(/^v1\/shop\/order\/[^/]+\/status$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const orderId = url.split('/')[3]
            const order = shopData.orders.find(o => o.order_id === orderId && o.user_id === userId)
            if (!order) { res.end(JSON.stringify(response(404, '订单不存在'))); return }

            res.end(JSON.stringify(response(200, 'success', {
              order_id: order.order_id, status: order.status, payment_method: order.payment_method,
              original_amount: order.original_amount, final_amount: order.final_amount,
              paid_at: order.paid_at, created_at: order.created_at, expire_at: order.expire_at,
            })))
            return
          }

          // ---- Shop: Library view URL ----
          if (url.match(/^v1\/shop\/library\/[^/]+\/view$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const productId = url.split('/')[3]
            const item = shopData.library.find(l => l.user_id === userId && l.product_id === productId)
            if (!item) { res.end(JSON.stringify(response(403, '未购买该资料'))); return }

            const product = shopData.products.find(p => p.product_id === productId)
            const expireAt = Date.now() + 3600 * 1000
            const token = btoa(`${userId}:${productId}:${expireAt}`)

            res.end(JSON.stringify(response(200, 'success', {
              product_id: productId,
              view_url: `/files/${productId}.pdf?token=${token}&expire=${expireAt}`,
              file_url: `/files/${productId}.pdf`,
              preview_urls: product?.preview_urls || [],
              expire_at: new Date(expireAt).toISOString(),
              watermarked: true,
            })))
            return
          }

          // ---- Shop: Create order ----
          if (url === 'v1/shop/order/create' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const { product_id, payment_method = 'coin' } = req.body
            if (!product_id) { res.end(JSON.stringify(response(400, '缺少商品ID'))); return }
            if (!['coin', 'wechat', 'alipay'].includes(payment_method)) {
              res.end(JSON.stringify(response(400, '不支持的支付方式'))); return
            }

            const product = shopData.products.find(p => p.product_id === product_id)
            if (!product) { res.end(JSON.stringify(response(404, '商品不存在'))); return }

            // Check already purchased
            if (shopData.library.some(l => l.user_id === userId && l.product_id === product_id)) {
              res.end(JSON.stringify(response(400, '已购买过该资料'))); return
            }

            // Check for existing pending order
            const existingPending = shopData.orders.find(o => o.user_id === userId && o.product_id === product_id && o.status === 'pending')
            if (existingPending) {
              res.end(JSON.stringify(response(200, 'success', { order_id: existingPending.order_id, status: 'pending' })))
              return
            }

            const orderId = 'ord_' + uuid().split('-')[0]

            if (payment_method === 'coin') {
              // Coin payment: immediate
              const account = ensureCoinAccount(userId)
              if (account.balance < product.price) {
                res.end(JSON.stringify(response(400, '余额不足', { error: '余额不足', required: product.price, balance: account.balance })))
                return
              }

              addTransaction(userId, -product.price, 'spend', 'purchase', `购买资料：${product.name}`)

              const order = {
                order_id: orderId, user_id: userId, product_id: product.product_id, product_name: product.name,
                original_amount: product.price, coin_discount: 0, coin_used: product.price, final_amount: 0,
                payment_method: 'coin', status: 'paid', paid_at: now(), created_at: now(),
                expire_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              }
              shopData.orders.push(order)

              shopData.library.push({
                product_id: product.product_id, user_id: userId, order_id: orderId,
                name: product.name, cover_url: product.cover_url, file_url: `/files/${product_id}.pdf`, purchased_at: now(),
              })
              product.sales_count++

              const updatedAccount = coinData.coinAccounts.get(userId)
              console.log(`[Mock] Purchase (coin): ${userId} bought ${product.name} for ${product.price} coins`)
              res.end(JSON.stringify(response(200, '购买成功', { order_id: orderId, balance: updatedAccount.balance })))
              return
            }

            // External payment: create pending order
            const pendingOrder = {
              order_id: orderId, user_id: userId, product_id: product.product_id, product_name: product.name,
              original_amount: product.price, coin_discount: 0, coin_used: 0, final_amount: product.price,
              payment_method, status: 'pending', created_at: now(),
              expire_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            }
            shopData.orders.push(pendingOrder)
            console.log(`[Mock] Order created (pending): ${orderId} via ${payment_method}`)
            res.end(JSON.stringify(response(200, '订单已创建', { order_id: orderId, status: 'pending' })))
            return
          }

          // ---- Shop: My orders ----
          if (url === 'v1/shop/orders' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const list = shopData.orders
              .filter(o => o.user_id === userId)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))

            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Shop: My library ----
          if (url === 'v1/shop/library' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const list = shopData.library
              .filter(l => l.user_id === userId)
              .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))

            res.end(JSON.stringify(response(200, 'success', { list, total: list.length })))
            return
          }

          // ---- Shop: Library item detail ----
          if (url.match(/^v1\/shop\/library\/[^/]+$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const productId = url.split('/')[3]
            const item = shopData.library.find(l => l.user_id === userId && l.product_id === productId)
            if (!item) { res.end(JSON.stringify(response(404, '未购买该资料'))); return }

            res.end(JSON.stringify(response(200, 'success', item)))
            return
          }

          // ---- Shop: Submit correction ----
          if (url === 'v1/shop/corrections' && method === 'POST') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const { product_id, page_no, error_description, correct_content } = req.body
            if (!product_id || !error_description) {
              res.end(JSON.stringify(response(400, '请填写完整信息'))); return
            }

            const correction = {
              correction_id: 'cor_' + uuid().split('-')[0],
              user_id: userId,
              product_id,
              page_no: page_no || '',
              error_description,
              correct_content: correct_content || '',
              status: 'pending',
              created_at: now(),
            }
            shopData.corrections.push(correction)
            console.log(`[Mock] Correction submitted: ${correction.correction_id}`)
            res.end(JSON.stringify(response(200, '提交成功')))
            return
          }

          // ---- User Assets: List purchased question banks ----
          if (url === 'v1/user/assets' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const userItems = shopData.library.filter(l => l.user_id === userId)
            const assets = userItems.map(item => {
              const product = shopData.products.find(p => p.product_id === item.product_id)
              return {
                asset_id: 'asset_' + item.product_id,
                user_id: userId,
                product_id: item.product_id,
                order_id: item.order_id,
                product_name: product?.name || item.name || '',
                category: product?.category || '',
                price: product?.price || 0,
                question_count: product?.question_count || 0,
                is_question_bank: product?.is_question_bank || false,
                purchased_at: item.purchased_at,
              }
            })

            res.end(JSON.stringify(response(200, 'success', { list: assets, total: assets.length })))
            return
          }

          // ---- User Assets: Check single product ----
          if (url.match(/^v1\/user\/assets\/[^/]+$/) && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const productId = url.split('/')[3]
            const owned = shopData.library.some(l => l.user_id === userId && l.product_id === productId)
            res.end(JSON.stringify(response(200, 'success', { is_purchased: owned, product_id: productId })))
            return
          }

          // ---- Shop: Watermark info ----
          if (url === 'v1/shop/watermark' && method === 'GET') {
            const userId = getAuthUser(req)
            if (!userId) { res.end(JSON.stringify(response(401, '请先登录'))); return }

            const user = mockUsers.get(userId)
            const name = user?.nickname || '用户'
            const phone = user?.phone || ''
            const maskedPhone = phone.slice(-4)
            res.end(JSON.stringify(response(200, 'success', {
              text: `${name} ${maskedPhone}`,
              name,
              phone_tail: maskedPhone,
            })))
            return
          }

          // ---- Fallback ----
          console.log(`[Mock] Unhandled: ${method} ${url}`)
          res.end(JSON.stringify(response(404, `Mock API not found: ${method} ${url}`)))
        })
      })
    },
  }
}
