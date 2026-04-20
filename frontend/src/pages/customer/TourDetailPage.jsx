import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Alert, ListGroup, Badge } from 'react-bootstrap';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import MapComponent from '../../components/MapComponent';

const renderStars = (value = 0) => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  return `${'★'.repeat(safeValue)}${'☆'.repeat(5 - safeValue)}`;
};

const getTourImages = (tour) => {
  if (Array.isArray(tour.image_urls) && tour.image_urls.length > 0) {
    return tour.image_urls.filter(Boolean);
  }

  return tour.image_url ? [tour.image_url] : [];
};

const CATEGORY_LABELS = {
  'bien-dao': 'Tour Biển đảo',
  'mien-bac': 'Tour Miền Bắc',
  'mien-trung': 'Tour Miền Trung',
  'mien-nam': 'Tour Miền Nam',
  'nuoc-ngoai': 'Tour Nước ngoài',
  'trekking': 'Tour Trekking',
  'tam-linh': 'Tour Tâm linh'
};

const STATUS_LABELS = {
  'open': 'Đang mở bán',
  'almost-full': 'Sắp hết chỗ',
  'closed': 'Đã đóng',
  'draft': 'Bản nháp'
};

const STATUS_VARIANTS = {
  'open': 'success',
  'almost-full': 'warning',
  'closed': 'danger',
  'draft': 'secondary'
};

const TRANSPORT_LABELS = {
  'may-bay': 'Máy bay',
  'oto-giuong-nam': 'Ô tô giường nằm',
  'tau-hoa': 'Tàu hỏa',
  'oto-du-lich': 'Ô tô du lịch'
};

const TourDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canBookTour = user?.role === 'user';
  const showBookingSection = !user || canBookTour;
  const loginRedirectTimeoutRef = useRef(null);
  const [tour, setTour] = useState(null);
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState({ peopleCount: 1 });
  const [selectedImage, setSelectedImage] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [customerReplyDrafts, setCustomerReplyDrafts] = useState({});
  const [customerReplySubmitting, setCustomerReplySubmitting] = useState(null);
  const [hasBookedTour, setHasBookedTour] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [deleteReviewSubmitting, setDeleteReviewSubmitting] = useState(false);
  const todayString = new Date().toISOString().split('T')[0];

  const loadTour = async () => {
    const [{ data: tourData }, { data: articlesData }] = await Promise.all([
      client.get(`/tours/${id}`),
      client.get('/articles', { params: { tourId: id, limit: 3 } })
    ]);

    setTour(tourData);
    setSelectedImage(getTourImages(tourData)[0] || '');
    setCurrentImageIndex(0);
    setRelatedArticles(articlesData || []);
  };

  const handlePrevImage = () => {
    if (!tour) return;
    const tourImages = getTourImages(tour);
    if (tourImages.length === 0) return;
    const prevIndex = (currentImageIndex - 1 + tourImages.length) % tourImages.length;
    setCurrentImageIndex(prevIndex);
    setSelectedImage(tourImages[prevIndex]);
  };

  const handleNextImage = () => {
    if (!tour) return;
    const tourImages = getTourImages(tour);
    if (tourImages.length === 0) return;
    const nextIndex = (currentImageIndex + 1) % tourImages.length;
    setCurrentImageIndex(nextIndex);
    setSelectedImage(tourImages[nextIndex]);
  };

  useEffect(() => {
    loadTour();
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== 'user') return;
    const checkUserData = async () => {
      const [bookingsRes, myReviewRes] = await Promise.allSettled([
        client.get('/bookings/my'),
        client.get(`/reviews/my/${id}`)
      ]);
      const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : [];
      setHasBookedTour(Array.isArray(bookings) && bookings.some(
        (b) => b.tour_id === Number(id) &&
          (['confirmed', 'completed'].includes(b.booking_status) || b.payment_status === 'paid')
      ));
      setUserReview(myReviewRes.status === 'fulfilled' ? myReviewRes.value.data : null);
    };
    checkUserData();
  }, [id, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tourImages = getTourImages(tour);
      if (tourImages.length <= 1) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tour, currentImageIndex]);

  useEffect(() => {
    return () => {
      if (loginRedirectTimeoutRef.current) {
        clearTimeout(loginRedirectTimeoutRef.current);
      }
    };
  }, []);

  const addWishlist = async () => {
    try {
      await client.post('/wishlists', { tourId: Number(id) });
      setMessage('Đã thêm vào danh sách yêu thích');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const submitBooking = async () => {
    if (!user) {
      setMessage('Bạn cần đăng nhập tài khoản người dùng để đặt tour');
      if (loginRedirectTimeoutRef.current) {
        clearTimeout(loginRedirectTimeoutRef.current);
      }
      loginRedirectTimeoutRef.current = setTimeout(() => {
        navigate('/login');
      }, 1500);
      return;
    }

    if (!canBookTour) {
      setMessage('Tài khoản hiện tại không thể đặt tour');
      return;
    }

    const parsedCount = Number(booking.peopleCount);
    if (!parsedCount || parsedCount < 1 || !Number.isInteger(parsedCount)) {
      setMessage('Số lượng người không hợp lệ (tối thiểu 1 người)');
      return;
    }

    try {
      await client.post('/bookings', { tourId: Number(id), ...booking });
      navigate('/my-bookings');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Đặt tour thất bại');
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!user || user.role !== 'user') return;

    setReviewSubmitting(true);
    setReviewMessage('');

    try {
      const payload = {
        tourId: Number(id),
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
      };
      const { data } = await client.post('/reviews', payload);
      setReviewMessage(data.message || 'Gửi đánh giá thành công');
      setReviewForm({ rating: 5, comment: '' });
      // Reload user review
      const { data: myReview } = await client.get(`/reviews/my/${id}`);
      setUserReview(myReview);
      await loadTour();
    } catch (error) {
      setReviewMessage(error.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const deleteOwnReview = async () => {
    if (!userReview) return;
    setDeleteReviewSubmitting(true);
    setReviewMessage('');
    try {
      await client.delete(`/reviews/${userReview.id}/my`);
      setUserReview(null);
      setReviewMessage('Đã xóa đánh giá. Bạn có thể đánh giá lại.');
      await loadTour();
    } catch (error) {
      setReviewMessage(error.response?.data?.message || 'Không thể xóa đánh giá');
    } finally {
      setDeleteReviewSubmitting(false);
    }
  };

  const submitCustomerReply = async (reviewId) => {
    const reply = (customerReplyDrafts[reviewId] || '').trim();
    if (!reply) return;
    setCustomerReplySubmitting(reviewId);
    try {
      await client.patch(`/reviews/${reviewId}/customer-reply`, { reply });
      setCustomerReplyDrafts(d => ({ ...d, [reviewId]: '' }));
      await loadTour();
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể gửi trả lời');
    } finally {
      setCustomerReplySubmitting(null);
    }
  };

  if (!tour) {
    return <p>Đang tải...</p>;
  }

  const tourImages = getTourImages(tour);

  return (
    <Row className="g-3">
      <Col md={8}>
        <div className="mb-2">
          <Button as={Link} to="/tours" variant="outline-secondary" size="sm">
            ← Trở lại danh sách tour
          </Button>
        </div>

        <Card className="mb-3">
          <div style={{ position: 'relative', background: '#f8f9fa', padding: '20px', textAlign: 'center', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedImage && <Card.Img variant="top" src={selectedImage} style={{ height: 'auto', maxHeight: '400px', objectFit: 'contain', width: '100%' }} />}
            
            {tourImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                  title="Ảnh trước"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                  title="Ảnh tiếp"
                >
                  ›
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    zIndex: 10
                  }}
                >
                  {currentImageIndex + 1} / {tourImages.length}
                </div>
              </>
            )}
          </div>
          <Card.Body>
            {tourImages.length > 1 && (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {tourImages.map((imageUrl, index) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt={`${tour.title}-${index + 1}`}
                    onClick={() => {
                      setSelectedImage(imageUrl);
                      setCurrentImageIndex(index);
                    }}
                    style={{
                      width: '72px',
                      height: '72px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: currentImageIndex === index ? '2px solid #0d6efd' : '2px solid transparent'
                    }}
                  />
                ))}
              </div>
            )}
            <h3>{tour.title}</h3>
            {tour.status && (
              <Badge bg={STATUS_VARIANTS[tour.status] || 'secondary'} className="mb-2">
                {STATUS_LABELS[tour.status] || tour.status}
              </Badge>
            )}
            <p><strong>Điểm đến:</strong> {tour.destination}</p>
            {tour.departure_point && <p><strong>Điểm khởi hành:</strong> {tour.departure_point}</p>}
            {tour.category && <p><strong>Danh mục:</strong> {CATEGORY_LABELS[tour.category] || tour.category}</p>}
            {tour.transport && <p><strong>Phương tiện:</strong> {TRANSPORT_LABELS[tour.transport] || tour.transport}</p>}
            <p><strong>Lịch trình:</strong> {tour.itinerary}</p>
            <p><strong>Giá:</strong> {Number(tour.price).toLocaleString()} VND</p>
            <p><strong>Chỗ còn:</strong> {tour.slots}</p>
            {message && <Alert variant="info">{message}</Alert>}

            {showBookingSection && (
              <>
                <p className="mb-3"><strong>Đặt tour:</strong></p>
                {tour.start_date && (
                  <p className="mb-3">
                    <strong>Ngày khởi hành:</strong>{' '}
                    {new Date(tour.start_date).toLocaleDateString('vi-VN')}
                    {tour.end_date && (
                      <> &nbsp;–&nbsp; <strong>Ngày kết thúc:</strong>{' '}
                        {new Date(tour.end_date).toLocaleDateString('vi-VN')}
                      </>
                    )}
                  </p>
                )}
                <Row className="g-2 mb-2">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Số người</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        max={tour.slots || 99}
                        value={booking.peopleCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setBooking({ ...booking, peopleCount: Number.isNaN(v) ? '' : v });
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Button className="w-100" onClick={submitBooking}>Đặt tour</Button>
                  </Col>
                </Row>
                {canBookTour && <Button variant="outline-primary" onClick={addWishlist}>Thêm yêu thích</Button>}
              </>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h5>Bản đồ</h5>
            <MapComponent latitude={tour.latitude} longitude={tour.longitude} />
          </Card.Body>
        </Card>

        <Card className="mt-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Bài viết về tour này</h5>
              <Button as={Link} to="/articles" size="sm" variant="outline-primary">Xem tất cả bài viết</Button>
            </div>
            {relatedArticles.length === 0 ? (
              <p className="text-muted mb-0">Hiện chưa có bài viết cho tour này.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {relatedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="border-0 bg-light-subtle"
                    role="button"
                    style={{ cursor: 'pointer' }}
                    as={Link}
                    to={`/articles/${article.id}`}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="fw-semibold mb-1">{article.title}</div>
                      <small className="text-muted d-block mb-1">
                        {new Date(article.created_at).toLocaleDateString('vi-VN')}
                      </small>
                      <small className="text-muted">
                        {(article.content || '').slice(0, 140)}{article.content?.length > 140 ? '...' : ''}
                      </small>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        {canBookTour && (
          <Card className="mb-3">
            <Card.Body>
              <h5>Đánh giá tour</h5>
              {reviewMessage && <Alert variant="info" className="py-2">{reviewMessage}</Alert>}

              {!hasBookedTour ? (
                <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                  Bạn cần đặt tour thành công để có thể đánh giá.
                </p>
              ) : userReview ? (
                <div>
                  <p className="text-muted mb-1" style={{ fontSize: 12 }}>Đánh giá của bạn:</p>
                  <div style={{ color: '#f59e0b', fontSize: 20, marginBottom: 4 }}>
                    {'★'.repeat(Math.max(0, Math.min(5, Number(userReview.rating) || 0)))}
                    {'☆'.repeat(5 - Math.max(0, Math.min(5, Number(userReview.rating) || 0)))}
                    <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 6 }}>{userReview.rating}/5</span>
                  </div>
                  {userReview.comment && (
                    <p style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>{userReview.comment}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={deleteReviewSubmitting}
                    onClick={deleteOwnReview}
                  >
                    {deleteReviewSubmitting ? 'Đang xóa...' : 'Xóa để đánh giá lại'}
                  </Button>
                </div>
              ) : (
                <Form onSubmit={submitReview}>
                  <Form.Group className="mb-2">
                    <Form.Label className="mb-1">Số sao</Form.Label>
                    <div className="d-flex align-items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Chọn ${star} sao`}
                          onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            lineHeight: 1,
                            fontSize: '28px',
                            cursor: 'pointer',
                            color: star <= reviewForm.rating ? '#f59e0b' : '#cbd5e1'
                          }}
                        >
                          {star <= reviewForm.rating ? '★' : '☆'}
                        </button>
                      ))}
                      <span className="ms-2" style={{ color: '#6b7280', fontSize: '13px' }}>
                        {reviewForm.rating}/5
                      </span>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label className="mb-1">Bình luận</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((current) => ({ ...current, comment: e.target.value }))}
                      placeholder="Chia sẻ trải nghiệm của bạn về tour"
                    />
                  </Form.Group>

                  <Button type="submit" size="sm" disabled={reviewSubmitting}>
                    {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </Button>
                </Form>
              )}
            </Card.Body>
          </Card>
        )}

        <Card>
          <Card.Body>
            <h5>Đánh giá</h5>
            {tour.reviews?.length ? tour.reviews.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 16 }}>
                {/* Header: avatar + tên + sao */}
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#0d6efd', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15, flexShrink: 0
                  }}>
                    {(r.user_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>{r.user_name || 'Người dùng'}</strong>
                    <div style={{ color: '#f59e0b', fontSize: 15, lineHeight: 1.2 }}>
                      {'★'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(r.rating) || 0)))}
                      <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 400, marginLeft: 6 }}>{r.rating}/5</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}
                  </div>
                </div>

                {/* Bình luận */}
                {r.comment && (
                  <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{r.comment}</div>
                )}
              </div>
            )) : <p className="text-muted">Chưa có đánh giá nào</p>}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default TourDetailPage;
