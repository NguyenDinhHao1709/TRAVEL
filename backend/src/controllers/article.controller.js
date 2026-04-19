const pool = require('../config/db');

exports.getAllArticles = async (req, res) => {
  const { tourId, limit } = req.query;
  let query = `
    SELECT a.*, t.title as tour_title
    FROM articles a LEFT JOIN tours t ON t.id = a.tour_id
    WHERE 1=1
  `;
  const params = [];

  if (tourId) { query += ' AND a.tour_id = ?'; params.push(tourId); }

  query += ' ORDER BY a.created_at DESC';
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
};

exports.deleteArticle = async (req, res) => {
  const [existing] = await pool.execute('SELECT id FROM articles WHERE id = ? LIMIT 1', [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
  await pool.execute('DELETE FROM articles WHERE id = ?', [req.params.id]);
  res.json({ message: 'Xóa bài viết thành công' });
};
