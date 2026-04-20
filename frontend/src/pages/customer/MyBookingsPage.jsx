import { useEffect, useState } from 'react';
import { Card, Button, Alert, Badge, Row, Col, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const PAYMENT_TIMEOUT_SECONDS = 5 * 60;

const getSecondsLeft = (createdAt) => {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - createdTime) / 1000);
  return Math.max(0, PAYMENT_TIMEOUT_SECONDS - elapsedSeconds);
};

const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const BOOKING_STATUS = {
  pending:   { label: 'Chờ thanh toán', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận',   variant: 'primary' },
  cancelled: { label: 'Đã hủy',        variant: 'danger' },
  completed: { label: 'Hoàn tất',      variant: 'success' },
};

const PAYMENT_STATUS = {
  unpaid:   { label: 'Chưa thanh toán',     variant: 'secondary' },
  paid:     { label: 'Đã thanh toán',       variant: 'success' },
  failed:   { label: 'Thanh toán thất bại', variant: 'danger' },
  refunded: { label: 'Đã hoàn tiền',        variant: 'info' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const loadBookings = async () => {
    const { data } = await client.get('/bookings/my');
    setBookings(data);
  };

  useEffect(() => { loadBookings(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasExpiredPending = bookings.some(
      (b) => b.booking_status === 'pending' && b.payment_status === 'unpaid' && getSecondsLeft(b.created_at) === 0
    );
    if (!hasExpiredPending) return;
    const timeout = setTimeout(() => {
      loadBookings();
      setMessage('Đơn quá hạn 5 phút chưa thanh toán đã được tự động hủy và hoàn lại số chỗ.');
    }, 600);
    return () => clearTimeout(timeout);
  }, [bookings, tick]);

  const payWithVNPay = async (bookingId) => {
    try {
      const { data } = await client.post('/payments/vnpay/create-url', { bookingId });
      window.location.href = data.paymentUrl;
    } catch (error) {
      if (!error.response) {
        setMessage('Không kết nối được backend. Vui lòng kiểm tra server API đang chạy ở cổng 5000.');
        return;
      }
      setMessage(error.response?.data?.message || 'Tạo URL thanh toán thất bại');
    }
  };

  const devSimulatePayment = async (bookingId) => {
    try {
      await client.post(`/payments/dev-simulate/${bookingId}`);
      setMessage('[DEV] Giả lập thanh toán thành công!');
      loadBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Giả lập thanh toán thất bại');
    }
  };

  const isDev = import.meta.env.DEV;

  const cancel = async (bookingId) => {
    try {
      await client.patch(`/bookings/my/${bookingId}/cancel`);
      setMessage('Đã hủy đặt tour');
      loadBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Hủy thất bại');
    }
  };

  /* ---------- Filter & Sort ---------- */
  let filtered = statusFilter === 'all' ? bookings : bookings.filter((b) => b.booking_status === statusFilter);
  if (sortOrder === 'oldest') filtered = [...filtered].reverse();

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.booking_status === 'pending').length,
    confirmed: bookings.filter((b) => b.booking_status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.booking_status === 'cancelled').length,
  };

  return (
    <>
      {/* Page Header */}
      <div className="mybooking-header mb-4">
        <div>
          <h3 className="mb-1">✈️ Đặt tour của tôi</h3>
          <p className="text-muted mb-0">Quản lý tất cả chuyến du lịch của bạn</p>
        </div>
        <div className="d-flex gap-3 mybooking-stats">
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num">{stats.total}</span>
            <span className="mybooking-stat-label">Tổng đơn</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-warning">{stats.pending}</span>
            <span className="mybooking-stat-label">Chờ TT</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-primary">{stats.confirmed}</span>
            <span className="mybooking-stat-label">Xác nhận</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-danger">{stats.cancelled}</span>
            <span className="mybooking-stat-label">Đã hủy</span>
          </div>
        </div>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      {/* Filter Bar */}
      <div className="mybooking-filter-bar mb-4">
        <div className="d-flex flex-wrap align-items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={statusFilter === opt.value ? 'primary' : 'outline-secondary'}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              {opt.value !== 'all' && (
                <Badge bg="light" text="dark" className="ms-1">
                  {bookings.filter((b) => b.booking_status === opt.value).length}
                </Badge>
              )}
            </Button>
          ))}
          <Form.Select
            size="sm"
            className="ms-auto"
            style={{ width: 'auto', minWidth: '160px' }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </Form.Select>
        </div>
      </div>

      {/* Booking Cards */}
      {filtered.length === 0 ? (
        <Alert variant="light" className="text-center py-5">
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📋</div>
          <p className="mb-0 text-muted">Không có đơn đặt tour nào {statusFilter !== 'all' ? `ở trạng thái "${FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}"` : ''}.</p>
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map((booking) => {
            const bs = BOOKING_STATUS[booking.booking_status] || { label: booking.booking_status, variant: 'secondary' };
            const ps = PAYMENT_STATUS[booking.payment_status] || { label: booking.payment_status, variant: 'secondary' };
            const secondsLeft = getSecondsLeft(booking.created_at);
            const isPendingUnpaid = booking.booking_status === 'pending' && booking.payment_status === 'unpaid';

            return (
              <Card key={booking.id} className="mybooking-card">
                {/* Countdown alert */}
                {isPendingUnpaid && (
                  <div className={`mybooking-countdown ${secondsLeft <= 60 ? 'mybooking-countdown-urgent' : ''}`}>
                    ⏳ Thanh toán trong vòng 5 phút để giữ chỗ. Còn lại: <strong>{formatCountdown(secondsLeft)}</strong>
                  </div>
                )}

                <Row className="g-0">
                  {/* Image */}
                  <Col md={3} sm={4} xs={12}>
                    <div className="mybooking-img-wrap">
                      {booking.image_url ? (
                        <img src={booking.image_url} alt={booking.title} className="mybooking-img" />
                      ) : (
                        <div className="mybooking-img-placeholder">
                          <span>📍</span>
                          <small>{booking.destination || 'Tour'}</small>
                        </div>
                      )}
                      <Badge bg={bs.variant} className="mybooking-status-badge">{bs.label}</Badge>
                    </div>
                  </Col>

                  {/* Info */}
                  <Col md={9} sm={8} xs={12}>
                    <Card.Body className="d-flex flex-column h-100 py-3">
                      <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                        <div>
                          <h5 className="mb-1 fw-bold">{booking.title}</h5>
                          <small className="text-muted">Mã đơn: #{booking.id}</small>
                        </div>
                        <Badge bg={ps.variant} className="fs-7">{ps.label}</Badge>
                      </div>

                      <Row className="mb-2 g-2">
                        <Col sm={6} lg={3}>
                          <div className="mybooking-info-item">
                            <span className="mybooking-info-icon">📅</span>
                            <div>
                              <small className="text-muted d-block">Lịch trình</small>
                              <span className="fw-semibold">{formatDate(booking.start_date) || formatDate(booking.departure_date)} → {formatDate(booking.end_date) || '...'}</span>
                            </div>
                          </div>
                        </Col>
                        <Col sm={6} lg={3}>
                          <div className="mybooking-info-item">
                            <span className="mybooking-info-icon">👥</span>
                            <div>
                              <small className="text-muted d-block">Số người</small>
                              <span className="fw-semibold">{booking.people_count} người</span>
                            </div>
                          </div>
                        </Col>
                        <Col sm={6} lg={3}>
                          <div className="mybooking-info-item">
                            <span className="mybooking-info-icon">📍</span>
                            <div>
                              <small className="text-muted d-block">Điểm đến</small>
                              <span className="fw-semibold">{booking.destination || '—'}</span>
                            </div>
                          </div>
                        </Col>
                        <Col sm={6} lg={3}>
                          <div className="mybooking-info-item">
                            <span className="mybooking-info-icon">💰</span>
                            <div>
                              <small className="text-muted d-block">Tổng tiền</small>
                              <span className="fw-bold" style={{ color: '#e65100' }}>
                                {Number(booking.total_amount).toLocaleString()}<span className="price-currency"> VND</span>
                              </span>
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* Actions */}
                      <div className="mt-auto d-flex flex-wrap gap-2 align-items-center">
                        <Button as={Link} to={`/tours/${booking.tour_id}`} variant="outline-primary" size="sm">
                          Xem chi tiết tour →
                        </Button>

                        {booking.payment_status === 'unpaid' && booking.booking_status !== 'cancelled' && (
                          <>
                            <Button size="sm" onClick={() => payWithVNPay(booking.id)}>
                              💳 Thanh toán VNPAY
                            </Button>
                            {isDev && (
                              <Button variant="success" size="sm" onClick={() => devSimulatePayment(booking.id)}>
                                [DEV] Giả lập
                              </Button>
                            )}
                          </>
                        )}

                        {booking.payment_status === 'paid' && (
                          <small className="text-muted">✅ Đơn đã thanh toán & xác nhận. Liên hệ hỗ trợ nếu cần hủy.</small>
                        )}

                        {booking.booking_status === 'pending' && booking.payment_status === 'unpaid' && (
                          <Button variant="outline-danger" size="sm" onClick={() => cancel(booking.id)}>
                            Hủy đặt tour
                          </Button>
                        )}

                        {booking.booking_status !== 'cancelled'
                          && booking.booking_status !== 'completed'
                          && booking.payment_status !== 'paid'
                          && !(booking.booking_status === 'pending' && booking.payment_status === 'unpaid') && (
                          <Button variant="outline-danger" size="sm" onClick={() => cancel(booking.id)}>
                            Hủy đặt tour
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

export default MyBookingsPage;
