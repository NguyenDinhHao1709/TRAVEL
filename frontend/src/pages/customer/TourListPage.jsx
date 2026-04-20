import { useEffect, useState } from 'react';
import { Row, Col, Card, Form, Button, Badge, Alert, Carousel, Pagination } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';

const SLIDES = [
  {
    image: '/uploads/slider1.jpg.jpg',
    badge: 'Tour Uy Tín Hàng Đầu',
    price: '1.600.000đ',
    desc: 'Tour 2 ngày 1 đêm khám phá vẻ đẹp sông nước .',
  },
  {
    image: '/uploads/1776577692670_0ioey2drwbo9.jpg',
    badge: 'Điểm Đến Hot 2026',
    price: '3.500.000đ',
    desc: 'Hòn đảo ngọc với bãi biển trắng mịn và làn nước trong xanh tuyệt đẹp.',
  },
  {
    image: '/uploads/pho-co-hoi-an-di-san-kien-truc-an-tuong-cua-the-gioi-15-1617438211.jpg',
    badge: 'Trải Nghiệm Đỉnh Cao',
    price: '2.800.000đ',
    desc: 'Cầu Vàng, phố cổ Hội An và những danh thắng nổi tiếng miền Trung.',
  },
  {
    image: '/uploads/halong.jpg',
    badge: 'Thiên Nhiên Hùng Vĩ',
    desc: 'Di sản thiên nhiên thế giới Vịnh Hạ Long cùng cố đô Hoa Lư thơ mộng.',
  },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'bien-dao', label: 'Tour Biển đảo' },
  { value: 'mien-bac', label: 'Tour Miền Bắc' },
  { value: 'mien-trung', label: 'Tour Miền Trung' },
  { value: 'mien-nam', label: 'Tour Miền Nam' },
  { value: 'nuoc-ngoai', label: 'Tour Nước ngoài' },
  { value: 'trekking', label: 'Tour Trekking' },
  { value: 'tam-linh', label: 'Tour Tâm linh' }
];

const TRANSPORT_LABELS = {
  'may-bay': 'Máy bay',
  'oto-giuong-nam': 'Ô tô giường nằm',
  'tau-hoa': 'Tàu hỏa',
  'oto-du-lich': 'Ô tô du lịch'
};

const DESTINATIONS = [
  { name: 'Đà Nẵng', image: '/uploads/pho-co-hoi-an-di-san-kien-truc-an-tuong-cua-the-gioi-15-1617438211.jpg', search: 'Đà Nẵng' },
  { name: 'Hạ Long', image: '/uploads/halong.jpg', search: 'Hạ Long' },
  { name: 'Phú Quốc', image: '/uploads/1776577692670_0ioey2drwbo9.jpg', search: 'Phú Quốc' },
  { name: 'Sapa', image: '/uploads/slider1.jpg.jpg', search: 'Sapa' },
  { name: 'Nha Trang', image: '/uploads/halong.jpg', search: 'Nha Trang' },
  { name: 'Huế', image: '/uploads/pho-co-hoi-an-di-san-kien-truc-an-tuong-cua-the-gioi-15-1617438211.jpg', search: 'Huế' },
];

const TOURS_PER_PAGE = 8;

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const TourListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tours, setTours] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ title: '', destination: '', minPrice: '', maxPrice: '', category: '' });
  const [currentPage, setCurrentPage] = useState(1);

  /* Reset filters when user navigates back to "/" (e.g. clicks "Danh sách tour") */
  useEffect(() => {
    setFilters({ title: '', destination: '', minPrice: '', maxPrice: '', category: '' });
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.key]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    loadTours();
  };

  const loadTours = async () => {
    setLoading(true);
    const params = {};
    if (filters.title.trim()) params.title = filters.title.trim();
    if (filters.destination.trim()) params.destination = filters.destination.trim();
    if (filters.minPrice !== '') params.minPrice = filters.minPrice;
    if (filters.maxPrice !== '') params.maxPrice = filters.maxPrice;
    if (filters.category) params.category = filters.category;
    const { data } = await client.get('/tours', { params });
    setTours(data);
    setLoading(false);
  };

  const loadFeaturedTours = async () => {
    try {
      const { data } = await client.get('/tours/featured');
      setFeaturedTours((data || []).slice(0, 4));
    } catch {
      setFeaturedTours([]);
    }
  };

  useEffect(() => {
    loadFeaturedTours();
  }, []);

  /* ---------- Check if user is filtering ---------- */
  const isFiltering = !!(filters.title.trim() || filters.destination.trim() || filters.minPrice || filters.maxPrice || filters.category);

  /* ---------- Pagination ---------- */
  const totalPages = Math.max(1, Math.ceil(tours.length / TOURS_PER_PAGE));
  const pagedTours = tours.slice((currentPage - 1) * TOURS_PER_PAGE, currentPage * TOURS_PER_PAGE);

  const goToDestination = (dest) => {
    setFilters((f) => ({ ...f, destination: dest }));
    setCurrentPage(1);
  };

  const filterKey = `${filters.title}|${filters.destination}|${filters.minPrice}|${filters.maxPrice}|${filters.category}`;
  useEffect(() => {
    loadTours();
  }, [filterKey]);

  return (
    <>
      {/* ===== HERO + SEARCH BAR OVERLAY ===== */}
      <section className="hero-search-wrapper mb-5">
        <Carousel interval={4000} fade indicators controls className="hero-carousel">
          {SLIDES.map((slide, idx) => (
            <Carousel.Item key={idx}>
              <img src={slide.image} alt={slide.badge} className="hero-slide-img" />
              <div className="hero-overlay">
                <div className="hero-text">
                  <span className="hero-badge-label">{slide.badge}</span>
                  <h1 className="hero-title">{slide.title}</h1>
                  {slide.price && (
                    <p className="hero-price">
                      Giá chỉ từ: <span>{slide.price}</span>
                    </p>
                  )}
                  <p className="hero-desc">{slide.desc}</p>
                  <div className="d-flex gap-2">
                    <Button
                      variant="warning"
                      className="hero-btn-primary"
                      onClick={() => document.getElementById('tour-all-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Danh sách tour
                    </Button>
                    <Button as={Link} to="/contact" variant="outline-light" className="hero-btn-secondary">
                      Liên Hệ Tư Vấn
                    </Button>
                  </div>
                </div>
              </div>
            </Carousel.Item>
          ))}
        </Carousel>

        {/* Floating search bar */}
        <div className="search-float-bar">
          <Form onSubmit={handleSubmit} className="d-flex flex-wrap align-items-center gap-2 search-float-inner">
            <Form.Control
              className="search-float-input flex-fill"
              placeholder="Tìm tên tour..."
              value={filters.title}
              onChange={(e) => setFilters({ ...filters, title: e.target.value })}
            />
            <Form.Control
              className="search-float-input flex-fill"
              placeholder="Điểm đến..."
              value={filters.destination}
              onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
            />
            <Form.Select
              className="search-float-input"
              style={{ maxWidth: '180px' }}
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Form.Select>
            <Form.Control
              className="search-float-input"
              style={{ maxWidth: '130px' }}
              type="number"
              placeholder="Giá từ"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
            <Form.Control
              className="search-float-input"
              style={{ maxWidth: '130px' }}
              type="number"
              placeholder="Giá đến"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
            <Button type="submit" className="search-float-btn">
              <span className="d-none d-md-inline">🔍</span> Lọc
            </Button>
          </Form>
        </div>
      </section>

      {/* ===== SECTION 1: TOUR NỔI BẬT (ẩn khi đang lọc) ===== */}
      {!isFiltering && featuredTours.length > 0 && (
        <section className="mb-5">
          <div className="section-heading mb-3">
            <h3 className="section-title">🔥 Tour Nổi Bật</h3>
            <small className="text-muted">{tours.length} tour đang mở bán</small>
          </div>
          <Row className="g-3">
            {featuredTours.map((tour) => (
              <Col lg={3} md={6} key={`featured-${tour.id}`}>
                <Card className="h-100 featured-tour-card position-relative">
                  <Badge bg="danger" className="featured-hot-badge">Hot</Badge>
                  <div className="tour-card-img-wrap">
                    {tour.image_url ? (
                      <Card.Img variant="top" src={tour.image_url} className="tour-card-img" />
                    ) : (
                      <div className="featured-tour-placeholder">{tour.destination}</div>
                    )}
                    <div className="tour-card-img-overlay">
                      {tour.start_date && (
                        <span className="tour-card-date-chip">📅 {fmtDate(tour.start_date)}{tour.end_date ? ` → ${fmtDate(tour.end_date)}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="mb-1 fs-6" style={{ lineHeight: 1.3 }}>{tour.title}</Card.Title>
                    <Card.Text className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>📍 {tour.destination}</Card.Text>
                    <Card.Text className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>🎫 {Number(tour.booking_count || 0)} lượt đặt</Card.Text>
                    <Card.Text className="fw-bold mb-2" style={{ color: '#e65100', fontSize: '1.05rem' }}>
                      {Number(tour.price).toLocaleString()}<span className="price-currency"> VND</span>
                    </Card.Text>
                    <Button as={Link} to={`/tours/${tour.id}`} variant="outline-primary" size="sm" className="mt-auto">
                      Xem chi tiết →
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* ===== SECTION 2: ĐIỂM ĐẾN YÊU THÍCH (ẩn khi đang lọc) ===== */}
      {!isFiltering && <section className="mb-5">
        <div className="section-heading mb-3">
          <h3 className="section-title">📍 Điểm Đến Yêu Thích</h3>
          <small className="text-muted">Nhấn để khám phá tour tại điểm đến</small>
        </div>
        <Row className="g-3">
          {DESTINATIONS.map((dest) => (
            <Col lg={2} md={4} sm={6} xs={6} key={dest.name}>
              <div
                className="dest-card"
                onClick={() => goToDestination(dest.search)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && goToDestination(dest.search)}
              >
                <img src={dest.image} alt={dest.name} className="dest-card-img" />
                <div className="dest-card-overlay">
                  <span className="dest-card-name">{dest.name}</span>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </section>}

      {/* ===== SECTION 3: KẾT QUẢ TÌM KIẾM / TẤT CẢ TOUR ===== */}
      <section id="tour-all-section" className="mb-4">
        <div className="section-heading mb-3">
          <h3 className="section-title">{isFiltering ? '🔍 Kết Quả Tìm Kiếm' : '🗺️ Tất Cả Tour'}</h3>
          <div className="d-flex align-items-center gap-2">
            {isFiltering && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => { setFilters({ title: '', destination: '', minPrice: '', maxPrice: '', category: '' }); setCurrentPage(1); }}
              >
                ✕ Xóa bộ lọc
              </Button>
            )}
            <small className="text-muted">{tours.length} kết quả &middot; Trang {currentPage}/{totalPages}</small>
          </div>
        </div>

        <Row className="g-3">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Col lg={3} md={6} key={`skel-${i}`}>
                <div className="skeleton skeleton-card" />
              </Col>
            ))
          ) : pagedTours.length === 0 ? (
            <Col xs={12}>
              <Alert variant="info" className="mb-0">Không tìm thấy tour phù hợp với bộ lọc hiện tại.</Alert>
            </Col>
          ) : (
            pagedTours.map((tour) => (
              <Col lg={3} md={6} key={tour.id}>
                <Card className="h-100 tour-list-card position-relative">
                  <Badge bg="secondary" className="tour-slot-badge">{tour.slots || 0} chỗ</Badge>
                  <div className="tour-card-img-wrap">
                    {tour.image_url ? (
                      <Card.Img variant="top" src={tour.image_url} className="tour-card-img" />
                    ) : (
                      <div className="featured-tour-placeholder">{tour.destination}</div>
                    )}
                    <div className="tour-card-img-overlay">
                      {tour.start_date && (
                        <span className="tour-card-date-chip">📅 {fmtDate(tour.start_date)}{tour.end_date ? ` → ${fmtDate(tour.end_date)}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="mb-1 fs-6" style={{ lineHeight: 1.3 }}>{tour.title}</Card.Title>
                    <Card.Text className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>📍 {tour.destination}</Card.Text>
                    {tour.departure_point && (
                      <Card.Text className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>🚩 {tour.departure_point}</Card.Text>
                    )}
                    {tour.transport && (
                      <Card.Text className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>🚌 {TRANSPORT_LABELS[tour.transport] || tour.transport}</Card.Text>
                    )}
                    <Card.Text className="fw-bold mb-2" style={{ color: '#e65100', fontSize: '1.05rem' }}>
                      {Number(tour.price).toLocaleString()}<span className="price-currency"> VND</span>
                    </Card.Text>
                    <Button as={Link} to={`/tours/${tour.id}`} variant="outline-primary" size="sm" className="mt-auto">
                      Xem chi tiết →
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <Pagination.Item key={pg} active={pg === currentPage} onClick={() => setCurrentPage(pg)}>
                  {pg}
                </Pagination.Item>
              ))}
              <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} />
            </Pagination>
          </div>
        )}
      </section>
    </>
  );
};

export default TourListPage;
