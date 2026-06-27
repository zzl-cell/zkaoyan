import {
  extractUser,
  jsonOk,
  jsonBad,
  jsonUnauthorized,
  uuid,
  dbRun,
  dbGet,
  dbAll,
} from '../_utils.js'

// ── Helpers ──

function parseSegments(url) {
  return url.pathname
    .replace(/^\/api\/v1\/feed\//, '')
    .split('/')
    .filter(Boolean)
}

function getPagination(params, body) {
  const page = Number(params.get('page') || body?.page || 1) || 1
  const pageSize = Number(params.get('page_size') || body?.page_size || 20) || 20
  return { page, pageSize, skip: (page - 1) * pageSize }
}

async function enrichPosts(db, posts, userId) {
  if (!posts.length) return []
  return Promise.all(posts.map((p) => enrichPost(db, p, userId)))
}

async function enrichPost(db, post, userId) {
  const user = await dbGet(
    db,
    'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?',
    post.user_id
  )
  let isLiked = false
  let isFavorited = false
  if (userId) {
    const liked = await dbGet(
      db,
      'SELECT 1 FROM interactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND action_type = ?',
      userId,
      'post',
      post.post_id,
      'like'
    )
    isLiked = !!liked
    const fav = await dbGet(
      db,
      'SELECT 1 FROM interactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND action_type = ?',
      userId,
      'post',
      post.post_id,
      'favorite'
    )
    isFavorited = !!fav
  }
  return { ...post, user: user || null, is_liked: isLiked, is_favorited: isFavorited }
}

// ── Main handler ──

export async function onRequest(context) {
  const { request, env } = context
  const db = env.DB
  const url = new URL(request.url)
  const method = request.method
  const segments = parseSegments(url)
  const params = url.searchParams
  const user = await extractUser(request, env)

  // ── GET ──
  if (method === 'GET') {
    // /feed/recommend
    if (segments[0] === 'recommend') {
      const { page, pageSize, skip } = getPagination(params, null)
      const countRow = await dbGet(
        db,
        "SELECT COUNT(*) AS total FROM posts WHERE status = 'normal'"
      )
      const total = countRow?.total || 0
      const rows = await dbAll(
        db,
        `SELECT * FROM posts WHERE status = 'normal'
         ORDER BY initial_heat + like_count*2 + comment_count*3 + (CASE WHEN is_promoted=1 AND promote_expire_at > datetime('now') THEN 100 ELSE 0 END) DESC
         LIMIT ? OFFSET ?`,
        pageSize,
        skip
      )
      const userId = user?.user_id || null
      const list = await enrichPosts(db, rows, userId)
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/following
    if (segments[0] === 'following') {
      if (!user) return jsonUnauthorized('未登录')
      const { page, pageSize, skip } = getPagination(params, null)
      const countRow = await dbGet(
        db,
        `SELECT COUNT(*) AS total FROM posts p
         JOIN follows f ON p.user_id = f.followee_id
         WHERE f.follower_id = ? AND p.status = 'normal'`,
        user.user_id
      )
      const total = countRow?.total || 0
      const rows = await dbAll(
        db,
        `SELECT p.* FROM posts p
         JOIN follows f ON p.user_id = f.followee_id
         WHERE f.follower_id = ? AND p.status = 'normal'
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        user.user_id,
        pageSize,
        skip
      )
      const list = await enrichPosts(db, rows, user.user_id)
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/favorites
    if (segments[0] === 'favorites') {
      if (!user) return jsonUnauthorized('未登录')
      const { page, pageSize, skip } = getPagination(params, null)
      const countRow = await dbGet(
        db,
        `SELECT COUNT(*) AS total FROM interactions
         WHERE user_id = ? AND target_type = 'post' AND action_type = 'favorite'`,
        user.user_id
      )
      const total = countRow?.total || 0
      const rows = await dbAll(
        db,
        `SELECT p.* FROM posts p
         JOIN interactions i ON p.post_id = i.target_id
         WHERE i.user_id = ? AND i.target_type = 'post' AND i.action_type = 'favorite' AND p.status = 'normal'
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?`,
        user.user_id,
        pageSize,
        skip
      )
      const list = await enrichPosts(db, rows, user.user_id)
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/search/users
    if (segments[0] === 'search' && segments[1] === 'users') {
      const keyword = params.get('keyword') || ''
      if (!keyword) return jsonBad('缺少 keyword 参数')
      const { page, pageSize, skip } = getPagination(params, null)
      // Save search history if logged in
      if (user) {
        await dbRun(
          db,
          'INSERT INTO search_history (user_id, keyword, created_at) VALUES (?, ?, datetime("now"))',
          user.user_id,
          keyword
        )
      }
      const countRow = await dbGet(
        db,
        'SELECT COUNT(*) AS total FROM users WHERE nickname LIKE ?',
        `%${keyword}%`
      )
      const total = countRow?.total || 0
      const list = await dbAll(
        db,
        'SELECT user_id, nickname, avatar FROM users WHERE nickname LIKE ? LIMIT ? OFFSET ?',
        `%${keyword}%`,
        pageSize,
        skip
      )
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/search/topics
    if (segments[0] === 'search' && segments[1] === 'topics') {
      const keyword = params.get('keyword') || ''
      if (!keyword) return jsonBad('缺少 keyword 参数')
      const { page, pageSize, skip } = getPagination(params, null)
      // Save search history if logged in
      if (user) {
        await dbRun(
          db,
          'INSERT INTO search_history (user_id, keyword, created_at) VALUES (?, ?, datetime("now"))',
          user.user_id,
          keyword
        )
      }
      const countRow = await dbGet(
        db,
        "SELECT COUNT(*) AS total FROM posts WHERE status = 'normal' AND (topic_tags LIKE ? OR content LIKE ?)",
        `%${keyword}%`,
        `%${keyword}%`
      )
      const total = countRow?.total || 0
      const rows = await dbAll(
        db,
        "SELECT * FROM posts WHERE status = 'normal' AND (topic_tags LIKE ? OR content LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?",
        `%${keyword}%`,
        `%${keyword}%`,
        pageSize,
        skip
      )
      const userId = user?.user_id || null
      const list = await enrichPosts(db, rows, userId)
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/search/history
    if (segments[0] === 'search' && segments[1] === 'history') {
      if (!user) return jsonUnauthorized('未登录')
      const list = await dbAll(
        db,
        'SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        user.user_id
      )
      return jsonOk('ok', { list })
    }

    // /feed/post/{postId}/promote-status
    if (segments[0] === 'post' && segments[2] === 'promote-status') {
      const postId = segments[1]
      const post = await dbGet(
        db,
        'SELECT is_promoted, promote_expire_at FROM posts WHERE post_id = ?',
        postId
      )
      if (!post) return jsonBad('帖子不存在')
      return jsonOk('ok', {
        is_promoted: !!post.is_promoted,
        promote_expire_at: post.promote_expire_at,
      })
    }

    // /feed/post/{postId}/comments
    if (segments[0] === 'post' && segments[2] === 'comments') {
      const postId = segments[1]
      const { page, pageSize, skip } = getPagination(params, null)

      // Top-level comments (parent_id IS NULL)
      const countRow = await dbGet(
        db,
        "SELECT COUNT(*) AS total FROM comments WHERE post_id = ? AND parent_id IS NULL AND status = 'normal'",
        postId
      )
      const total = countRow?.total || 0
      const topComments = await dbAll(
        db,
        "SELECT * FROM comments WHERE post_id = ? AND parent_id IS NULL AND status = 'normal' ORDER BY created_at DESC LIMIT ? OFFSET ?",
        postId,
        pageSize,
        skip
      )

      // Enrich top-level and fetch nested replies
      const list = await Promise.all(
        topComments.map(async (c) => {
          const u = await dbGet(
            db,
            'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?',
            c.user_id
          )
          const replyToUser = c.reply_to_user_id
            ? await dbGet(
                db,
                'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?',
                c.reply_to_user_id
              )
            : null

          // Fetch all nested replies for this top-level comment
          const replies = await dbAll(
            db,
            "SELECT * FROM comments WHERE parent_id = ? AND post_id = ? AND status = 'normal' ORDER BY created_at ASC",
            c.comment_id,
            postId
          )
          const enrichedReplies = await Promise.all(
            replies.map(async (r) => {
              const ru = await dbGet(
                db,
                'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?',
                r.user_id
              )
              const rReplyTo = r.reply_to_user_id
                ? await dbGet(
                    db,
                    'SELECT user_id, nickname, avatar FROM users WHERE user_id = ?',
                    r.reply_to_user_id
                  )
                : null
              return { ...r, user: ru || null, reply_to_user: rReplyTo || null }
            })
          )

          return {
            ...c,
            user: u || null,
            reply_to_user: replyToUser || null,
            replies: enrichedReplies,
          }
        })
      )
      return jsonOk('ok', { list, total, page, page_size: pageSize })
    }

    // /feed/post/{postId}
    if (segments[0] === 'post' && segments.length === 2) {
      const postId = segments[1]
      const post = await dbGet(
        db,
        "SELECT * FROM posts WHERE post_id = ? AND status = 'normal'",
        postId
      )
      if (!post) return jsonBad('帖子不存在')
      const userId = user?.user_id || null
      const enriched = await enrichPost(db, post, userId)
      return jsonOk('ok', enriched)
    }

    return jsonBad('未知的 GET 路由')
  }

  // ── POST ──
  if (method === 'POST') {
    let body
    try {
      body = await request.json()
    } catch {
      return jsonBad('请求体格式错误')
    }

    // /feed/post — create post
    if (segments[0] === 'post' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { content, images, topic_tags, visibility } = body
      if (!content) return jsonBad('缺少 content')
      const postId = uuid()
      await dbRun(
        db,
        `INSERT INTO posts (post_id, user_id, content, images, topic_tags, visibility, like_count, comment_count, share_count, initial_heat, is_promoted, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'normal', datetime('now'), datetime('now'))`,
        postId,
        user.user_id,
        content,
        images ? JSON.stringify(images) : null,
        topic_tags ? JSON.stringify(topic_tags) : null,
        visibility || 'public'
      )
      return jsonOk('发布成功', { post_id: postId })
    }

    // /feed/post/{postId}/comment — create comment
    if (segments[0] === 'post' && segments[2] === 'comment') {
      if (!user) return jsonUnauthorized('未登录')
      const postId = segments[1]
      const { content, parent_id, reply_to_user_id } = body
      if (!content) return jsonBad('缺少 content')
      const commentId = uuid()
      await dbRun(
        db,
        `INSERT INTO comments (comment_id, post_id, user_id, parent_id, reply_to_user_id, content, like_count, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', datetime('now'))`,
        commentId,
        postId,
        user.user_id,
        parent_id || null,
        reply_to_user_id || null,
        content
      )
      await dbRun(
        db,
        'UPDATE posts SET comment_count = comment_count + 1, updated_at = datetime("now") WHERE post_id = ?',
        postId
      )
      return jsonOk('评论成功', { comment_id: commentId })
    }

    // /feed/like — like
    if (segments[0] === 'like' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { target_type, target_id } = body
      if (!target_type || !target_id) return jsonBad('缺少参数')
      try {
        await dbRun(
          db,
          'INSERT INTO interactions (user_id, target_type, target_id, action_type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          user.user_id,
          target_type,
          target_id,
          'like'
        )
      } catch {
        return jsonBad('已经点赞过了')
      }
      const col = target_type === 'post' ? 'posts' : 'comments'
      const idCol = target_type === 'post' ? 'post_id' : 'comment_id'
      await dbRun(
        db,
        `UPDATE ${col} SET like_count = like_count + 1 WHERE ${idCol} = ?`,
        target_id
      )
      return jsonOk('点赞成功')
    }

    // /feed/favorite — favorite
    if (segments[0] === 'favorite' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { target_id } = body
      if (!target_id) return jsonBad('缺少 target_id')
      try {
        await dbRun(
          db,
          'INSERT INTO interactions (user_id, target_type, target_id, action_type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          user.user_id,
          'post',
          target_id,
          'favorite'
        )
      } catch {
        return jsonBad('已经收藏过了')
      }
      return jsonOk('收藏成功')
    }

    // /feed/share — share
    if (segments[0] === 'share' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { target_id } = body
      if (!target_id) return jsonBad('缺少 target_id')
      await dbRun(
        db,
        'UPDATE posts SET share_count = share_count + 1, updated_at = datetime("now") WHERE post_id = ?',
        target_id
      )
      return jsonOk('分享成功')
    }

    // /feed/post/{postId}/promote
    if (segments[0] === 'post' && segments[2] === 'promote') {
      if (!user) return jsonUnauthorized('未登录')
      const postId = segments[1]
      const durationHours = body.duration_hours || 24
      const cost = durationHours * 10

      // Check coin account
      const account = await dbGet(
        db,
        'SELECT * FROM coin_accounts WHERE user_id = ?',
        user.user_id
      )
      if (!account || account.balance < cost) return jsonBad('金币不足')

      // Deduct coins
      await dbRun(
        db,
        'UPDATE coin_accounts SET balance = balance - ?, updated_at = datetime("now") WHERE user_id = ?',
        cost,
        user.user_id
      )

      // Set promotion
      await dbRun(
        db,
        `UPDATE posts SET is_promoted = 1, promote_expire_at = datetime('now', '+' || ? || ' hours'), updated_at = datetime("now") WHERE post_id = ?`,
        durationHours,
        postId
      )

      // Insert transaction
      const txId = uuid()
      await dbRun(
        db,
        `INSERT INTO coin_transactions (transaction_id, user_id, amount, type, reference_id, description, created_at)
         VALUES (?, ?, ?, 'promote', ?, ?, datetime('now'))`,
        txId,
        user.user_id,
        -cost,
        postId,
        `推广帖子 ${durationHours} 小时`
      )

      return jsonOk('推广成功', { cost, duration_hours: durationHours })
    }

    return jsonBad('未知的 POST 路由')
  }

  // ── PUT ──
  if (method === 'PUT') {
    let body
    try {
      body = await request.json()
    } catch {
      return jsonBad('请求体格式错误')
    }

    // /feed/post/{postId}/visibility
    if (segments[0] === 'post' && segments[2] === 'visibility') {
      if (!user) return jsonUnauthorized('未登录')
      const postId = segments[1]
      const { visibility } = body
      if (!['public', 'followers', 'private'].includes(visibility)) {
        return jsonBad('无效的可见性')
      }
      const post = await dbGet(db, 'SELECT user_id FROM posts WHERE post_id = ?', postId)
      if (!post) return jsonBad('帖子不存在')
      if (post.user_id !== user.user_id) return jsonUnauthorized('无权操作')
      await dbRun(
        db,
        'UPDATE posts SET visibility = ?, updated_at = datetime("now") WHERE post_id = ?',
        visibility,
        postId
      )
      return jsonOk('修改成功')
    }

    return jsonBad('未知的 PUT 路由')
  }

  // ── DELETE ──
  if (method === 'DELETE') {
    let body = {}
    try {
      const text = await request.text()
      if (text) body = JSON.parse(text)
    } catch {
      // Some DELETE requests may not have a body
    }

    // /feed/post/{postId} — soft delete
    if (segments[0] === 'post' && segments.length === 2) {
      if (!user) return jsonUnauthorized('未登录')
      const postId = segments[1]
      const post = await dbGet(db, 'SELECT user_id FROM posts WHERE post_id = ?', postId)
      if (!post) return jsonBad('帖子不存在')
      if (post.user_id !== user.user_id) return jsonUnauthorized('无权操作')
      await dbRun(
        db,
        "UPDATE posts SET status = 'deleted', updated_at = datetime('now') WHERE post_id = ?",
        postId
      )
      return jsonOk('删除成功')
    }

    // /feed/comment/{commentId} — soft delete comment
    if (segments[0] === 'comment' && segments.length === 2) {
      if (!user) return jsonUnauthorized('未登录')
      const commentId = segments[1]
      const comment = await dbGet(
        db,
        'SELECT user_id, post_id FROM comments WHERE comment_id = ?',
        commentId
      )
      if (!comment) return jsonBad('评论不存在')
      if (comment.user_id !== user.user_id) return jsonUnauthorized('无权操作')
      await dbRun(
        db,
        "UPDATE comments SET status = 'deleted' WHERE comment_id = ?",
        commentId
      )
      await dbRun(
        db,
        'UPDATE posts SET comment_count = MAX(comment_count - 1, 0), updated_at = datetime("now") WHERE post_id = ?',
        comment.post_id
      )
      return jsonOk('删除成功')
    }

    // /feed/like — unlike
    if (segments[0] === 'like' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { target_type, target_id } = body
      if (!target_type || !target_id) return jsonBad('缺少参数')
      const deleted = await dbGet(
        db,
        'DELETE FROM interactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND action_type = ? RETURNING 1',
        user.user_id,
        target_type,
        target_id,
        'like'
      )
      if (deleted) {
        const col = target_type === 'post' ? 'posts' : 'comments'
        const idCol = target_type === 'post' ? 'post_id' : 'comment_id'
        await dbRun(
          db,
          `UPDATE ${col} SET like_count = MAX(like_count - 1, 0) WHERE ${idCol} = ?`,
          target_id
        )
      }
      return jsonOk('取消点赞成功')
    }

    // /feed/favorite — unfavorite
    if (segments[0] === 'favorite' && segments.length === 1) {
      if (!user) return jsonUnauthorized('未登录')
      const { target_id } = body
      if (!target_id) return jsonBad('缺少 target_id')
      await dbRun(
        db,
        "DELETE FROM interactions WHERE user_id = ? AND target_type = 'post' AND target_id = ? AND action_type = 'favorite'",
        user.user_id,
        target_id
      )
      return jsonOk('取消收藏成功')
    }

    // /feed/search/history — clear all
    if (segments[0] === 'search' && segments[1] === 'history' && segments.length === 2) {
      if (!user) return jsonUnauthorized('未登录')
      await dbRun(db, 'DELETE FROM search_history WHERE user_id = ?', user.user_id)
      return jsonOk('清除成功')
    }

    // /feed/search/history/{historyId} — delete one
    if (segments[0] === 'search' && segments[1] === 'history' && segments.length === 3) {
      if (!user) return jsonUnauthorized('未登录')
      const historyId = segments[2]
      await dbRun(
        db,
        'DELETE FROM search_history WHERE user_id = ? AND history_id = ?',
        user.user_id,
        historyId
      )
      return jsonOk('删除成功')
    }

    return jsonBad('未知的 DELETE 路由')
  }

  return jsonBad('不支持的请求方法')
}
