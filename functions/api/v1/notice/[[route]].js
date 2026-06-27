import { jsonOk, jsonBad, dbGet, dbAll } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.replace(/^\/api\/v1\/notice\//, '').split('/').filter(Boolean);

  if (method !== 'GET') return jsonBad('Method not allowed');

  try {
    // GET list — paginated published notices (exclude content)
    if (segments[0] === 'list' && segments.length === 1) {
      const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
      const type = url.searchParams.get('type');
      const offset = (page - 1) * pageSize;

      let where = "WHERE status = 'published'";
      const params = [];
      if (type) {
        where += ' AND type = ?';
        params.push(type);
      }

      const countRow = await dbGet(env.DB, `SELECT COUNT(*) as total FROM notices ${where}`, ...params);
      const total = countRow ? countRow.total : 0;

      const notices = await dbAll(
        env.DB,
        `SELECT notice_id, title, type, cover_image, created_at FROM notices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        ...params, pageSize, offset
      );

      return jsonOk('ok', { notices, total, page, page_size: pageSize });
    }

    // GET {noticeId} — full notice detail including content
    // If segments.length === 1 and segments[0] !== 'list', treat as noticeId
    if (segments.length === 1 && segments[0] !== 'list') {
      const noticeId = segments[0];
      const notice = await dbGet(
        env.DB,
        "SELECT notice_id, title, content, type, cover_image, status, created_at FROM notices WHERE notice_id = ? AND status = 'published'",
        noticeId
      );
      if (!notice) return jsonBad('Notice not found');

      return jsonOk('ok', notice);
    }

    return jsonBad('Route not found');
  } catch (err) {
    return jsonBad(err.message || 'Internal server error');
  }
}
