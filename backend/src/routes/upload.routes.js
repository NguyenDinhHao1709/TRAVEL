const express = require('express');
const { uploadTourImage, uploadBannerImage, uploadArticleImage } = require('../controllers/upload.controller');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/tour', authenticate, authorize('admin'), upload.array('files', 10), uploadTourImage);
router.post('/banner', authenticate, authorize('admin'), upload.single('file'), uploadBannerImage);
router.post('/article', authenticate, authorize('staff', 'admin'), upload.single('file'), uploadArticleImage);

module.exports = router;
