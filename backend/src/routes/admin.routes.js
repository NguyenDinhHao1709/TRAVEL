const express = require('express');
const {
  getUsers,
  createUser,
  updateUser,
  getUserDetail,
  lockUser,
  unlockUser,
  resetUserPassword,
  deleteUser,
  createArticle,
  getArticles,
  createBanner,
  getBanners,
  getDashboard,
  getSystemLogs,
  getBookingReport
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/bookings-report', getBookingReport);
router.get('/users', getUsers);
router.get('/users/:id/detail', getUserDetail);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/lock', lockUser);
router.patch('/users/:id/unlock', unlockUser);
router.patch('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);
router.get('/articles', getArticles);
router.post('/articles', createArticle);
router.get('/banners', getBanners);
router.post('/banners', createBanner);
router.get('/logs', getSystemLogs);

module.exports = router;
