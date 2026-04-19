import { useEffect, useRef, useState } from 'react';
import { Card, Table, Button, Alert, Badge, Nav, Tab, Form } from 'react-bootstrap';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const formatDateTimeVN = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 19).replace('T', ' ');
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(date).replace(',', '');
};

const SOCKET_URL = 'http://localhost:5000';

const renderStars = (value = 0) => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  return `${'★'.repeat(safeValue)}${'☆'.repeat(5 - safeValue)}`;
};

const StaffDashboardPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [contactInbox, setContactInbox] = useState({ unreadCount: 0, items: [] });
  const [reviews, setReviews] = useState([]);
  const [reviewReplies, setReviewReplies] = useState({});
  const [replySubmittingId, setReplySubmittingId] = useState(null);
  const [message, setMessage] = useState('');

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatConnected, setChatConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const bookingStatusLabel = {
    pending: 'Chờ thanh toán',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
    completed: 'Hoàn tất'
  };

  const paymentStatusLabel = {
    unpaid: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền'
  };

  const load = async () => {
    const [bookingRes, customerRes, contactRes, reviewRes] = await Promise.all([
      client.get('/bookings/staff/all'),
      client.get('/staff/customers'),
      client.get('/contact/messages'),
      client.get('/reviews/staff/all')
    ]);

    setBookings(bookingRes.data);
    setCustomers(customerRes.data);
    setContactInbox(contactRes.data);
    setReviews(reviewRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  // Socket.io setup for staff chat
  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });

    socketRef.current.on('connect', () => setChatConnected(true));
    socketRef.current.on('disconnect', () => setChatConnected(false));

    socketRef.current.on('new_message', (msg) => {
      setChatMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        // replace temp optimistic message from same sender
        const tempIdx = prev.findIndex((m) => String(m.id).startsWith('temp_') && m.sender_id === msg.sender_id);
        if (tempIdx >= 0) {
          return [...prev.slice(0, tempIdx), msg, ...prev.slice(tempIdx + 1)];
        }
        return [...prev, msg];
      });
    });

    socketRef.current.on('new_room', () => {
      loadRooms();
    });

    socketRef.current.on('room_closed', ({ roomId }) => {
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, status: 'closed' } : r));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom((r) => r ? { ...r, status: 'closed' } : r);
      }
    });

    loadRooms();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }, [chatMessages]);

  const loadRooms = async () => {
    try {
      const res = await client.get('/chat/rooms');
      setRooms(res.data);
    } catch {}
  };

  const selectRoom = async (room) => {
    if (selectedRoom) {
      socketRef.current?.emit('leave_room', selectedRoom.id);
    }
    setSelectedRoom(room);
    setChatMessages([]);
    socketRef.current?.emit('join_room', room.id);
    try {
      const res = await client.get(`/chat/rooms/${room.id}/messages`);
      setChatMessages(res.data);
    } catch {}
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedRoom) return;
    const text = chatInput.trim();
    setChatInput('');

    const tempMsg = {
      id: `temp_${Date.now()}`,
      room_id: selectedRoom.id,
      sender_id: user?.id,
      sender_role: user?.role || 'staff',
      sender_name: user?.fullName || 'Nh\u00e2n vi\u00ean',
      message: text,
      created_at: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, tempMsg]);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { roomId: selectedRoom.id, message: text });
    } else {
      try {
        const { data: savedMsg } = await client.post(`/chat/rooms/${selectedRoom.id}/messages`, { message: text });
        setChatMessages((prev) => prev.map((m) => m.id === tempMsg.id ? savedMsg : m));
      } catch {
        setChatInput(text);
        setChatMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      }
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const closeRoom = async (roomId) => {
    await client.patch(`/chat/rooms/${roomId}/close`);
    loadRooms();
    if (selectedRoom?.id === roomId) setSelectedRoom(null);
  };

  const refundBooking = async (id) => {
    await client.patch(`/bookings/staff/${id}/cancel`);
    setMessage('Đã xử lý hoàn vé cho khách hàng');
    load();
  };

  const markContactAsRead = async (id) => {
    await client.patch(`/contact/messages/${id}/read`);
    load();
  };

  const setReplyDraft = (reviewId, value) => {
    setReviewReplies((current) => ({ ...current, [reviewId]: value }));
  };

  const getReplyDraft = (review) => {
    const draft = reviewReplies[review.id];
    if (typeof draft === 'string') return draft;
    return review.staff_reply || '';
  };

  const replyReview = async (review) => {
    const reply = getReplyDraft(review).trim();
    if (!reply) {
      setMessage('Vui lòng nhập nội dung phản hồi trước khi gửi');
      return;
    }

    setReplySubmittingId(review.id);
    try {
      const { data } = await client.patch(`/reviews/staff/${review.id}/reply`, { reply });
      setMessage(data.message || 'Đã phản hồi đánh giá');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể phản hồi đánh giá');
    } finally {
      setReplySubmittingId(null);
    }
  };

  return (
    <>
      <h3 className="mb-3">Bảng điều khiển nhân viên</h3>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Tab.Container defaultActiveKey="bookings">
        <Nav variant="tabs" className="mb-3 app-scroll-tabs">
          <Nav.Item>
            <Nav.Link eventKey="bookings">📋 Quản lý đặt tour</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="customers">👥 Khách hàng</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="chat">
              💬 Chat hỗ trợ{' '}
              {rooms.filter((r) => r.status === 'open').length > 0 && (
                <Badge bg="danger" className="ms-1">
                  {rooms.filter((r) => r.status === 'open').length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="reviews">⭐ Đánh giá</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="contacts">
              📩 Liên hệ{' '}
              {contactInbox.unreadCount > 0 && (
                <Badge bg="danger" className="ms-1">{contactInbox.unreadCount}</Badge>
              )}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* Booking tab */}
          <Tab.Pane eventKey="bookings">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      const exportData = bookings.map((b, i) => ({
                        'STT': i + 1,
                        'Mã đặt tour': b.id,
                        'Khách hàng': b.full_name || '',
                        'Email': b.email || '',
                        'Tour': b.title || '',
                        'Số người': b.num_people || 1,
                        'Tổng tiền': Number(b.total_price || 0),
                        'Trạng thái đặt tour': bookingStatusLabel[b.booking_status] || b.booking_status,
                        'Trạng thái thanh toán': paymentStatusLabel[b.payment_status] || b.payment_status,
                        'Ngày đặt': b.created_at ? formatDateTimeVN(b.created_at) : '',
                      }));
                      const ws = XLSX.utils.json_to_sheet(exportData);
                      ws['!cols'] = [
                        { wch: 5 }, { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 30 },
                        { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 22 }
                      ];
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Dẫt tour');
                      XLSX.writeFile(wb, `bao-cao-dat-tour-${new Date().toISOString().slice(0,10)}.xlsx`);
                    }}
                  >
                    📁 Xuất Excel
                  </Button>
                </div>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Khách</th>
                      <th>Tour</th>
                      <th>Trạng thái đặt tour</th>
                      <th>Trạng thái thanh toán</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.full_name}</td>
                        <td>{item.title}</td>
                        <td>{bookingStatusLabel[item.booking_status] || item.booking_status}</td>
                        <td>{paymentStatusLabel[item.payment_status] || item.payment_status}</td>
                        <td>
                          {item.payment_status === 'paid' && item.booking_status !== 'cancelled' ? (
                            <Button size="sm" variant="outline-danger" onClick={() => refundBooking(item.id)}>Hoàn vé</Button>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Customers tab */}
          <Tab.Pane eventKey="customers">
            <Card>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.id}</td>
                        <td>{customer.full_name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Chat support tab */}
          <Tab.Pane eventKey="chat">
            <div className="staff-chat-layout">

              {/* Room list */}
              <Card className="staff-chat-room-list">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>Cuộc hội thoại</span>
                  <small style={{ color: chatConnected ? '#198754' : '#dc3545' }}>
                    {chatConnected ? '● Trực tuyến' : '● Ngoại tuyến'}
                  </small>
                </Card.Header>
                <div style={{ overflowY: 'auto' }}>
                  {rooms.length === 0 && (
                    <div className="p-3 text-muted text-center" style={{ fontSize: '14px' }}>
                      Chưa có cuộc hội thoại nào
                    </div>
                  )}
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => selectRoom(room)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        background: selectedRoom?.id === room.id ? '#e8f0fe' : '#fff',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <strong style={{ fontSize: '14px' }}>{room.user_name}</strong>
                        <Badge bg={room.status === 'open' ? 'success' : 'secondary'} style={{ fontSize: '10px' }}>
                          {room.status === 'open' ? 'Mở' : 'Đóng'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{room.user_email}</div>
                      {room.last_message && (
                        <div style={{
                          fontSize: '12px',
                          color: '#888',
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {room.last_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chat window */}
              <Card className="staff-chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedRoom ? (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted staff-chat-empty">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                      <div>Chọn một cuộc hội thoại để bắt đầu</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Card.Header className="d-flex justify-content-between align-items-center" style={{ flexShrink: 0 }}>
                      <div>
                        <strong>{selectedRoom.user_name}</strong>
                        <span className="text-muted ms-2" style={{ fontSize: '13px' }}>{selectedRoom.user_email}</span>
                      </div>
                      {selectedRoom.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => closeRoom(selectedRoom.id)}
                        >
                          Kết thúc hội thoại
                        </Button>
                      )}
                    </Card.Header>

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="staff-chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '14px', background: '#f8f9fa' }}>
                      {chatMessages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#888', marginTop: '30px', fontSize: '14px' }}>
                          Chưa có tin nhắn nào
                        </div>
                      )}
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: msg.sender_role === 'user' ? 'flex-start' : 'flex-end',
                            marginBottom: '10px'
                          }}
                        >
                          <div style={{
                            maxWidth: '72%',
                            padding: '9px 13px',
                            borderRadius: msg.sender_role === 'user' ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                            background: msg.sender_role === 'user' ? '#ffffff' : '#0d6efd',
                            color: msg.sender_role === 'user' ? '#212529' : '#fff',
                            fontSize: '14px',
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.7, marginBottom: '3px' }}>
                              {msg.sender_name} {msg.sender_role !== 'user' ? '(Nhân viên)' : '(Khách hàng)'}
                            </div>
                            {msg.message}
                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                              {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    {selectedRoom.status === 'open' ? (
                      <div className="staff-chat-input-bar" style={{
                        padding: '10px 14px',
                        borderTop: '1px solid #dee2e6',
                        display: 'flex',
                        gap: '8px',
                        background: '#fff',
                        flexShrink: 0
                      }}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          placeholder="Nhập phản hồi..."
                          style={{
                            flex: 1,
                            border: '1px solid #ced4da',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => (e.target.style.borderColor = '#0d6efd')}
                          onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
                        />
                        <Button
                          onClick={sendChatMessage}
                          disabled={!chatInput.trim()}
                          style={{ borderRadius: '10px', padding: '8px 16px' }}
                        >
                          Gửi
                        </Button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px',
                        borderTop: '1px solid #dee2e6',
                        textAlign: 'center',
                        color: '#888',
                        fontSize: '13px',
                        background: '#f8f9fa'
                      }}>
                        Hội thoại đã kết thúc
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </Tab.Pane>

          <Tab.Pane eventKey="reviews">
            <Card>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Khách hàng</th>
                      <th>Tour</th>
                      <th>Sao</th>
                      <th>Bình luận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td>{review.id}</td>
                        <td>{review.user_name || '-'}</td>
                        <td>{review.tour_title || '-'}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 700 }}>{renderStars(review.rating)}</td>
                        <td style={{ maxWidth: 320 }}>{review.comment || '-'}</td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center">Chưa có đánh giá nào</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="contacts">
            <Card>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Loại thông tin</th>
                      <th>Họ tên</th>
                      <th>Liên hệ</th>
                      <th>Tiêu đề</th>
                      <th>Nội dung</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactInbox.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.info_type}</td>
                        <td>{item.full_name}</td>
                        <td>
                          <div>{item.email}</div>
                          <div>{item.phone}</div>
                        </td>
                        <td>{item.subject}</td>
                        <td style={{ maxWidth: 340 }}>{item.message}</td>
                        <td>{formatDateTimeVN(item.created_at)}</td>
                        <td>
                          {Number(item.is_read) === 1 ? (
                            <Badge bg="secondary">Đã đọc</Badge>
                          ) : (
                            <Button size="sm" variant="outline-primary" onClick={() => markContactAsRead(item.id)}>
                              Đánh dấu đã đọc
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
};

export default StaffDashboardPage;
