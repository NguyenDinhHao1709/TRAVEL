import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const TRANSPORT_LABELS = { 'xe-khach': 'Xe khách', 'may-bay': 'Máy bay', 'tau-hoa': 'Tàu hoả', 'tu-tuc': 'Tự túc' };

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const load = async () => {
    try {
      const { data } = await client.get('/wishlists/my');
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (tourId) => {
    setRemovingId(tourId);
    setTimeout(async () => {
      await client.delete(`/wishlists/my/${tourId}`);
      setItems((prev) => prev.filter((i) => i.tour_id !== tourId));
      setRemovingId(null);
    }, 350);
  };

  /* ---------- EMPTY STATE ---------- */
  if (!loading && items.length === 0) {
    return (
      <Container className="py-5">
        <div className="wishlist-empty-state text-center">
          <div className="wishlist-empty-icon">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="58" stroke="#e0e0e0" strokeWidth="2" fill="#fafafa" />
              <path d="M60 85s-24-15.6-24-32.4C36 42.8 43.2 36 52 36c5.2 0 8 3 8 3s2.8-3 8-3c8.8 0 16 6.8 16 16.6C84 69.4 60 85 60 85z" fill="#e0e0e0" stroke="#ccc" strokeWidth="1.5" />
              <line x1="30" y1="95" x2="90" y2="95" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" />
              <line x1="40" y1="102" x2="80" y2="102" stroke="#eeeeee" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h4 className="mt-4 mb-2" style={{ color: '#555' }}>Bạn chưa lưu tour nào</h4>
          <p className="text-muted mb-4" style={{ maxWidth: 400, margin: '0 auto' }}>
            Hãy khám phá các tour hấp dẫn và nhấn vào biểu tượng trái tim để lưu chúng vào danh sách yêu thích của bạn!
          </p>
          <Button as={Link} to="/tours" variant="primary" size="lg" className="px-5 rounded-pill">
            🌍 Khám phá các tour ngay
          </Button>
        </div>
      </Container>
    );
  }

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    return (
      <Container className="py-5">
        <div className="wishlist-header mb-4">
          <h3 className="wishlist-title">❤️ Danh sách yêu thích</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16, marginBottom: 16 }} />
        ))}
      </Container>
    );
  }

  /* ---------- MAIN LIST ---------- */
  return (
    <Container className="py-4">
      <div className="wishlist-header mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h3 className="wishlist-title mb-1">❤️ Danh sách yêu thích</h3>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              Bạn đang theo dõi <strong>{items.length}</strong> tour du lịch
            </p>
          </div>
          <Button as={Link} to="/tours" variant="outline-primary" className="rounded-pill">
            🌍 Khám phá thêm tour
          </Button>
        </div>
      </div>

      <div className="wishlist-list">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`wishlist-card mb-3${removingId === item.tour_id ? ' wishlist-card-removing' : ''}`}
          >
            <Row className="g-0 align-items-stretch">
              {/* -- IMAGE -- */}
              <Col xs={12} sm={4} md={3}>
                <div className="wishlist-img-wrap">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="wishlist-img" />
                  ) : (
                    <div className="wishlist-img-placeholder">
                      <span>📸</span>
                      <small>{item.destination}</small>
                    </div>
                  )}
                  {item.slots != null && (
                    <Badge bg={item.slots > 5 ? 'success' : item.slots > 0 ? 'warning' : 'danger'} className="wishlist-slot-badge">
                      {item.slots > 0 ? `Còn ${item.slots} chỗ` : 'Hết chỗ'}
                    </Badge>
                  )}
                </div>
              </Col>

              {/* -- INFO -- */}
              <Col xs={12} sm={8} md={9}>
                <Card.Body className="d-flex flex-column h-100 py-3">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <Card.Title className="wishlist-tour-title mb-0">{item.title}</Card.Title>
                    <button
                      className="wishlist-remove-btn"
                      onClick={() => remove(item.tour_id)}
                      title="Bỏ yêu thích"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#e53935" stroke="#e53935" strokeWidth="2">
                        <path d="M12 21s-8-5.2-8-12c0-3.2 2.4-6 5.5-6 1.7 0 2.5 1 2.5 1s.8-1 2.5-1C17.6 3 20 5.8 20 9c0 6.8-8 12-8 12z" />
                      </svg>
                    </button>
                  </div>

                  <div className="wishlist-meta">
                    <span>📍 {item.destination}</span>
                    {item.departure_point && <span>🚩 {item.departure_point}</span>}
                    {item.transport && <span>🚌 {TRANSPORT_LABELS[item.transport] || item.transport}</span>}
                    {item.start_date && (
                      <span>📅 {fmtDate(item.start_date)}{item.end_date ? ` → ${fmtDate(item.end_date)}` : ''}</span>
                    )}
                  </div>

                  <div className="mt-auto d-flex align-items-end justify-content-between flex-wrap gap-2 pt-2">
                    <div className="wishlist-price">
                      {Number(item.price).toLocaleString()} <span className="wishlist-price-unit">VND</span>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        as={Link}
                        to={`/tours/${item.tour_id}`}
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3"
                      >
                        Xem chi tiết
                      </Button>
                      <Button
                        as={Link}
                        to={`/tours/${item.tour_id}`}
                        variant="primary"
                        size="sm"
                        className="rounded-pill px-3 fw-semibold"
                      >
                        🛒 Đặt ngay
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default WishlistPage;
