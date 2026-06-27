import { extractUser, jsonOk, jsonBad, jsonUnauthorized, uuid, dbRun, dbGet, dbAll } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.replace(/^\/api\/v1\/shop\//, '').split('/').filter(Boolean);

  try {
    // ==================== GET ====================
    if (method === 'GET') {

      // GET products — paginated active products
      if (segments[0] === 'products' && segments.length === 1) {
        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
        const category = url.searchParams.get('category');
        const offset = (page - 1) * pageSize;

        let where = "WHERE status = 'active'";
        const params = [];
        if (category) {
          where += ' AND category = ?';
          params.push(category);
        }

        const countRow = await dbGet(env.DB, `SELECT COUNT(*) as total FROM products ${where}`, ...params);
        const total = countRow ? countRow.total : 0;

        const products = await dbAll(
          env.DB,
          `SELECT product_id, name, description, price, category, cover_image, is_question_bank, question_count, max_discount_ratio, created_at FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          ...params, pageSize, offset
        );

        const user = await extractUser(request, env);
        if (user) {
          const assetRows = await dbAll(env.DB, 'SELECT product_id FROM user_assets WHERE user_id = ?', user.user_id);
          const purchasedSet = new Set(assetRows.map(r => r.product_id));
          for (const p of products) {
            p.is_purchased = purchasedSet.has(p.product_id);
          }
        } else {
          for (const p of products) {
            p.is_purchased = false;
          }
        }

        return jsonOk('ok', { products, total, page, page_size: pageSize });
      }

      // GET orders (auth) — user's orders paginated
      if (segments[0] === 'orders' && segments.length === 1) {
        const user = await extractUser(request, env);
        if (!user) return jsonUnauthorized('Unauthorized');

        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
        const offset = (page - 1) * pageSize;

        const countRow = await dbGet(env.DB, 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?', user.user_id);
        const total = countRow ? countRow.total : 0;

        const orders = await dbAll(
          env.DB,
          'SELECT order_id, user_id, product_id, product_name, original_amount, final_amount, payment_method, status, paid_at, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
          user.user_id, pageSize, offset
        );

        return jsonOk('ok', { orders, total, page, page_size: pageSize });
      }

      // GET library (auth) — user's purchased assets with product info
      if (segments[0] === 'library' && segments.length === 1) {
        const user = await extractUser(request, env);
        if (!user) return jsonUnauthorized('Unauthorized');

        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
        const offset = (page - 1) * pageSize;

        const countRow = await dbGet(env.DB, 'SELECT COUNT(*) as total FROM user_assets WHERE user_id = ?', user.user_id);
        const total = countRow ? countRow.total : 0;

        const items = await dbAll(
          env.DB,
          `SELECT ua.user_id, ua.product_id, ua.order_id, ua.created_at AS purchased_at,
                  p.name, p.description, p.price, p.category, p.cover_image, p.is_question_bank, p.question_count
           FROM user_assets ua JOIN products p ON ua.product_id = p.product_id
           WHERE ua.user_id = ? ORDER BY ua.created_at DESC LIMIT ? OFFSET ?`,
          user.user_id, pageSize, offset
        );

        return jsonOk('ok', { items, total, page, page_size: pageSize });
      }

      // GET library/{productId} (auth) — single library item
      if (segments[0] === 'library' && segments.length === 2) {
        const user = await extractUser(request, env);
        if (!user) return jsonUnauthorized('Unauthorized');

        const productId = segments[1];
        const item = await dbGet(
          env.DB,
          `SELECT ua.user_id, ua.product_id, ua.order_id, ua.created_at AS purchased_at,
                  p.name, p.description, p.price, p.category, p.cover_image, p.is_question_bank, p.question_count
           FROM user_assets ua JOIN products p ON ua.product_id = p.product_id
           WHERE ua.user_id = ? AND ua.product_id = ?`,
          user.user_id, productId
        );
        if (!item) return jsonBad('Product not found in library');

        return jsonOk('ok', item);
      }

      // GET user/assets (auth) — same as library
      if (segments[0] === 'user' && segments[1] === 'assets' && segments.length === 2) {
        const user = await extractUser(request, env);
        if (!user) return jsonUnauthorized('Unauthorized');

        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size')) || 20));
        const offset = (page - 1) * pageSize;

        const countRow = await dbGet(env.DB, 'SELECT COUNT(*) as total FROM user_assets WHERE user_id = ?', user.user_id);
        const total = countRow ? countRow.total : 0;

        const items = await dbAll(
          env.DB,
          `SELECT ua.user_id, ua.product_id, ua.order_id, ua.created_at AS purchased_at,
                  p.name, p.description, p.price, p.category, p.cover_image, p.is_question_bank, p.question_count
           FROM user_assets ua JOIN products p ON ua.product_id = p.product_id
           WHERE ua.user_id = ? ORDER BY ua.created_at DESC LIMIT ? OFFSET ?`,
          user.user_id, pageSize, offset
        );

        return jsonOk('ok', { items, total, page, page_size: pageSize });
      }

      // GET user/assets/{productId} (auth) — check purchased
      if (segments[0] === 'user' && segments[1] === 'assets' && segments.length === 3) {
        const user = await extractUser(request, env);
        if (!user) return jsonUnauthorized('Unauthorized');

        const productId = segments[2];
        const asset = await dbGet(env.DB, 'SELECT 1 FROM user_assets WHERE user_id = ? AND product_id = ?', user.user_id, productId);

        return jsonOk('ok', { is_purchased: !!asset, product_id: productId });
      }

      // GET product/{productId}/preview — first 5 questions stripped of answer
      if (segments[0] === 'product' && segments.length === 3 && segments[2] === 'preview') {
        const productId = segments[1];
        const product = await dbGet(env.DB, 'SELECT product_id, category, is_question_bank FROM products WHERE product_id = ?', productId);
        if (!product) return jsonBad('Product not found');
        if (!product.is_question_bank) return jsonBad('Product is not a question bank');

        const countRow = await dbGet(env.DB, "SELECT COUNT(*) as total FROM questions WHERE category = ? AND status = 'active'", product.category);
        const total = countRow ? countRow.total : 0;

        const questions = await dbAll(
          env.DB,
          "SELECT question_id, title, type, options, category, difficulty FROM questions WHERE category = ? AND status = 'active' ORDER BY created_at ASC LIMIT 5",
          product.category
        );

        // Strip answer-related fields
        for (const q of questions) {
          delete q.answer;
          delete q.explanation;
          delete q.correct_answer;
        }

        return jsonOk('ok', { questions, total });
      }

      // GET product/{productId} — product detail
      if (segments[0] === 'product' && segments.length === 2) {
        const productId = segments[1];
        const product = await dbGet(
          env.DB,
          'SELECT product_id, name, description, price, category, cover_image, is_question_bank, question_count, max_discount_ratio, status, created_at FROM products WHERE product_id = ?',
          productId
        );
        if (!product) return jsonBad('Product not found');

        const user = await extractUser(request, env);
        if (user) {
          const asset = await dbGet(env.DB, 'SELECT 1 FROM user_assets WHERE user_id = ? AND product_id = ?', user.user_id, productId);
          product.is_purchased = !!asset;
        } else {
          product.is_purchased = false;
        }

        return jsonOk('ok', product);
      }

      return jsonBad('Route not found');
    }

    // ==================== POST ====================
    if (method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonBad('Invalid JSON body');
      }

      const user = await extractUser(request, env);
      if (!user) return jsonUnauthorized('Unauthorized');

      // POST order/calculate (auth)
      if (segments[0] === 'order' && segments[1] === 'calculate' && segments.length === 2) {
        const { product_id, payment_method } = body;
        if (!product_id) return jsonBad('product_id is required');

        const product = await dbGet(env.DB, "SELECT product_id, name, price, max_discount_ratio, status FROM products WHERE product_id = ? AND status = 'active'", product_id);
        if (!product) return jsonBad('Product not found or inactive');

        const originalAmount = product.price;
        let coinDiscount = 0;
        let finalAmount = originalAmount;

        if (payment_method === 'coin') {
          const account = await dbGet(env.DB, 'SELECT balance FROM coin_accounts WHERE user_id = ?', user.user_id);
          const balance = account ? account.balance : 0;
          const maxDiscount = originalAmount * (product.max_discount_ratio || 1);
          coinDiscount = Math.min(balance, maxDiscount);
          finalAmount = Math.max(0, originalAmount - coinDiscount);
        }

        return jsonOk('ok', {
          product_id,
          product_name: product.name,
          original_amount: originalAmount,
          coin_discount: coinDiscount,
          final_amount: finalAmount,
          payment_method: payment_method || null,
        });
      }

      // POST order/create (auth)
      if (segments[0] === 'order' && segments[1] === 'create' && segments.length === 2) {
        const { product_id, payment_method } = body;
        if (!product_id) return jsonBad('product_id is required');

        const product = await dbGet(env.DB, "SELECT product_id, name, price, max_discount_ratio, status FROM products WHERE product_id = ? AND status = 'active'", product_id);
        if (!product) return jsonBad('Product not found or inactive');

        // Check not already purchased
        const existing = await dbGet(env.DB, 'SELECT 1 FROM user_assets WHERE user_id = ? AND product_id = ?', user.user_id, product_id);
        if (existing) return jsonBad('Already purchased');

        if (payment_method === 'coin') {
          const account = await dbGet(env.DB, 'SELECT balance FROM coin_accounts WHERE user_id = ?', user.user_id);
          const balance = account ? account.balance : 0;
          const maxDiscount = product.price * (product.max_discount_ratio || 1);
          const coinDiscount = Math.min(balance, maxDiscount);
          const finalAmount = Math.max(0, product.price - coinDiscount);

          if (balance < finalAmount) return jsonBad('Insufficient coin balance');

          const orderId = uuid();
          const transactionId = uuid();
          const now = new Date().toISOString();
          const newBalance = balance - finalAmount;

          // Deduct balance
          await dbRun(env.DB, 'UPDATE coin_accounts SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?', newBalance, finalAmount, user.user_id);

          // Create order (paid)
          await dbRun(
            env.DB,
            'INSERT INTO orders (order_id, user_id, product_id, product_name, original_amount, final_amount, payment_method, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            orderId, user.user_id, product_id, product.name, product.price, finalAmount, 'coin', 'paid', now, now
          );

          // Create user asset
          await dbRun(env.DB, 'INSERT INTO user_assets (user_id, product_id, order_id, created_at) VALUES (?, ?, ?, ?)', user.user_id, product_id, orderId, now);

          // Record coin transaction
          await dbRun(
            env.DB,
            'INSERT INTO coin_transactions (transaction_id, user_id, amount, type, scene, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            transactionId, user.user_id, -finalAmount, 'spend', 'purchase', `Purchase: ${product.name}`, newBalance, now
          );

          return jsonOk('ok', { order_id: orderId, balance: newBalance });
        }

        return jsonBad('Unsupported payment method');
      }

      // POST order/{orderId}/pay (auth) — pay a pending order
      if (segments[0] === 'order' && segments.length === 3 && segments[2] === 'pay') {
        const orderId = segments[1];
        const order = await dbGet(env.DB, 'SELECT order_id, user_id, product_id, status FROM orders WHERE order_id = ? AND user_id = ?', orderId, user.user_id);
        if (!order) return jsonBad('Order not found');
        if (order.status === 'paid') return jsonBad('Order already paid');

        const now = new Date().toISOString();

        await dbRun(env.DB, "UPDATE orders SET status = 'paid', paid_at = ? WHERE order_id = ?", now, orderId);

        // Create user asset
        await dbRun(env.DB, 'INSERT INTO user_assets (user_id, product_id, order_id, created_at) VALUES (?, ?, ?, ?)', user.user_id, order.product_id, orderId, now);

        return jsonOk('ok', { order_id: orderId, status: 'paid' });
      }

      return jsonBad('Route not found');
    }

    return jsonBad('Method not allowed');
  } catch (err) {
    return jsonBad(err.message || 'Internal server error');
  }
}
