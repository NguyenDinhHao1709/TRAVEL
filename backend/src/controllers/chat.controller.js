const pool = require('../config/db');

// User: lấy hoặc tạo room
exports.getOrCreateRoom = async (req, res) => {
  const userId = req.user.id;

  // Tìm room đang mở
  const [openRooms] = await pool.execute(
    "SELECT cr.*, u.full_name as user_name, u.email as user_email FROM chat_rooms cr JOIN users u ON u.id = cr.user_id WHERE cr.user_id = ? AND cr.status = 'open' ORDER BY cr.created_at DESC LIMIT 1",
    [userId]
  );

  if (openRooms.length > 0) {
    return res.json(openRooms[0]);
  }

  // Tạo room mới
  const [result] = await pool.execute(
    "INSERT INTO chat_rooms (user_id, status) VALUES (?, 'open')",
    [userId]
  );

  const [newRoom] = await pool.execute(
    'SELECT cr.*, u.full_name as user_name, u.email as user_email FROM chat_rooms cr JOIN users u ON u.id = cr.user_id WHERE cr.id = ?',
    [result.insertId]
  );

  res.json(newRoom[0]);
};

// Staff: lấy tất cả rooms
exports.getAllRooms = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT cr.*, u.full_name as user_name, u.email as user_email,
      (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM chat_rooms cr
    JOIN users u ON u.id = cr.user_id
    ORDER BY COALESCE(cr.updated_at, cr.created_at) DESC
    LIMIT 100
  `);
  res.json(rows);
};

// Lấy messages của room
exports.getRoomMessages = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Kiểm tra quyền truy cập
  if (userRole === 'user') {
    const [room] = await pool.execute('SELECT id FROM chat_rooms WHERE id = ? AND user_id = ? LIMIT 1', [roomId, userId]);
    if (room.length === 0) return res.status(403).json({ message: 'Không có quyền truy cập' });
  }

  const [rows] = await pool.execute(
    'SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 200',
    [roomId]
  );
  res.json(rows);
};

// Gửi message (HTTP fallback)
exports.sendMessage = async (req, res) => {
  const { roomId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Nội dung không được để trống' });
  }

  const [roomRows] = await pool.execute('SELECT * FROM chat_rooms WHERE id = ? LIMIT 1', [roomId]);
  if (roomRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy phòng chat' });
  const room = roomRows[0];

  if (room.status === 'closed') {
    return res.status(400).json({ message: 'Cuộc hội thoại đã kết thúc' });
  }

  const [userRows] = await pool.execute('SELECT full_name, role FROM users WHERE id = ? LIMIT 1', [userId]);
  const sender = userRows[0];

  const [result] = await pool.execute(
    'INSERT INTO chat_messages (room_id, sender_id, sender_role, sender_name, message) VALUES (?, ?, ?, ?, ?)',
    [roomId, userId, sender.role, sender.full_name, String(message).trim()]
  );

  await pool.execute(
    'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
    [String(message).trim().slice(0, 100), roomId]
  );

  const msg = {
    id: result.insertId,
    room_id: Number(roomId),
    sender_id: userId,
    sender_role: sender.role,
    sender_name: sender.full_name,
    message: String(message).trim(),
    created_at: new Date()
  };

  res.status(201).json(msg);
};

// Đóng room
exports.closeRoom = async (req, res) => {
  const { roomId } = req.params;
  await pool.execute(
    "UPDATE chat_rooms SET status = 'closed', updated_at = NOW() WHERE id = ?",
    [roomId]
  );
  res.json({ message: 'Đã kết thúc cuộc hội thoại' });
};
