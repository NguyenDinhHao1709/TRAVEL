import { useEffect, useState } from 'react';
import { Row, Col, Card, Form, Button, Badge, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const TourListPage = () => {
  const [tours, setTours] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [filters, setFilters] = useState({ title: '', destination: '', minPrice: '', maxPrice: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    loadTours();
  };

  const loadTours = async () => {
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
      <section className="home-hero mb-4">
        <div className="home-hero-content">
          <Badge bg="light" text="dark" className="mb-2 home-hero-badge">Nền tảng đặt tour thông minh</Badge>
          <h1 className="home-hero-title">Khám phá hành trình phù hợp cho bạn</h1>
          <p className="home-hero-subtitle mb-3">
            Tìm tour theo điểm đến, ngân sách và lịch trình chỉ trong vài giây.
          </p>
          <Button variant="primary" onClick={() => document.getElementById('tour-filter-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Bắt đầu tìm tour
          </Button>
        </div>
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
        {tours.length === 0 && (
          <Col xs={12}>
            <Alert variant="info" className="mb-0">Không tìm thấy tour phù hợp với bộ lọc hiện tại.</Alert>
          </Col>
        )}
        {tours.map((tour) => (
          <Col md={4} key={tour.id}>
            <Card className="h-100 tour-list-card">
              {tour.image_url && (
                <Card.Img variant="top" src={tour.image_url} style={{ height: '190px', objectFit: 'cover' }} />
              )}
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Card.Title className="mb-0 fs-5">{tour.title}</Card.Title>
                  <Badge bg="secondary">{tour.slots || 0} chỗ</Badge>
                </div>
                <Card.Text className="mb-1 text-muted">Điểm đến: {tour.destination}</Card.Text>
                <Card.Text className="fw-semibold">Giá: {Number(tour.price).toLocaleString()} VND</Card.Text>
                <Button as={Link} to={`/tours/${tour.id}`} variant="primary">Xem chi tiết</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default TourListPage;
