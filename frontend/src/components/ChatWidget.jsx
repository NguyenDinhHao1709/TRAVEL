import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const SOCKET_URL = 'http://localhost:5000';

let socketRef = null;

const getLastSeenStorageKey = (userId, roomId) => `chat_last_seen_${userId}_${roomId}`;

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesContainerRef = useRef(null);
  const isOpenRef = useRef(false);
  const roomIdRef = useRef(null);

  const markAllStaffMessagesAsSeen = (messageList, roomId) => {
    if (!user?.id || !roomId) return;

    const latestStaffMessage = [...(messageList || [])]
      .reverse()
      .find((msg) => msg.sender_role !== 'user');

    if (latestStaffMessage?.id) {
      localStorage.setItem(getLastSeenStorageKey(user.id, roomId), String(latestStaffMessage.id));
    }

    setUnreadCount(0);
  };

  const computeUnreadCount = (messageList, roomId) => {
    if (!user?.id || !roomId) return 0;

    const lastSeenId = Number(localStorage.getItem(getLastSeenStorageKey(user.id, roomId)) || '0');
    return (messageList || []).filter((msg) => msg.sender_role !== 'user' && Number(msg.id) > lastSeenId).length;
  };

  useEffect(() => {
    roomIdRef.current = room?.id || null;
  }, [room?.id]);

  useEffect(() => {
    if (!user || user.role !== 'user') return;

    const token = localStorage.getItem('token');
    socketRef = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });

    socketRef.on('connect', () => setConnected(true));
    socketRef.on('disconnect', () => setConnected(false));

    socketRef.on('new_message', (msg) => {
      setMessages((prev) => {
        // avoid duplicate if the message was already added optimistically
        if (prev.find((m) => m.id === msg.id)) return prev;

        const next = [...prev, msg];

        if (msg.sender_role !== 'user') {
          if (isOpenRef.current) {
            const activeRoomId = roomIdRef.current || msg.room_id;
            markAllStaffMessagesAsSeen(next, activeRoomId);
          } else {
            setUnreadCount((current) => current + 1);
          }
        }

        return next;
      });
    });

    socketRef.on('room_closed', ({ roomId }) => {
      setRoom((prev) => {
        if (!prev || Number(prev.id) !== Number(roomId)) return prev;
        return { ...prev, status: 'closed' };
      });
    });

    const initRoomForUnread = async () => {
      try {
        const roomRes = await client.get('/chat/room');
        const currentRoom = roomRes.data;
        setRoom(currentRoom);
        socketRef?.emit('join_room', currentRoom.id);

        const msgRes = await client.get(`/chat/rooms/${currentRoom.id}/messages`);
        const initialMessages = msgRes.data || [];
        setMessages(initialMessages);

        if (!isOpenRef.current) {
          setUnreadCount(computeUnreadCount(initialMessages, currentRoom.id));
        }
      } catch {}
    };

    initRoomForUnread();

    return () => {
      socketRef?.disconnect();
      socketRef = null;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && user?.role === 'user') {
      if (!room || room.status === 'closed') {
        loadOrCreateRoom();
      } else {
        markAllStaffMessagesAsSeen(messages, room.id);
      }
    }
  }, [isOpen, room?.id, room?.status]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });

    if (isOpen && room?.id) {
      markAllStaffMessagesAsSeen(messages, room.id);
    }
  }, [messages]);

  const loadOrCreateRoom = async () => {
    try {
      setLoading(true);
      const res = await client.get('/chat/room');
      const activeRoom = res.data;
      setRoom(activeRoom);
      socketRef?.emit('join_room', activeRoom.id);
      const msgRes = await client.get(`/chat/rooms/${activeRoom.id}/messages`);
      const roomMessages = msgRes.data || [];
      setMessages(roomMessages);
      markAllStaffMessagesAsSeen(roomMessages, activeRoom.id);
      return activeRoom;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !room) return;

    let activeRoom = room;

    if (room.status === 'closed') {
      const newRoom = await loadOrCreateRoom();
      if (!newRoom) return;
      activeRoom = newRoom;
    }

    const text = input.trim();
    setInput('');
    try {
      if (!activeRoom?.id) {
        setInput(text);
        return;
      }

      await client.post(`/chat/rooms/${activeRoom.id}/messages`, { message: text });
    } catch {
      setInput(text); // restore on error
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user || user.role !== 'user') return null;

  return (
    <div style={{ position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', right: 'max(12px, env(safe-area-inset-right))', zIndex: 9999 }}>
      {isOpen && (
        <div style={{
          width: 'min(340px, calc(100vw - 24px))',
          height: 'min(480px, calc(100dvh - 112px))',
          background: '#fff',
          borderRadius: '14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '14px',
          border: '1px solid #dee2e6',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0d6efd, #0a58ca)',
            color: '#fff',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>💬 Hỗ trợ khách hàng</div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>
                {connected ? '🟢 Đang kết nối' : '🔴 Mất kết nối'}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
            >
              ×
            </button>
          </div>

          {/* Messages area */}
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#f8f9fa' }}>
            {loading && (
              <div style={{ textAlign: 'center', color: '#888', marginTop: '30px' }}>
                Đang tải...
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#888', marginTop: '30px', fontSize: '14px', lineHeight: 1.6 }}>
                👋 Xin chào! Chúng tôi sẵn sàng hỗ trợ bạn.<br />
                Hãy gửi tin nhắn để bắt đầu.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <div style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: msg.sender_id === user.id ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: msg.sender_id === user.id ? '#0d6efd' : '#ffffff',
                  color: msg.sender_id === user.id ? '#fff' : '#212529',
                  fontSize: '14px',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  {msg.sender_role !== 'user' && (
                    <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.75, marginBottom: '3px' }}>
                      {msg.sender_name}
                    </div>
                  )}
                  {msg.message}
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            gap: '8px',
            background: '#fff',
            flexShrink: 0
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              style={{
                flex: 1,
                border: '1px solid #ced4da',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0d6efd')}
              onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? '#0d6efd' : '#adb5bd',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                cursor: input.trim() ? 'pointer' : 'default',
                fontSize: '16px',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d6efd, #0a58ca)',
          color: '#fff',
          border: 'none',
          fontSize: '26px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(13,110,253,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
          transition: 'transform 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Hỗ trợ khách hàng"
      >
        {isOpen ? '✕' : '💬'}

        {!isOpen && unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            minWidth: '22px',
            height: '22px',
            borderRadius: '999px',
            background: '#dc3545',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
            boxShadow: '0 3px 10px rgba(0,0,0,0.25)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
