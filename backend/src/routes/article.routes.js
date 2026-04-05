const express = require('express');
const { getArticles, getArticleById, createArticle, updateArticle, deleteArticle } = require('../controllers/article.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getArticles);
router.get('/:id', getArticleById);
router.post('/', authenticate, authorize('staff', 'admin'), createArticle);
router.put('/:id', authenticate, authorize('staff', 'admin'), updateArticle);
router.delete('/:id', authenticate, authorize('staff', 'admin'), deleteArticle);

module.exports = router;
