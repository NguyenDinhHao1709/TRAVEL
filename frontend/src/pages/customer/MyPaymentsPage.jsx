import { useEffect, useState } from 'react';
import { Card, Button, Alert, Badge, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN');
};

const MyPaymentsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState('');
  const navigate = useNavigate();

  const loadBookings = () => {
    client.get('/bookings/my')
      .then(({ data }) => setBookings(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, []);

  const cancel = async (bookingId) => {
    try {
      await client.patch(`/bookings/my/${bookingId}/cancel`);
      setMessage('Đã hủy đặt tour thành công.');
      loadBookings();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Hủy thất bại, vui lòng thử lại.');
    }
  };

  const unpaid = bookings.filter(
    (b) => b.payment_status === 'unpaid' && b.booking_status !== 'cancelled'
  );
  const paid = bookings.filter((b) => b.payment_status === 'paid');

  return (
    <>
      {/* Header */}
      <div className="mybooking-header mb-4">
        <div>
          <h3 className="mb-1">💳 Thanh toán</h3>
          <p className="text-muted mb-0">Quản lý thanh toán các đơn đặt tour của bạn</p>
        </div>
        <div className="d-flex gap-3 mybooking-stats">
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-warning">{unpaid.length}</span>
            <span className="mybooking-stat-label">Chờ thanh toán</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-success">{paid.length}</span>
            <span className="mybooking-stat-label">Đã thanh toán</span>
          </div>
        </div>
      </div>

      {message && (
        <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>
      )}

      {loading && (
        <div className="text-center py-5 text-muted">Đang tải dữ liệu...</div>
      )}

      {/* Pending payments */}
      {!loading && (
        <>
          <h5 className="mb-3 fw-bold">⏳ Chờ thanh toán ({unpaid.length})</h5>

          {unpaid.length === 0 ? (
            <Alert variant="success" className="mb-4">
              ✅ Bạn không có đơn nào cần thanh toán.
            </Alert>
          ) : (
            <div className="d-flex flex-column gap-3 mb-5">
              {unpaid.map((booking) => (
                <Card key={booking.id} className="mybooking-card border-warning" style={{ borderWidth: 2 }}>
                  <Row className="g-0">
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
                        <Badge bg="warning" text="dark" className="mybooking-status-badge">⏳ Chờ thanh toán</Badge>
                      </div>
                    </Col>

                    <Col md={9} sm={8} xs={12}>
                      <Card.Body className="d-flex flex-column h-100 py-3">
                        <div className="mb-2">
                          <h5 className="mb-1 fw-bold">{booking.title}</h5>
                          <small className="text-muted">Mã đơn: <strong>#{booking.id}</strong></small>
                        </div>

                        <Row className="mb-3 g-2">
                          <Col sm={6} lg={4}>
                            <div className="mybooking-info-item">
                              <span className="mybooking-info-icon">📅</span>
                              <div>
                                <small className="text-muted d-block">Lịch trình</small>
                                <span className="fw-semibold">
                                  {formatDate(booking.start_date || booking.departure_date)} → {formatDate(booking.end_date) || '...'}
                                </span>
                              </div>
                            </div>
                          </Col>
                          <Col sm={6} lg={4}>
                            <div className="mybooking-info-item">
                              <span className="mybooking-info-icon">👥</span>
                              <div>
                                <small className="text-muted d-block">Số người</small>
                                <span className="fw-semibold">{booking.people_count} người</span>
                              </div>
                            </div>
                          </Col>
                          <Col sm={6} lg={4}>
                            <div className="mybooking-info-item">
                              <span className="mybooking-info-icon">💰</span>
                              <div>
                                <small className="text-muted d-block">Số tiền cần thanh toán</small>
                                <span className="fw-bold" style={{ color: '#e65100', fontSize: '1.05rem' }}>
                                  {Number(booking.total_amount || 0).toLocaleString('vi-VN')}
                                  <span className="price-currency"> VND</span>
                                </span>
                              </div>
                            </div>
                          </Col>
                        </Row>

                        <div className="mt-auto d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => navigate(`/payment/${booking.id}`)}
                          >
                            💳 Thanh toán ngay
                          </Button>
                          <Button
                            as={Link}
                            to={`/tours/${booking.tour_id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            Xem tour →
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => cancel(booking.id)}
                          >
                            Hủy đặt tour
                          </Button>
                        </div>
                      </Card.Body>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MyPaymentsPage;
