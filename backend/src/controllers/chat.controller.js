const pool = require('../config/db');

const getOrCreateRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT * FROM chat_rooms WHERE user_id = ? AND status = "open" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (rows.length > 0) return res.json(rows[0]);

    const [result] = await pool.query(
      'INSERT INTO chat_rooms (user_id) VALUES (?)',
      [userId]
    );
    const [newRoom] = await pool.query('SELECT * FROM chat_rooms WHERE id = ?', [result.insertId]);

    req.io?.emit('new_room', newRoom[0]);

    res.status(201).json(newRoom[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'user') {
      const [roomRows] = await pool.query(
        'SELECT * FROM chat_rooms WHERE id = ? AND user_id = ?',
        [roomId, userId]
      );
      if (roomRows.length === 0) return res.status(403).json({ message: 'Forbidden' });
    }

    const [messages] = await pool.query(
      `SELECT cm.*, u.full_name AS sender_name, u.role AS sender_role
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.room_id = ?
       ORDER BY cm.created_at ASC`,
      [roomId]
    );
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (senderRole === 'user') {
      const [roomRows] = await pool.query(
        'SELECT * FROM chat_rooms WHERE id = ? AND user_id = ?',
        [roomId, senderId]
      );
      if (roomRows.length === 0) return res.status(403).json({ message: 'Forbidden' });
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (room_id, sender_id, message) VALUES (?, ?, ?)',
      [roomId, senderId, message.trim()]
    );

    const [rows] = await pool.query(
      `SELECT cm.*, u.full_name AS sender_name, u.role AS sender_role
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.id = ?`,
      [result.insertId]
    );

    req.io?.to(`room_${roomId}`).emit('new_message', rows[0]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const [rooms] = await pool.query(
      `SELECT cr.*, u.full_name AS user_name, u.email AS user_email,
        (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id) AS message_count,
        (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
       FROM chat_rooms cr
       JOIN users u ON cr.user_id = u.id
       ORDER BY cr.created_at DESC`
    );
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const closeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    await pool.query('UPDATE chat_rooms SET status = "closed" WHERE id = ?', [roomId]);
    req.io?.emit('room_closed', { roomId: parseInt(roomId) });
    res.json({ message: 'Room closed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getOrCreateRoom, getMessages, sendMessage, getAllRooms, closeRoom };
