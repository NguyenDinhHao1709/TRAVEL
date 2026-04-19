require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server: SocketServer } = require('socket.io');
const jwtUtil = require('./utils/jwt');
const sanitize = require('./middleware/sanitize');
const securityHeaders = require('./middleware/security');
const defaultLimiter = require('./middleware/rate-limit');

// Prevent crashes from unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});

const app = express();
const httpServer = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Serve local uploaded files
app.use('/uploads', express.static(require('path').join(__dirname, '../../uploads')));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitize);
app.use(securityHeaders);
app.use(defaultLimiter);

// Routes
const tourRoutes = require('./routes/tour.routes');
const articleRoutes = require('./routes/article.routes');
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const reviewRoutes = require('./routes/review.routes');
const userRoutes = require('./routes/user.routes');
const uploadRoutes = require('./routes/upload.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const contactRoutes = require('./routes/contact.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const staffRoutes = require('./routes/staff.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');
const chatRoutes = require('./routes/chat.routes');

app.use('/api/tours', tourRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Travel Management API is running' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error');
  res.status(status).json({ message });
});

// Socket.IO real-time chat
const io = new SocketServer(httpServer, {
  cors: { origin: FRONTEND_URL, credentials: true }
});

// Authenticate socket connections
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwtUtil.verify(token);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

const pool = require('./config/db');

io.on('connection', (socket) => {
  const user = socket.user;

  // Join user to their room(s)
  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { roomId, message } = data;
      if (!roomId || !message || !String(message).trim()) return;

      const [roomRows] = await pool.execute("SELECT * FROM chat_rooms WHERE id = ? AND status = 'open' LIMIT 1", [roomId]);
      if (roomRows.length === 0) return;

      const [result] = await pool.execute(
        'INSERT INTO chat_messages (room_id, sender_id, sender_role, sender_name, message) VALUES (?, ?, ?, ?, ?)',
        [roomId, user.id, user.role, user.fullName || 'User', String(message).trim()]
      );

      await pool.execute(
        'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
        [String(message).trim().slice(0, 100), roomId]
      );

      const msg = {
        id: result.insertId,
        room_id: Number(roomId),
        sender_id: user.id,
        sender_role: user.role,
        sender_name: user.fullName || 'User',
        message: String(message).trim(),
        created_at: new Date()
      };

      io.to(`room_${roomId}`).emit('new_message', msg);
    } catch (e) {
      console.error('[Socket] send_message error:', e.message);
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
