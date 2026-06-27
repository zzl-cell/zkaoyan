/**
 * Pages Function: Live streaming API catch-all route
 * Handles all /api/v1/live/* endpoints
 *
 * D1 binding required: DB
 * Depends on tables: live_rooms, live_chat, live_gifts, live_purchases, users, coin_accounts, coin_transactions
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
  const segments = url.pathname.replace(/^\/api\/v1\/live\//, '').split('/').filter(Boolean)
  const action = segments[0] || ''
  const method = request.method

  try {
    // ── Public routes (no auth required) ──
    if (method === 'GET' && action === 'list') return await handleList(db, url)
    if (method === 'GET' && action === 'replay' && segments[1] === 'list') return await handleReplayList(db, url)
    if (method === 'GET' && action === 'chat' && segments[1] === 'list') return await handleChatList(db, url)

    // ── All other routes require auth ──
    const user = await extractUser(request, env)
    if (!user) return jsonUnauthorized('请先登录')

    // GET routes
    if (method === 'GET') {
      if (action === 'my-list') return await handleMyList(db, url, user)
      if (action === 'detail') return await handleDetail(db, url, user)
      return jsonBad(`Unknown route: GET ${action}`)
    }

    // POST routes
    if (method === 'POST') {
      let body = {}
      try { body = await request.json() } catch {}

      if (action === 'create') return await handleCreate(db, user, body)
      if (action === 'start') return await handleStart(db, user, body)
      if (action === 'stop') return await handleStop(db, user, body)
      if (action === 'update') return await handleUpdate(db, user, body)
      if (action === 'delete') return await handleDelete(db, user, body)
      if (action === 'enter') return await handleEnter(db, user, body)
      if (action === 'like') return await handleLike(db, user, body)
      if (action === 'chat' && segments[1] === 'send') return await handleChatSend(db, user, body)
      if (action === 'gift' && segments[1] === 'send') return await handleGiftSend(db, user, body)
      return jsonBad(`Unknown route: POST ${action}`)
    }

    return jsonBad('Method not allowed')
  } catch (err) {
    console.error(`[live/${action}] Error:`, err)
    return jsonBad(err.message || 'Internal server error')
  }
}

// ── POST /live/create ── Create live room ──

async function handleCreate(db, user, body) {
  const { title, cover_image, type, price, max_viewers, is_replay_public } = body
  if (!title) return jsonBad('请填写直播标题')

  const now = new Date().toISOString()
  const roomId = uuid()
  const trtcRoomId = Math.floor(100000 + Math.random() * 900000)

  await dbRun(
    db,
    `INSERT INTO live_rooms (id, title, cover_image, host_id, status, type, price, trtc_room_id, max_viewers, is_replay_public, created_at)
     VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?)`,
    roomId, title, cover_image || '', user.user_id,
    type === 'paid' ? 'paid' : 'free',
    type === 'paid' ? (price || 0) : 0,
    trtcRoomId, max_viewers || 100, is_replay_public ? 1 : 0, now
  )

  return jsonOk('创建成功', {
    room_id: roomId,
    trtc_room_id: trtcRoomId,
    push_url: `rtmp://push.example.com/live/${roomId}`,
    play_url: `https://play.example.com/live/${roomId}.flv`,
    status: 'waiting',
  })
}

// ── POST /live/start ── Start live ──

async function handleStart(db, user, body) {
  const { room_id } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')
  if (room.host_id !== user.user_id) return jsonBad('无权操作')
  if (room.status !== 'waiting') return jsonBad('直播间状态异常')

  const now = new Date().toISOString()
  await dbRun(db, "UPDATE live_rooms SET status = 'live', started_at = ? WHERE id = ?", now, room_id)

  return jsonOk('直播已开始', { room_id, status: 'live', started_at: now })
}

// ── POST /live/stop ── Stop live ──

async function handleStop(db, user, body) {
  const { room_id } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')
  if (room.host_id !== user.user_id) return jsonBad('无权操作')
  if (room.status !== 'live') return jsonBad('直播间未在直播中')

  const now = new Date().toISOString()
  await dbRun(
    db,
    "UPDATE live_rooms SET status = 'ended', ended_at = ?, record_status = 'recorded' WHERE id = ?",
    now, room_id
  )

  return jsonOk('直播已结束', { room_id, status: 'ended', ended_at: now })
}

// ── POST /live/update ── Update live room ──

async function handleUpdate(db, user, body) {
  const { room_id, title, cover_image, price, is_replay_public } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')
  if (room.host_id !== user.user_id) return jsonBad('无权操作')

  const sets = []
  const params = []

  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (cover_image !== undefined) { sets.push('cover_image = ?'); params.push(cover_image) }
  if (price !== undefined) { sets.push('price = ?'); params.push(price) }
  if (is_replay_public !== undefined) { sets.push('is_replay_public = ?'); params.push(is_replay_public ? 1 : 0) }

  if (sets.length === 0) return jsonBad('没有需要更新的字段')

  params.push(room_id)
  await dbRun(db, `UPDATE live_rooms SET ${sets.join(', ')} WHERE id = ?`, ...params)
  return jsonOk('更新成功')
}

// ── POST /live/delete ── Delete live room ──

async function handleDelete(db, user, body) {
  const { room_id } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')

  // Allow host or admin
  if (room.host_id !== user.user_id) {
    const u = await dbGet(db, 'SELECT role FROM users WHERE user_id = ?', user.user_id)
    if (!u || u.role !== 'admin') return jsonBad('无权操作')
  }

  await dbRun(db, 'DELETE FROM live_rooms WHERE id = ?', room_id)
  return jsonOk('删除成功')
}

// ── GET /live/my-list ── Current user's live rooms ──

async function handleMyList(db, url, user) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const countRow = await dbGet(db, 'SELECT COUNT(*) AS total FROM live_rooms WHERE host_id = ?', user.user_id)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    'SELECT * FROM live_rooms WHERE host_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    user.user_id, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /live/list ── Public live room list ──

async function handleList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const type = url.searchParams.get('type') || ''
  const offset = (page - 1) * pageSize

  const conditions = ["status IN ('live', 'waiting')"]
  const params = []

  if (type === 'free') {
    conditions.push("type = 'free'")
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const countRow = await dbGet(db, `SELECT COUNT(*) AS total FROM live_rooms ${where}`, ...params)
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT lr.*, u.nickname AS host_nickname, u.avatar AS host_avatar
     FROM live_rooms lr
     LEFT JOIN users u ON lr.host_id = u.user_id
     ${where}
     ORDER BY lr.status = 'live' DESC, lr.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params, pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}

// ── GET /live/detail ── Live room detail ──

async function handleDetail(db, url, user) {
  const roomId = url.searchParams.get('room_id') || url.searchParams.get('id')
  if (!roomId) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', roomId)
  if (!room) return jsonBad('直播间不存在')

  // Get host info
  const host = await dbGet(db, 'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?', room.host_id)

  // Check purchase status (always false for Phase 1)
  let purchased = false

  return jsonOk('success', {
    ...room,
    host: host || { nickname: '未知主播', avatar: '' },
    purchased,
  })
}

// ── POST /live/enter ── Enter live room ──

async function handleEnter(db, user, body) {
  const { room_id } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')

  // Increment view count
  await dbRun(db, 'UPDATE live_rooms SET view_count = view_count + 1 WHERE id = ?', room_id)

  // Determine play URL
  let playUrl = ''
  if (room.status === 'live') {
    playUrl = room.play_url
  } else if (room.status === 'ended' && room.record_file_url) {
    playUrl = room.record_file_url
  }

  return jsonOk('success', {
    room_id,
    status: room.status,
    play_url: playUrl,
    record_file_url: room.record_file_url,
    is_host: room.host_id === user.user_id,
  })
}

// ── POST /live/chat/send ── Send chat message ──

async function handleChatSend(db, user, body) {
  const { room_id, content } = body
  if (!room_id || !content?.trim()) return jsonBad('缺少直播间ID或内容')

  const room = await dbGet(db, 'SELECT id FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')

  const now = new Date().toISOString()
  const chatId = uuid()

  await dbRun(
    db,
    'INSERT INTO live_chat (id, room_id, user_id, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    chatId, room_id, user.user_id, content.trim(), 'text', now
  )

  // Get user info for response
  const u = await dbGet(db, 'SELECT nickname, avatar FROM users WHERE user_id = ?', user.user_id)

  return jsonOk('发送成功', {
    chat_id: chatId,
    room_id,
    user_id: user.user_id,
    content: content.trim(),
    msg_type: 'text',
    nickname: u?.nickname || '',
    avatar: u?.avatar || '',
    created_at: now,
  })
}

// ── GET /live/chat/list ── Get chat messages ──

async function handleChatList(db, url) {
  const roomId = url.searchParams.get('room_id') || url.searchParams.get('id')
  const sinceId = url.searchParams.get('since_id') || ''
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))

  if (!roomId) return jsonBad('缺少直播间ID')

  let rows
  if (sinceId) {
    // Get the created_at of the since_id message, then fetch newer ones
    const sinceMsg = await dbGet(db, 'SELECT created_at FROM live_chat WHERE id = ?', sinceId)
    if (sinceMsg) {
      rows = await dbAll(
        db,
        `SELECT lc.*, u.nickname, u.avatar
         FROM live_chat lc
         LEFT JOIN users u ON lc.user_id = u.user_id
         WHERE lc.room_id = ? AND lc.created_at > ?
         ORDER BY lc.created_at ASC
         LIMIT ?`,
        roomId, sinceMsg.created_at, limit
      )
    } else {
      rows = []
    }
  } else {
    rows = await dbAll(
      db,
      `SELECT lc.*, u.nickname, u.avatar
       FROM live_chat lc
       LEFT JOIN users u ON lc.user_id = u.user_id
       WHERE lc.room_id = ?
       ORDER BY lc.created_at DESC
       LIMIT ?`,
      roomId, limit
    )
    rows.reverse() // Return in ascending order
  }

  return jsonOk('success', { list: rows })
}

// ── POST /live/gift/send ── Send gift ──

async function handleGiftSend(db, user, body) {
  const { room_id, gift_type, gift_name, coin_amount } = body
  if (!room_id || !gift_name || !coin_amount) return jsonBad('参数不完整')
  if (coin_amount <= 0) return jsonBad('礼物金额必须大于0')

  const room = await dbGet(db, 'SELECT * FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')

  // Check user's coin balance
  const account = await dbGet(db, 'SELECT balance FROM coin_accounts WHERE user_id = ?', user.user_id)
  const balance = account?.balance || 0
  if (balance < coin_amount) return jsonBad('虚拟币余额不足')

  const now = new Date().toISOString()

  // Deduct coins
  const newBalance = balance - coin_amount
  await dbRun(db, 'UPDATE coin_accounts SET balance = ?, total_spent = total_spent + ?, updated_at = ? WHERE user_id = ?',
    newBalance, coin_amount, now, user.user_id)

  // Record transaction
  await dbRun(
    db,
    `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at)
     VALUES (?, ?, ?, 'spend', 'live_gift', ?, ?, ?)`,
    uuid(), user.user_id, -coin_amount, `赠送${gift_name}`, newBalance, now
  )

  // Record gift
  const giftId = uuid()
  await dbRun(
    db,
    'INSERT INTO live_gifts (id, room_id, sender_id, receiver_id, gift_type, gift_name, coin_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    giftId, room_id, user.user_id, room.host_id, gift_type || 'default', gift_name, coin_amount, now
  )

  // Add system chat message
  const chatId = uuid()
  const u = await dbGet(db, 'SELECT nickname FROM users WHERE user_id = ?', user.user_id)
  await dbRun(
    db,
    'INSERT INTO live_chat (id, room_id, user_id, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    chatId, room_id, user.user_id, `${u?.nickname || '用户'} 送出 ${gift_name}`, 'gift', now
  )

  return jsonOk('赠送成功', {
    gift_id: giftId,
    coin_amount,
    balance: newBalance,
    chat_id: chatId,
  })
}

// ── POST /live/like ── Like live room ──

async function handleLike(db, user, body) {
  const { room_id } = body
  if (!room_id) return jsonBad('缺少直播间ID')

  const room = await dbGet(db, 'SELECT id FROM live_rooms WHERE id = ?', room_id)
  if (!room) return jsonBad('直播间不存在')

  await dbRun(db, 'UPDATE live_rooms SET like_count = like_count + 1 WHERE id = ?', room_id)

  return jsonOk('点赞成功')
}

// ── GET /live/replay/list ── Public replay list ──

async function handleReplayList(db, url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10)))
  const offset = (page - 1) * pageSize

  const countRow = await dbGet(db, "SELECT COUNT(*) AS total FROM live_rooms WHERE status = 'ended' AND is_replay_public = 1")
  const total = countRow?.total || 0

  const list = await dbAll(
    db,
    `SELECT lr.*, u.nickname AS host_nickname, u.avatar AS host_avatar
     FROM live_rooms lr
     LEFT JOIN users u ON lr.host_id = u.user_id
     WHERE lr.status = 'ended' AND lr.is_replay_public = 1
     ORDER BY lr.ended_at DESC
     LIMIT ? OFFSET ?`,
    pageSize, offset
  )

  return jsonOk('success', { list, total, page, page_size: pageSize })
}
