require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./config/db');
const { sanitizeInput } = require('./middleware/sanitize');
const { enforceHttps, csrfOriginProtection, isOriginAllowed } = require('./middleware/security');

const authRoutes = require('./routes/auth.routes');
const tourRoutes = require('./routes/tour.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const reviewRoutes = require('./routes/review.routes');
const staffRoutes = require('./routes/staff.routes');
const adminRoutes = require('./routes/admin.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const uploadRoutes = require('./routes/upload.routes');
const vnpayRoutes = require('./routes/vnpay.routes');
const momoRoutes = require('./routes/momo.routes');
const chatRoutes = require('./routes/chat.routes');
const articleRoutes = require('./routes/article.routes');
const contactRoutes = require('./routes/contact.routes');
const { autoCancelExpiredBookings } = require('./controllers/booking.controller');

const app = express();
const httpServer = http.createServer(app);

app.enable('trust proxy');

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
  });
  socket.on('leave_room', (roomId) => {
    socket.leave(`room_${roomId}`);
  });
});

app.use(enforceHttps);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(sanitizeInput);
app.use(csrfOriginProtection);
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => { req.io = io; next(); });

app.get('/api/health', (req, res) => {
  res.json({ message: 'Travel Management API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', vnpayRoutes);
app.use('/api/payments', momoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/contact', contactRoutes);

const ensureArticleSchema = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tour_id INT,
      title VARCHAR(180) NOT NULL,
      content TEXT,
      image_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [tourIdColumn] = await pool.query("SHOW COLUMNS FROM articles LIKE 'tour_id'");
  if (!tourIdColumn.length) {
    await pool.query('ALTER TABLE articles ADD COLUMN tour_id INT NULL AFTER id');
  }

  const [imageUrlColumn] = await pool.query("SHOW COLUMNS FROM articles LIKE 'image_url'");
  if (!imageUrlColumn.length) {
    await pool.query('ALTER TABLE articles ADD COLUMN image_url VARCHAR(255) NULL AFTER content');
  }
};

const ensureUserSchema = async () => {
  const [mustChangePasswordColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'must_change_password'");
  if (!mustChangePasswordColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER password');
  }

  const [isLockedColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_locked'");
  if (!isLockedColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN is_locked TINYINT(1) DEFAULT 0 AFTER role');
  }

  const [isDeletedColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_deleted'");
  if (!isDeletedColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER is_locked');
  }

  const [deletedAtColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'deleted_at'");
  if (!deletedAtColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_deleted');
  }
};

const ensureContactSchema = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      info_type VARCHAR(100) NOT NULL,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      company_name VARCHAR(150),
      guest_count INT DEFAULT 0,
      address VARCHAR(255),
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [isReadColumn] = await pool.query("SHOW COLUMNS FROM contact_messages LIKE 'is_read'");
  if (!isReadColumn.length) {
    await pool.query('ALTER TABLE contact_messages ADD COLUMN is_read TINYINT(1) DEFAULT 0');
  }
};

const ensureChatbotSchema = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chatbot_histories (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role ENUM('user', 'assistant') NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chatbot_histories_user_created (user_id, created_at),
      CONSTRAINT fk_chatbot_histories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
};

const ensureReviewSchema = async () => {
  const [staffReplyColumn] = await pool.query("SHOW COLUMNS FROM reviews LIKE 'staff_reply'");
  if (!staffReplyColumn.length) {
    await pool.query('ALTER TABLE reviews ADD COLUMN staff_reply TEXT NULL AFTER comment');
  }

  const [staffReplyByColumn] = await pool.query("SHOW COLUMNS FROM reviews LIKE 'staff_reply_by'");
  if (!staffReplyByColumn.length) {
    await pool.query('ALTER TABLE reviews ADD COLUMN staff_reply_by INT NULL AFTER staff_reply');
  }

  const [staffReplyAtColumn] = await pool.query("SHOW COLUMNS FROM reviews LIKE 'staff_reply_at'");
  if (!staffReplyAtColumn.length) {
    await pool.query('ALTER TABLE reviews ADD COLUMN staff_reply_at TIMESTAMP NULL DEFAULT NULL AFTER staff_reply_by');
  }
};

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

pool.getConnection()
  .then((connection) => {
    connection.release();
    ensureUserSchema()
      .then(() => ensureArticleSchema())
      .then(() => ensureContactSchema())
      .then(() => ensureChatbotSchema())
      .then(() => ensureReviewSchema())
      .catch((error) => {
        console.error('Ensure schema failed:', error.message);
      })
      .finally(() => {
        setInterval(() => {
          autoCancelExpiredBookings().catch((error) => {
            console.error('Auto-cancel expired bookings failed:', error.message);
          });
        }, 30 * 1000);

        httpServer.listen(PORT, () => {
          console.log(`Server running at http://localhost:${PORT}`);
        });
      });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
