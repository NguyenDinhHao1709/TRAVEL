const pool = require('../config/db');

const getArticles = async (req, res) => {
  try {
    const { tourId = '', limit = '' } = req.query;

    const parsedTourId = Number(tourId);
    const safeTourId = Number.isNaN(parsedTourId) || parsedTourId <= 0 ? null : parsedTourId;

    const parsedLimit = Number(limit);
    const safeLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 100 : Math.min(parsedLimit, 100);

    const [rows] = await pool.query(
      `SELECT a.id, a.tour_id, a.title, a.content, a.image_url, a.created_at,
              t.title AS tour_title, t.destination AS tour_destination
       FROM articles a
       LEFT JOIN tours t ON t.id = a.tour_id
       WHERE (? IS NULL OR a.tour_id = ?)
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [safeTourId, safeTourId, safeLimit]
    );

    return res.json(rows);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      return res.json([]);
    }

    return res.status(500).json({ message: error.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT a.id, a.tour_id, a.title, a.content, a.image_url, a.created_at,
              t.title AS tour_title, t.destination AS tour_destination
       FROM articles a
       LEFT JOIN tours t ON t.id = a.tour_id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createArticle = async (req, res) => {
  try {
    const { tourId = null, title = '', content = '', imageUrl = '' } = req.body;
    const normalizedTitle = String(title).trim();
    const normalizedContent = String(content || '').trim();
    const normalizedImageUrl = String(imageUrl || '').trim() || null;

    if (!normalizedTitle) {
      return res.status(400).json({ message: 'Tiêu đề bài viết là bắt buộc' });
    }

    const parsedTourId = Number(tourId);
    const safeTourId = Number.isNaN(parsedTourId) || parsedTourId <= 0 ? null : parsedTourId;

    const [result] = await pool.query(
      `INSERT INTO articles (tour_id, title, content, image_url)
       VALUES (?, ?, ?, ?)`,
      [safeTourId, normalizedTitle, normalizedContent || null, normalizedImageUrl]
    );

    return res.status(201).json({ id: result.insertId, message: 'Tạo bài viết thành công' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { tourId = null, title = '', content = '', imageUrl = '' } = req.body;
    const normalizedTitle = String(title).trim();
    const normalizedContent = String(content || '').trim();
    const normalizedImageUrl = String(imageUrl || '').trim() || null;

    if (!normalizedTitle) {
      return res.status(400).json({ message: 'Tiêu đề bài viết là bắt buộc' });
    }

    const parsedTourId = Number(tourId);
    const safeTourId = Number.isNaN(parsedTourId) || parsedTourId <= 0 ? null : parsedTourId;

    const [result] = await pool.query(
      `UPDATE articles
       SET tour_id = ?, title = ?, content = ?, image_url = ?
       WHERE id = ?`,
      [safeTourId, normalizedTitle, normalizedContent || null, normalizedImageUrl, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    return res.json({ message: 'Cập nhật bài viết thành công' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [id]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    return res.json({ message: 'Xóa bài viết thành công' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getArticles, getArticleById, createArticle, updateArticle, deleteArticle };
