const express = require('express');
const uploadController = require('../controllers/upload.controller');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/tour', authenticate, upload.array('files', 10), uploadController.uploadTourImages);
router.post('/article', authenticate, authenticate.requireRole('staff', 'admin'), upload.single('file'), (req, res, next) => {
  req.params.folder = 'articles';
  next();
}, uploadController.uploadSingleImage);
router.post('/banner', authenticate, authenticate.requireRole('admin'), upload.single('file'), (req, res, next) => {
  req.params.folder = 'banners';
  next();
}, uploadController.uploadSingleImage);

module.exports = router;
