const pool = require('../config/db');

exports.getAllArticles = async (req, res) => {
  const { tourId, limit, search, page } = req.query;
  let query = `
    SELECT a.*, t.title as tour_title
    FROM articles a LEFT JOIN tours t ON t.id = a.tour_id
    WHERE 1=1
  `;
  let countQuery = `SELECT COUNT(*) as total FROM articles a LEFT JOIN tours t ON t.id = a.tour_id WHERE 1=1`;
  const params = [];
  const countParams = [];

  if (tourId) {
    query += ' AND a.tour_id = ?'; params.push(tourId);
    countQuery += ' AND a.tour_id = ?'; countParams.push(tourId);
  }
  if (search) {
    query += ' AND (a.title LIKE ? OR a.content LIKE ? OR t.title LIKE ?)';
    countQuery += ' AND (a.title LIKE ? OR a.content LIKE ? OR t.title LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
    countParams.push(s, s, s);
  }

  query += ' ORDER BY a.created_at DESC';

  // If page is provided, use pagination; otherwise return all (backward compatible)
  if (page) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const [[{ total }]] = await pool.execute(countQuery, countParams);
    query += ' LIMIT ? OFFSET ?';
    params.push(String(limitNum), String(offset));
    const [rows] = await pool.execute(query, params);

    return res.json({
      data: rows,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  }

  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); }
  const [rows] = await pool.execute(query, params);
  res.json(rows);
};

exports.getArticleById = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT a.*, t.title as tour_title FROM articles a LEFT JOIN tours t ON t.id = a.tour_id WHERE a.id = ? LIMIT 1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
  res.json(rows[0]);
};

exports.createArticle = async (req, res) => {
  const { title, content, imageUrl, tourId } = req.body;
  if (!title) return res.status(400).json({ message: 'Tiêu đề không được để trống' });

  const [result] = await pool.execute(
    'INSERT INTO articles (title, content, image_url, tour_id) VALUES (?, ?, ?, ?)',
    [title, content || null, imageUrl || null, tourId || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Tạo bài viết thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Tạo bài viết', `Tạo bài viết "${title}" (ID: ${result.insertId})`]).catch(() => {});
};

exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, content, imageUrl, tourId } = req.body;

  const [existing] = await pool.execute('SELECT id FROM articles WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

  await pool.execute(
    'UPDATE articles SET title=?, content=?, image_url=?, tour_id=?, updated_at=NOW() WHERE id=?',
    [title, content || null, imageUrl || null, tourId || null, id]
  );
  res.json({ message: 'Cập nhật bài viết thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Sửa bài viết', `Cập nhật bài viết ID: ${id}`]).catch(() => {});
};

exports.deleteArticle = async (req, res) => {
  const [existing] = await pool.execute('SELECT id FROM articles WHERE id = ? LIMIT 1', [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
  await pool.execute('DELETE FROM articles WHERE id = ?', [req.params.id]);
  res.json({ message: 'Xóa bài viết thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Xóa bài viết', `Xóa bài viết ID: ${req.params.id}`]).catch(() => {});
};
