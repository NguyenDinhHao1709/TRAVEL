import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN');
};

const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

const BOOKING_STATUS = {
  pending:   { label: 'Chờ thanh toán', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận',   color: '#3b82f6' },
  cancelled: { label: 'Đã hủy',        color: '#ef4444' },
  completed: { label: 'Hoàn tất',      color: '#10b981' },
};

const PAYMENT_STATUS = {
  unpaid:  { label: 'Chưa thanh toán', variant: 'secondary' },
  paid:    { label: 'Đã thanh toán',   variant: 'success' },
  failed:  { label: 'Thất bại',        variant: 'danger' },
  refunded:{ label: 'Hoàn tiền',       variant: 'info' },
};

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/bookings/my')
      .then(({ data }) => setBookings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total       = bookings.length;
  const confirmed   = bookings.filter((b) => b.booking_status === 'confirmed').length;
  const pending     = bookings.filter((b) => b.booking_status === 'pending').length;
  const cancelled   = bookings.filter((b) => b.booking_status === 'cancelled').length;
  const completed   = bookings.filter((b) => b.booking_status === 'completed').length;
  const totalSpent  = bookings
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const recent = [...bookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const upcoming = bookings
    .filter((b) => b.booking_status === 'confirmed' && new Date(b.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 3);

  return (
    <div className="customer-dashboard py-2">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">👋 Xin chào, {user?.full_name || user?.username || 'bạn'}!</h3>
          <p className="text-muted mb-0">Tổng quan tài khoản và lịch sử đặt tour của bạn</p>
        </div>
        <div className="d-flex gap-2">
          <Button as={Link} to="/tours" variant="primary" size="sm">🔍 Tìm tour mới</Button>
          <Button as={Link} to="/my-bookings" variant="outline-primary" size="sm">📋 Lịch sử đặt tour</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <>
          {/* Stat Cards */}
          <Row className="g-3 mb-4">
            {[
              { label: 'Tổng đơn',      value: total,     color: '#6366f1', icon: '📋', bg: '#eef2ff' },
              { label: 'Đã xác nhận',   value: confirmed, color: '#3b82f6', icon: '✅', bg: '#eff6ff' },
              { label: 'Chờ thanh toán',value: pending,   color: '#f59e0b', icon: '⏳', bg: '#fffbeb' },
              { label: 'Hoàn tất',      value: completed, color: '#10b981', icon: '🏆', bg: '#ecfdf5' },
              { label: 'Đã hủy',        value: cancelled, color: '#ef4444', icon: '❌', bg: '#fef2f2' },
              { label: 'Đã chi tiêu',   value: formatMoney(totalSpent), color: '#e65100', icon: '💰', bg: '#fff3e0', wide: true },
            ].map((s) => (
              <Col key={s.label} xs={6} sm={4} md={s.wide ? 4 : 2}>
                <Card className="h-100 border-0 shadow-sm" style={{ background: s.bg }}>
                  <Card.Body className="d-flex align-items-center gap-3 py-3">
                    <div style={{ fontSize: '2rem', lineHeight: 1 }}>{s.icon}</div>
                    <div>
                      <div className="fw-bold" style={{ color: s.color, fontSize: s.wide ? '1rem' : '1.5rem' }}>
                        {s.value}
                      </div>
                      <small className="text-muted">{s.label}</small>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="g-4">
            {/* Sắp khởi hành */}
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white fw-bold border-bottom py-3">
                  🗓️ Tour sắp khởi hành
                </Card.Header>
                <Card.Body className="p-0">
                  {upcoming.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <div style={{ fontSize: '2.5rem' }}>✈️</div>
                      <p className="mb-0 mt-2 small">Không có tour sắp khởi hành</p>
                      <Button as={Link} to="/tours" variant="link" size="sm" className="mt-1">Đặt tour ngay →</Button>
                    </div>
                  ) : (
                    <div>
                      {upcoming.map((b, i) => (
                        <div key={b.id}
                          className={`d-flex align-items-center gap-3 px-3 py-3${i < upcoming.length - 1 ? ' border-bottom' : ''}`}>
                          {b.image_url ? (
                            <img src={b.image_url} alt={b.title}
                              style={{ width: 56, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 56, height: 48, background: '#e0e7ff', borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              📍
                            </div>
                          )}
                          <div className="flex-grow-1 min-width-0">
                            <div className="fw-semibold text-truncate" style={{ maxWidth: '100%' }}>{b.title}</div>
                            <small className="text-muted">🗓️ {formatDate(b.start_date)} → {formatDate(b.end_date)}</small>
                            <div><small className="text-muted">👥 {b.people_count} người &nbsp;|&nbsp; 💰 {formatMoney(b.total_amount)}</small></div>
                          </div>
                          <Badge bg="primary" className="flex-shrink-0">Đã xác nhận</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Đơn gần đây */}
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center border-bottom py-3">
                  <span className="fw-bold">🕐 Đơn đặt gần đây</span>
                  <Button as={Link} to="/my-bookings" variant="link" size="sm" className="p-0">
                    Xem tất cả →
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  {recent.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <div style={{ fontSize: '2.5rem' }}>📋</div>
                      <p className="mb-0 mt-2 small">Chưa có đơn đặt tour nào</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light">
                          <tr>
                            <th className="ps-3">Tour</th>
                            <th>Ngày đặt</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((b) => {
                            const bs = BOOKING_STATUS[b.booking_status] || { label: b.booking_status, color: '#888' };
                            const ps = PAYMENT_STATUS[b.payment_status] || { label: b.payment_status, variant: 'secondary' };
                            return (
                              <tr key={b.id}>
                                <td className="ps-3">
                                  <div className="fw-semibold">{b.title}</div>
                                  <small className="text-muted">#{b.id}</small>
                                </td>
                                <td className="text-nowrap">
                                  {b.created_at
                                    ? new Date(b.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                                </td>
                                <td className="fw-semibold text-nowrap" style={{ color: '#e65100' }}>
                                  {formatMoney(b.total_amount)}
                                </td>
                                <td>
                                  <div className="d-flex flex-column gap-1">
                                    <small style={{ color: bs.color, fontWeight: 600 }}>{bs.label}</small>
                                    <Badge bg={ps.variant} style={{ fontSize: '0.7rem' }}>{ps.label}</Badge>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Quick actions */}
          <Row className="g-3 mt-2">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold border-bottom py-3">⚡ Truy cập nhanh</Card.Header>
                <Card.Body>
                  <div className="d-flex flex-wrap gap-3">
                    {[
                      { to: '/tours',        icon: '🗺️',  label: 'Khám phá tour' },
                      { to: '/my-bookings',  icon: '📋',  label: 'Lịch sử đặt tour' },
                      { to: '/wishlist',     icon: '❤️',  label: 'Tour yêu thích' },
                      { to: '/chatbot',      icon: '🤖',  label: 'Tư vấn AI' },
                      { to: '/contact',      icon: '📞',  label: 'Liên hệ hỗ trợ' },
                      { to: '/articles',     icon: '📰',  label: 'Bài viết & Kinh nghiệm' },
                    ].map((item) => (
                      <Button key={item.to} as={Link} to={item.to}
                        variant="light" className="d-flex align-items-center gap-2 border"
                        style={{ borderRadius: 12 }}>
                        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
