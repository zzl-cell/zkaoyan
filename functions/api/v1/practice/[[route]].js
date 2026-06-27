/**
 * Pages Function: Practice module catch-all route
 * Handles all /api/v1/practice/* endpoints
 *
 * D1 binding required: DB (see wrangler.jsonc)
 */
import {
  extractUser, jsonOk, jsonBad, jsonUnauthorized,
  uuid, dbRun, dbGet, dbAll,
} from '../_utils'

// ── Helpers ──

function safeJsonParse(str, fallback) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str ?? fallback) }
  catch { return fallback }
}

function stripQuestionAnswers(questions) {
  if (!Array.isArray(questions)) return questions
  return questions.map(q => {
    const { answer, explanation, ...rest } = q
    return rest
  })
}

function parsePagination(url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m}分钟${s}秒`
  if (m > 0) return `${m}分钟${s}秒`
  return `${s}秒`
}

function parseSessionRow(row) {
  if (!row) return null
  return {
    ...row,
    paper_snapshot: safeJsonParse(row.paper_snapshot, []),
    user_answers: safeJsonParse(row.user_answers, {}),
    score_detail: safeJsonParse(row.score_detail, []),
  }
}

// ── Main handler ──

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const method = request.method
  const segments = url.pathname.replace(/^\/api\/v1\/practice\//, '').split('/').filter(Boolean)
  const db = env.DB

  try {
    // ================================================================
    // GET routes
    // ================================================================
    if (method === 'GET') {

      // sprint/papers — list active paper_templates (no auth)
      if (segments[0] === 'sprint' && segments[1] === 'papers' && !segments[2]) {
        const papers = await dbAll(db,
          "SELECT * FROM paper_templates WHERE status = 'active' ORDER BY paper_id DESC")
        return jsonOk('ok', papers.map(p => ({
          ...p,
          question_ids: safeJsonParse(p.question_ids, []),
        })))
      }

      // sprint/paper/{paperId} — get paper detail
      if (segments[0] === 'sprint' && segments[1] === 'paper' && segments[2]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const paper = await dbGet(db,
          "SELECT * FROM paper_templates WHERE paper_id = ? AND status = 'active'", segments[2])
        if (!paper) return jsonBad('试卷不存在')
        return jsonOk('ok', {
          ...paper,
          question_ids: safeJsonParse(paper.question_ids, []),
        })
      }

      // knowledge-tree — ordered by level, sort_order
      if (segments[0] === 'knowledge-tree' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const tree = await dbAll(db,
          "SELECT * FROM knowledge_tree ORDER BY level ASC, sort_order ASC")
        return jsonOk('ok', tree)
      }

      // session/ongoing — user's ongoing session (return null if none)
      if (segments[0] === 'session' && segments[1] === 'ongoing') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const session = await dbGet(db,
          "SELECT * FROM exam_sessions WHERE user_id = ? AND status = 'ongoing' ORDER BY started_at DESC LIMIT 1",
          payload.user_id)
        if (!session) return jsonOk('ok', null)
        const parsed = parseSessionRow(session)
        parsed.paper_snapshot = stripQuestionAnswers(parsed.paper_snapshot)
        return jsonOk('ok', parsed)
      }

      // session/{sessionId} — get session (strip answers for unanswered questions)
      if (segments[0] === 'session' && segments[1] && segments[1] !== 'ongoing') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const session = await dbGet(db,
          "SELECT * FROM exam_sessions WHERE session_id = ? AND user_id = ?",
          segments[1], payload.user_id)
        if (!session) return jsonBad('会话不存在')
        const parsed = parseSessionRow(session)
        // Strip answer/explanation for unanswered questions only
        parsed.paper_snapshot = parsed.paper_snapshot.map((q, i) => {
          const ua = parsed.user_answers
          if (ua && ua[String(i)] !== undefined && ua[String(i)] !== '') return q
          const { answer, explanation, ...rest } = q
          return rest
        })
        return jsonOk('ok', parsed)
      }

      // result/{sessionId}/rank — personal rank for this paper
      if (segments[0] === 'result' && segments[1] && segments[2] === 'rank') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const session = await dbGet(db,
          "SELECT * FROM exam_sessions WHERE session_id = ? AND user_id = ?",
          segments[1], payload.user_id)
        if (!session) return jsonBad('会话不存在')

        const snapshot = safeJsonParse(session.paper_snapshot, {})
        let rankQuery
        let rankParams
        if (snapshot.paper_id) {
          // Sprint paper — match sessions whose paper_snapshot contains same paper_id
          const allFinished = await dbAll(db,
            `SELECT score, paper_snapshot FROM exam_sessions
             WHERE user_id = ? AND status = 'finished' AND paper_type = ?`,
            payload.user_id, session.paper_type)
          const scores = allFinished
            .filter(r => {
              try { return safeJsonParse(r.paper_snapshot, {}).paper_id === snapshot.paper_id }
              catch { return false }
            })
            .map(r => r.score || 0)
          const currentScore = session.score || 0
          const totalAttempts = scores.length
          const avgScore = totalAttempts > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0
          const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0
          return jsonOk('ok', { current_score: currentScore, avg_score: avgScore, best_score: bestScore, total_attempts: totalAttempts })
        } else {
          // Random/mock — match by paper_type
          const rows = await dbAll(db,
            `SELECT score FROM exam_sessions
             WHERE user_id = ? AND status = 'finished' AND paper_type = ?`,
            payload.user_id, session.paper_type)
          const scores = rows.map(r => r.score || 0)
          const currentScore = session.score || 0
          const totalAttempts = scores.length
          const avgScore = totalAttempts > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0
          const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0
          return jsonOk('ok', { current_score: currentScore, avg_score: avgScore, best_score: bestScore, total_attempts: totalAttempts })
        }
      }

      // result/{sessionId} — finished session with full answers + duration_display
      if (segments[0] === 'result' && segments[1] && !segments[2]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const session = await dbGet(db,
          "SELECT * FROM exam_sessions WHERE session_id = ? AND user_id = ?",
          segments[1], payload.user_id)
        if (!session) return jsonBad('会话不存在')
        const parsed = parseSessionRow(session)
        if (session.started_at && session.finished_at) {
          const dur = Math.floor((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000)
          parsed.duration_display = formatDuration(Math.max(0, dur))
        }
        return jsonOk('ok', parsed)
      }

      // wrongbook/stats — { total } count of non-removed wrongs
      if (segments[0] === 'wrongbook' && segments[1] === 'stats') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const row = await dbGet(db,
          "SELECT COUNT(*) AS total FROM wrong_book WHERE user_id = ? AND (is_removed = 0 OR ISNULL(is_removed))",
          payload.user_id)
        return jsonOk('ok', { total: row?.total ?? 0 })
      }

      // wrongbook/{recordId} — wrong book detail
      if (segments[0] === 'wrongbook' && segments[1] && segments[1] !== 'stats') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const record = await dbGet(db,
          "SELECT * FROM wrong_book WHERE record_id = ? AND user_id = ? AND (is_removed = 0 OR ISNULL(is_removed))",
          segments[1], payload.user_id)
        if (!record) return jsonBad('记录不存在')
        return jsonOk('ok', {
          ...record,
          question_snapshot: safeJsonParse(record.question_snapshot, {}),
        })
      }

      // wrongbook — paginated list (exclude is_removed=1)
      if (segments[0] === 'wrongbook' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const { page, pageSize, offset } = parsePagination(url)
        const totalRow = await dbGet(db,
          "SELECT COUNT(*) AS total FROM wrong_book WHERE user_id = ? AND (is_removed = 0 OR ISNULL(is_removed))",
          payload.user_id)
        const list = await dbAll(db,
          `SELECT * FROM wrong_book
           WHERE user_id = ? AND (is_removed = 0 OR ISNULL(is_removed))
           ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
          payload.user_id, pageSize, offset)
        return jsonOk('ok', {
          list: list.map(r => ({ ...r, question_snapshot: safeJsonParse(r.question_snapshot, {}) })),
          total: totalRow?.total ?? 0,
          page, pageSize,
        })
      }

      // favorites — paginated
      if (segments[0] === 'favorites' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const { page, pageSize, offset } = parsePagination(url)
        const totalRow = await dbGet(db,
          "SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?", payload.user_id)
        const list = await dbAll(db,
          "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          payload.user_id, pageSize, offset)
        return jsonOk('ok', {
          list: list.map(r => ({ ...r, question_snapshot: safeJsonParse(r.question_snapshot, {}) })),
          total: totalRow?.total ?? 0,
          page, pageSize,
        })
      }

      // history — paginated study_records
      if (segments[0] === 'history' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const { page, pageSize, offset } = parsePagination(url)
        const totalRow = await dbGet(db,
          "SELECT COUNT(*) AS total FROM study_records WHERE user_id = ?", payload.user_id)
        const list = await dbAll(db,
          "SELECT * FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          payload.user_id, pageSize, offset)
        return jsonOk('ok', { list, total: totalRow?.total ?? 0, page, pageSize })
      }

      // stats/trend — last 30 days
      if (segments[0] === 'stats' && segments[1] === 'trend') {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
        const rows = await dbAll(db,
          `SELECT date,
                  SUM(question_count) AS questions,
                  SUM(correct_count) AS correct,
                  SUM(duration_seconds) AS duration_seconds
           FROM study_records
           WHERE user_id = ? AND date >= ?
           GROUP BY date ORDER BY date ASC`,
          payload.user_id, thirtyDaysAgo)
        return jsonOk('ok', {
          trend: rows.map(r => ({
            date: r.date,
            questions: r.questions || 0,
            correct: r.correct || 0,
            accuracy: r.questions > 0 ? Math.round((r.correct / r.questions) * 100) : 0,
            duration_minutes: Math.round((r.duration_seconds || 0) / 60),
          })),
        })
      }

      // stats — today_questions, total_questions, accuracy, total_duration_hours
      if (segments[0] === 'stats' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const today = new Date().toISOString().slice(0, 10)
        const todayRow = await dbGet(db,
          "SELECT SUM(question_count) AS cnt, SUM(correct_count) AS cor FROM study_records WHERE user_id = ? AND date = ?",
          payload.user_id, today)
        const totalRow = await dbGet(db,
          "SELECT SUM(question_count) AS total_q, SUM(correct_count) AS total_c, SUM(duration_seconds) AS total_dur FROM study_records WHERE user_id = ?",
          payload.user_id)
        const totalQ = totalRow?.total_q || 0
        const totalC = totalRow?.total_c || 0
        return jsonOk('ok', {
          today_questions: todayRow?.cnt || 0,
          total_questions: totalQ,
          accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
          total_duration_hours: Math.round(((totalRow?.total_dur || 0) / 3600) * 10) / 10,
        })
      }

      // questions — paginated active questions + stats by type
      if (segments[0] === 'questions' && !segments[1]) {
        const payload = await extractUser(request, env)
        if (!payload) return jsonUnauthorized('请先登录')
        const { page, pageSize, offset } = parsePagination(url)
        const totalRow = await dbGet(db,
          "SELECT COUNT(*) AS total FROM questions WHERE status = 'active'")
        const list = await dbAll(db,
          `SELECT * FROM questions WHERE status = 'active'
           ORDER BY question_id ASC LIMIT ? OFFSET ?`, pageSize, offset)
        const typeStats = await dbAll(db,
          `SELECT question_type, COUNT(*) AS count FROM questions WHERE status = 'active' GROUP BY question_type`)
        return jsonOk('ok', {
          list: list.map(q => ({ ...q, options: safeJsonParse(q.options, []) })),
          total: totalRow?.total ?? 0,
          page, pageSize,
          type_stats: typeStats,
        })
      }

      return jsonBad('路由不存在')
    }

    // ================================================================
    // POST routes (all require auth)
    // ================================================================
    if (method === 'POST') {
      const payload = await extractUser(request, env)
      if (!payload) return jsonUnauthorized('请先登录')
      const userId = payload.user_id

      // random/start — 20 random questions, paper_type='random'
      if (segments[0] === 'random' && segments[1] === 'start' && !segments[2]) {
        const questions = await dbAll(db,
          `SELECT * FROM questions WHERE status = 'active' ORDER BY RANDOM() LIMIT 20`)
        if (!questions.length) return jsonBad('没有可用题目')

        const sessionId = uuid()
        const now = new Date().toISOString()
        const snapshot = questions.map(q => ({
          ...q,
          options: safeJsonParse(q.options, []),
        }))

        await dbRun(db,
          `INSERT INTO exam_sessions
           (session_id, user_id, paper_type, paper_snapshot, user_answers,
            current_index, remaining_seconds, score_detail,
            correct_count, wrong_count, total_count, score, status, started_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          sessionId, userId, 'random', JSON.stringify(snapshot), '{}',
          0, 0, '[]', 0, 0, questions.length, 0, 'ongoing', now)

        return jsonOk('ok', {
          session_id: sessionId, user_id: userId, paper_type: 'random',
          paper_snapshot: stripQuestionAnswers(snapshot),
          user_answers: {}, current_index: 0, remaining_seconds: 0,
          score_detail: [], correct_count: 0, wrong_count: 0,
          total_count: questions.length, score: 0, status: 'ongoing', started_at: now,
        })
      }

      // mock/start — 20 random questions, paper_type='mock', with duration
      if (segments[0] === 'mock' && segments[1] === 'start' && !segments[2]) {
        const body = await request.json().catch(() => ({}))
        const durationMin = body.duration || 60

        const questions = await dbAll(db,
          `SELECT * FROM questions WHERE status = 'active' ORDER BY RANDOM() LIMIT 20`)
        if (!questions.length) return jsonBad('没有可用题目')

        const sessionId = uuid()
        const now = new Date().toISOString()
        const snapshot = questions.map(q => ({
          ...q,
          options: safeJsonParse(q.options, []),
        }))

        await dbRun(db,
          `INSERT INTO exam_sessions
           (session_id, user_id, paper_type, paper_snapshot, user_answers,
            current_index, remaining_seconds, score_detail,
            correct_count, wrong_count, total_count, score, status, started_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          sessionId, userId, 'mock', JSON.stringify(snapshot), '{}',
          0, durationMin * 60, '[]', 0, 0, questions.length, 0, 'ongoing', now)

        return jsonOk('ok', {
          session_id: sessionId, user_id: userId, paper_type: 'mock',
          paper_snapshot: stripQuestionAnswers(snapshot),
          user_answers: {}, current_index: 0, remaining_seconds: durationMin * 60,
          score_detail: [], correct_count: 0, wrong_count: 0,
          total_count: questions.length, score: 0, status: 'ongoing', started_at: now,
        })
      }

      // session/{sessionId}/submit — grade answers
      if (segments[0] === 'session' && segments[1] && segments[2] === 'submit') {
        const sessionId = segments[1]
        const body = await request.json().catch(() => ({}))
        const userAnswers = body.user_answers || body.answers || {}

        const session = await dbGet(db,
          "SELECT * FROM exam_sessions WHERE session_id = ? AND user_id = ?",
          sessionId, userId)
        if (!session) return jsonBad('会话不存在')
        if (session.status !== 'ongoing') return jsonBad('会话已结束')

        const paperSnapshot = safeJsonParse(session.paper_snapshot, [])
        let correctCount = 0
        let wrongCount = 0
        const scoreDetail = []

        for (let i = 0; i < paperSnapshot.length; i++) {
          const q = paperSnapshot[i]
          const raw = userAnswers[String(i)] ?? userAnswers[i] ?? ''
          let isCorrect = false

          if (q.question_type === 'multi') {
            // Multi-select: sorted array comparison
            const userArr = Array.isArray(raw) ? [...raw].sort() : []
            let correctArr
            if (Array.isArray(q.answer)) {
              correctArr = [...q.answer].sort()
            } else {
              correctArr = safeJsonParse(q.answer, []).sort()
            }
            isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr)
          } else {
            // Single-choice / Judge: exact string match
            isCorrect = String(raw) === String(q.answer)
          }

          if (isCorrect) {
            correctCount++
            scoreDetail.push({ question_index: i, correct: true })
          } else {
            wrongCount++
            scoreDetail.push({
              question_index: i, correct: false,
              user_answer: raw, correct_answer: q.answer,
            })
          }
        }

        const totalCount = paperSnapshot.length
        const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
        const now = new Date().toISOString()
        const durationSeconds = session.started_at
          ? Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
          : 0

        // Update session
        await dbRun(db,
          `UPDATE exam_sessions
           SET user_answers = ?, score_detail = ?, correct_count = ?, wrong_count = ?,
               score = ?, status = 'finished', finished_at = ?
           WHERE session_id = ?`,
          JSON.stringify(userAnswers), JSON.stringify(scoreDetail),
          correctCount, wrongCount, score, now, sessionId)

        // Insert study record
        const today = now.slice(0, 10)
        await dbRun(db,
          `INSERT INTO study_records (user_id, session_id, date, question_count, correct_count, duration_seconds, created_at)
           VALUES (?,?,?,?,?,?,?)`,
          userId, sessionId, today, totalCount, correctCount, durationSeconds, now)

        // Upsert wrong_book for each wrong answer
        for (const detail of scoreDetail) {
          if (detail.correct) continue
          const q = paperSnapshot[detail.question_index]
          const existing = await dbGet(db,
            `SELECT record_id FROM wrong_book
             WHERE user_id = ? AND question_id = ? AND (is_removed = 0 OR ISNULL(is_removed))`,
            userId, q.question_id)
          if (existing) {
            await dbRun(db,
              "UPDATE wrong_book SET wrong_count = wrong_count + 1, updated_at = ? WHERE record_id = ?",
              now, existing.record_id)
          } else {
            await dbRun(db,
              `INSERT INTO wrong_book
               (record_id, user_id, session_id, question_id, question_snapshot,
                user_answer, correct_answer, wrong_count, is_removed, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              uuid(), userId, sessionId, q.question_id, JSON.stringify(q),
              String(detail.user_answer ?? ''), String(detail.correct_answer ?? ''),
              1, 0, now, now)
          }
        }

        // Return updated session
        const updated = await dbGet(db, "SELECT * FROM exam_sessions WHERE session_id = ?", sessionId)
        return jsonOk('ok', parseSessionRow(updated))
      }

      // favorites/{questionId} — add to favorites
      if (segments[0] === 'favorites' && segments[1] && !segments[2]) {
        const questionId = segments[1]
        const existing = await dbGet(db,
          "SELECT 1 FROM favorites WHERE user_id = ? AND question_id = ?", userId, questionId)
        if (existing) return jsonBad('已收藏该题目')

        const question = await dbGet(db,
          "SELECT * FROM questions WHERE question_id = ?", questionId)
        if (!question) return jsonBad('题目不存在')

        const snapshot = { ...question, options: safeJsonParse(question.options, []) }
        await dbRun(db,
          "INSERT INTO favorites (user_id, question_id, question_snapshot, created_at) VALUES (?,?,?,?)",
          userId, questionId, JSON.stringify(snapshot), new Date().toISOString())
        return jsonOk('ok', null)
      }

      return jsonBad('路由不存在')
    }

    // ================================================================
    // PUT routes (auth required)
    // ================================================================
    if (method === 'PUT') {
      const payload = await extractUser(request, env)
      if (!payload) return jsonUnauthorized('请先登录')

      // session/{sessionId}/save — update progress
      if (segments[0] === 'session' && segments[1] && segments[2] === 'save') {
        const session = await dbGet(db,
          "SELECT status FROM exam_sessions WHERE session_id = ? AND user_id = ?",
          segments[1], payload.user_id)
        if (!session) return jsonBad('会话不存在')
        if (session.status !== 'ongoing') return jsonBad('会话已结束')

        const body = await request.json().catch(() => ({}))
        await dbRun(db,
          `UPDATE exam_sessions SET user_answers = ?, current_index = ?, remaining_seconds = ?
           WHERE session_id = ?`,
          JSON.stringify(body.user_answers || {}), body.current_index || 0,
          body.remaining_seconds ?? 0, segments[1])
        return jsonOk('ok', null)
      }

      return jsonBad('路由不存在')
    }

    // ================================================================
    // DELETE routes (auth required)
    // ================================================================
    if (method === 'DELETE') {
      const payload = await extractUser(request, env)
      if (!payload) return jsonUnauthorized('请先登录')

      // session/{sessionId}/abandon
      if (segments[0] === 'session' && segments[1] && segments[2] === 'abandon') {
        await dbRun(db,
          "UPDATE exam_sessions SET status = 'abandoned' WHERE session_id = ? AND user_id = ?",
          segments[1], payload.user_id)
        return jsonOk('ok', null)
      }

      // favorites/{questionId} — remove from favorites
      if (segments[0] === 'favorites' && segments[1] && !segments[2]) {
        await dbRun(db,
          "DELETE FROM favorites WHERE user_id = ? AND question_id = ?",
          payload.user_id, segments[1])
        return jsonOk('ok', null)
      }

      return jsonBad('路由不存在')
    }

    return jsonBad('不支持的请求方法')
  } catch (err) {
    console.error('Practice API error:', err)
    return jsonBad(err.message || '服务器内部错误')
  }
}
