const express = require('express');
const articleController = require('../controllers/article.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/', articleController.getAllArticles);
router.get('/:id', articleController.getArticleById);
router.post('/', authenticate, authenticate.requireRole('staff', 'admin'), articleController.createArticle);
router.put('/:id', authenticate, authenticate.requireRole('staff', 'admin'), articleController.updateArticle);
router.delete('/:id', authenticate, authenticate.requireRole('staff', 'admin'), articleController.deleteArticle);

module.exports = router;
