import { useEffect, useState } from 'react';
import { Row, Col, Card, Form, Button, Badge, Alert, Carousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
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

const TourListPage = () => {
  const [tours, setTours] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ title: '', destination: '', minPrice: '', maxPrice: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    loadTours();
  };

  const loadTours = async () => {
    setLoading(true);
    const params = {};

    if (filters.title.trim()) {
      params.title = filters.title.trim();
    }

    if (filters.destination.trim()) {
      params.destination = filters.destination.trim();
    }

    if (filters.minPrice !== '') {
      params.minPrice = filters.minPrice;
    }

    if (filters.maxPrice !== '') {
      params.maxPrice = filters.maxPrice;
    }

    const { data } = await client.get('/tours', { params });
    setTours(data);
    setLoading(false);
  };

  const loadFeaturedTours = async () => {
    try {
      const { data } = await client.get('/tours/featured');
      setFeaturedTours(data || []);
    } catch {
      setFeaturedTours([]);
    }
  };

  useEffect(() => {
    loadTours();
    loadFeaturedTours();
  }, []);

  const uniqueDestinations = new Set(tours.map((tour) => tour.destination)).size;

  return (
    <>
      <section className="mb-4" style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
        <Carousel interval={4000} fade indicators controls style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {SLIDES.map((slide, idx) => (
            <Carousel.Item key={idx}>
              <img
                src={slide.image}
                alt={slide.title}
                style={{ width: '100%', height: '460px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 65%, transparent 100%)',
                display: 'flex', alignItems: 'center', padding: '0 64px',
              }}>
                <div style={{ color: '#fff', maxWidth: '520px' }}>
                  <span style={{
                    display: 'inline-block', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '20px', padding: '3px 14px', fontSize: '0.82rem', marginBottom: '12px', letterSpacing: '0.5px'
                  }}>{slide.badge}</span>
                  <h1 style={{ fontWeight: 800, fontSize: '2.4rem', textShadow: '0 2px 12px rgba(0,0,0,0.5)', lineHeight: 1.2, marginBottom: '10px' }}>
                    {slide.title}
                  </h1>
                  <p style={{ fontSize: '1.05rem', marginBottom: '6px', opacity: 0.92 }}>
                    Giá chỉ từ: <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: '1.35rem' }}>{slide.price}</span>
                  </p>
                  <p style={{ fontSize: '0.97rem', opacity: 0.85, marginBottom: '20px' }}>{slide.desc}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button
                      variant="warning"
                      style={{ fontWeight: 700, borderRadius: '8px', padding: '8px 24px', color: '#fff', background: '#ff6a00', border: 'none' }}
                      onClick={() => document.getElementById('tour-filter-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Danh sách tour
                    </Button>
                    <Button
                      as={Link} to="/contact"
                      variant="outline-light"
                      style={{ fontWeight: 600, borderRadius: '8px', padding: '8px 24px' }}
                    >
                      Liên Hệ Tư Vấn
                    </Button>
                  </div>
                </div>
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      </section>

      {featuredTours.length > 0 && (
        <section className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="mb-0">Tour nổi bật</h3>
            <small className="text-muted">{tours.length} tour đang mở bán</small>
          </div>
          <Row className="g-3">
            {featuredTours.map((tour) => (
              <Col md={4} key={`featured-${tour.id}`}>
                <Card className="h-100 featured-tour-card">
                  {tour.image_url ? (
                    <Card.Img variant="top" src={tour.image_url} style={{ height: '180px', objectFit: 'cover' }} />
                  ) : (
                    <div className="featured-tour-placeholder">{tour.destination}</div>
                  )}
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="mb-0 fs-5">{tour.title}</Card.Title>
                      <Badge bg="primary">Nổi bật</Badge>
                    </div>
                    <Card.Text className="text-muted mb-1">{tour.destination}</Card.Text>
                    <Card.Text className="text-muted mb-1">Lượt đặt: {Number(tour.booking_count || 0)}</Card.Text>
                    <Card.Text className="fw-semibold mb-3">{Number(tour.price).toLocaleString()} VND</Card.Text>
                    <Button as={Link} to={`/tours/${tour.id}`} variant="outline-primary">Xem chi tiết</Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )}

      <section id="tour-filter-section" className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">Danh sách tour</h3>
          <small className="text-muted">{uniqueDestinations} điểm đến</small>
        </div>

        <Form onSubmit={handleSubmit} className="tour-filter-form">
          <Row className="mb-3 g-2">
          <Col md={3}>
            <Form.Control
              placeholder="Tìm tên tour"
              value={filters.title}
              onChange={(e) => setFilters({ ...filters, title: e.target.value })}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              placeholder="Tìm điểm đến"
              value={filters.destination}
              onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              placeholder="Giá từ"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              placeholder="Giá đến"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </Col>
          <Col md={2}>
            <Button type="submit" className="w-100">Lọc</Button>
          </Col>
        </Row>
        </Form>
      </section>

      <Row className="g-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Col md={4} key={`skel-${i}`}>
              <div className="skeleton skeleton-card" />
            </Col>
          ))
        ) : tours.length === 0 ? (
          <Col xs={12}>
            <Alert variant="info" className="mb-0">Không tìm thấy tour phù hợp với bộ lọc hiện tại.</Alert>
          </Col>
        ) : (
          tours.map((tour) => (
          <Col md={4} key={tour.id}>
            <Card className="h-100 tour-list-card">
              <div style={{ overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                {tour.image_url ? (
                  <Card.Img variant="top" src={tour.image_url} style={{ height: '200px', objectFit: 'cover' }} />
                ) : (
                  <div className="featured-tour-placeholder">{tour.destination}</div>
                )}
              </div>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Card.Title className="mb-0 fs-5" style={{ lineHeight: 1.3 }}>{tour.title}</Card.Title>
                  <Badge bg="secondary" className="ms-2 flex-shrink-0">{tour.slots || 0} chỗ</Badge>
                </div>
                <Card.Text className="mb-1 text-muted" style={{ fontSize: '0.9rem' }}>
                  📍 {tour.destination}
                </Card.Text>
                <Card.Text className="fw-bold mb-3" style={{ color: '#e65100', fontSize: '1.1rem' }}>
                  {Number(tour.price).toLocaleString()} VND
                </Card.Text>
                <Button as={Link} to={`/tours/${tour.id}`} variant="primary" className="mt-auto">
                  Xem chi tiết →
                </Button>
              </Card.Body>
            </Card>
          </Col>
          ))
        )}
      </Row>
    </>
  );
};

export default TourListPage;
