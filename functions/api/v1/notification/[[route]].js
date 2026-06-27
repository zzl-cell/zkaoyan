import { extractUser, jsonOk, jsonBad, jsonUnauthorized, dbRun, dbGet, dbAll } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.replace(/^\/api\/v1\/notification\//, '').split('/').filter(Boolean);

  try {
    // All routes require auth
    const user = await extractUser(request, env);
    if (!user) return jsonUnauthorized('Unauthorized');

    // ==================== GET ====================
    if (method === 'GET') {

      // GET list — paginated notifications ordered by created_at DESC
      if (segments[0] === 'list' && segments.length === 1) {
        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
        const type = url.searchParams.get('type');
        const offset = (page - 1) * pageSize;

        let where = 'WHERE user_id = ?';
        const params = [user.user_id];
        if (type) {
          where += ' AND type = ?';
          params.push(type);
        }

        const countRow = await dbGet(env.DB, `SELECT COUNT(*) as total FROM notifications ${where}`, ...params);
        const total = countRow ? countRow.total : 0;

        const notifications = await dbAll(
          env.DB,
          `SELECT notification_id, user_id, type, sub_type, title, content, source_type, source_id, is_read, created_at FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          ...params, pageSize, offset
        );

        return jsonOk('ok', { notifications, total, page, page_size: pageSize });
      }

      // GET unread — count unread grouped by type
      if (segments[0] === 'unread' && segments.length === 1) {
        const rows = await dbAll(
          env.DB,
          'SELECT type, COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 GROUP BY type',
          user.user_id
        );

        const unreadByType = { comment: 0, reply: 0, mention: 0, follow: 0, system: 0 };
        let hasUnread = false;
        for (const row of rows) {
          if (row.type in unreadByType) {
            unreadByType[row.type] = row.count;
          }
          if (row.count > 0) hasUnread = true;
        }

        return jsonOk('ok', { has_unread: hasUnread, unread_by_type: unreadByType });
      }

      return jsonBad('Route not found');
    }

    // ==================== POST ====================
    if (method === 'POST') {

      // POST read — mark notifications as read
      if (segments[0] === 'read' && segments.length === 1) {
        let body;
        try {
          body = await request.json();
        } catch {
          body = {};
        }

        const { ids } = body;
        if (ids && Array.isArray(ids) && ids.length > 0) {
          // Mark specific notifications as read
          const placeholders = ids.map(() => '?').join(',');
          await dbRun(
            env.DB,
            `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND notification_id IN (${placeholders})`,
            user.user_id, ...ids
          );
        } else {
          // Mark ALL user's notifications as read
          await dbRun(env.DB, 'UPDATE notifications SET is_read = 1 WHERE user_id = ?', user.user_id);
        }

        return jsonOk('ok', null);
      }

      return jsonBad('Route not found');
    }

    // ==================== DELETE ====================
    if (method === 'DELETE') {

      // DELETE {notificationId}
      if (segments.length === 1) {
        const notificationId = segments[0];

        const notification = await dbGet(
          env.DB,
          'SELECT notification_id, user_id FROM notifications WHERE notification_id = ?',
          notificationId
        );
        if (!notification) return jsonBad('Notification not found');
        if (notification.user_id !== user.user_id) return jsonUnauthorized('Not allowed');

        await dbRun(env.DB, 'DELETE FROM notifications WHERE notification_id = ?', notificationId);

        return jsonOk('ok', null);
      }

      return jsonBad('Route not found');
    }

    return jsonBad('Method not allowed');
  } catch (err) {
    return jsonBad(err.message || 'Internal server error');
  }
}
