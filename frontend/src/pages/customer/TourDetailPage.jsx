import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Alert, Badge, Accordion } from 'react-bootstrap';
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
  const [wishlisted, setWishlisted] = useState(false);
  const todayString = new Date().toISOString().split('T')[0];

  // Parse itinerary text into days for accordion
  const parseItinerary = (text) => {
    if (!text) return [];
    // Split by "Ngày X:" pattern
    const parts = text.split(/(?=Ngày\s+\d+)/gi).filter(Boolean);
    if (parts.length <= 1) return [{ title: 'Lịch trình', content: text }];
    return parts.map((part) => {
      const match = part.match(/^(Ngày\s+\d+)[:\s]*(.*)/is);
      if (match) {
        return { title: match[1].trim(), content: match[2].trim() };
      }
      return { title: 'Lịch trình', content: part.trim() };
    });
  };

  // Calculate trip duration from dates
  const getTripDuration = () => {
    if (!tour?.start_date || !tour?.end_date) return null;
    const start = new Date(tour.start_date);
    const end = new Date(tour.end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const nights = days - 1;
    if (days <= 0) return null;
    return `${days} Ngày ${nights} Đêm`;
  };

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
      const [bookingsRes, myReviewRes, wishlistRes] = await Promise.allSettled([
        client.get('/bookings/my'),
        client.get(`/reviews/my/${id}`),
        client.get('/wishlists/my')
      ]);
      const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : [];
      setHasBookedTour(Array.isArray(bookings) && bookings.some(
        (b) => b.tour_id === Number(id) &&
          (['confirmed', 'completed'].includes(b.booking_status) || b.payment_status === 'paid')
      ));
      setUserReview(myReviewRes.status === 'fulfilled' ? myReviewRes.value.data : null);
      const wishlist = wishlistRes.status === 'fulfilled' ? wishlistRes.value.data : [];
      setWishlisted(Array.isArray(wishlist) && wishlist.some(w => w.tour_id === Number(id)));
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
      if (wishlisted) {
        await client.delete(`/wishlists/my/${id}`);
        setWishlisted(false);
        setMessage('Đã xóa khỏi danh sách yêu thích');
      } else {
        await client.post('/wishlists', { tourId: Number(id) });
        setWishlisted(true);
        setMessage('Đã thêm vào danh sách yêu thích');
      }
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
  const itineraryDays = parseItinerary(tour.itinerary);
  const tripDuration = getTripDuration();

  return (
    <>
      <Row className="g-3">
        {/* === LEFT COLUMN === */}
        <Col lg={8}>
          <div className="mb-2">
            <Button as={Link} to="/tours" variant="outline-secondary" size="sm">
              ← Trở lại danh sách tour
            </Button>
          </div>

          {/* Image Gallery */}
          <Card className="mb-3 border-0 shadow-sm">
            <div style={{ position: 'relative', background: '#f8f9fa', padding: '20px', textAlign: 'center', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px 12px 0 0' }}>
              {selectedImage && <Card.Img variant="top" src={selectedImage} style={{ height: 'auto', maxHeight: '400px', objectFit: 'contain', width: '100%' }} />}
              
              {tourImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    style={{
                      position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%',
                      width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}
                    title="Ảnh trước"
                  >‹</button>
                  <button
                    onClick={handleNextImage}
                    style={{
                      position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%',
                      width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}
                    title="Ảnh tiếp"
                  >›</button>
                  <div style={{
                    position: 'absolute', bottom: '20px', right: '20px',
                    background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 12px',
                    borderRadius: '4px', fontSize: '14px', zIndex: 10
                  }}>
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
                      onClick={() => { setSelectedImage(imageUrl); setCurrentImageIndex(index); }}
                      style={{
                        width: '72px', height: '72px', objectFit: 'contain', borderRadius: '8px',
                        cursor: 'pointer', border: currentImageIndex === index ? '2px solid #0d6efd' : '2px solid transparent'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Title + Wishlist Heart */}
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h3 className="mb-1">{tour.title}</h3>
                  {tour.status && (
                    <Badge bg={STATUS_VARIANTS[tour.status] || 'secondary'}>
                      {STATUS_LABELS[tour.status] || tour.status}
                    </Badge>
                  )}
                </div>
                {canBookTour && (
                  <button
                    onClick={addWishlist}
                    title={wishlisted ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px',
                      color: wishlisted ? '#ef4444' : '#d1d5db', transition: 'color 0.2s', padding: '4px',
                      lineHeight: 1, flexShrink: 0
                    }}
                  >
                    {wishlisted ? '❤️' : '🤍'}
                  </button>
                )}
              </div>

              {/* Visual Info Icons */}
              <div className="d-flex flex-wrap gap-3 mb-3 py-2 px-3" style={{ background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
                <span title="Điểm đến">📍 {tour.destination}</span>
                {tripDuration && <span title="Thời gian">⏱️ {tripDuration}</span>}
                {tour.departure_point && <span title="Khởi hành">🚀 {tour.departure_point}</span>}
                {tour.transport && <span title="Phương tiện">🚌 {TRANSPORT_LABELS[tour.transport] || tour.transport}</span>}
                {tour.category && <span title="Danh mục">🏷️ {CATEGORY_LABELS[tour.category] || tour.category}</span>}
                <span title="Chỗ còn" style={{ color: tour.slots <= 5 ? '#ef4444' : undefined, fontWeight: tour.slots <= 5 ? 600 : undefined }}>
                  👤 Còn {tour.slots} chỗ
                </span>
              </div>

              {/* Itinerary Accordion */}
              <h5 className="mb-2">📋 Lịch trình</h5>
              {itineraryDays.length > 1 ? (
                <Accordion defaultActiveKey="0" className="mb-3">
                  {itineraryDays.map((day, idx) => (
                    <Accordion.Item eventKey={String(idx)} key={idx}>
                      <Accordion.Header>
                        <strong>{day.title}</strong>
                      </Accordion.Header>
                      <Accordion.Body style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>
                        {day.content}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : (
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>{tour.itinerary}</p>
              )}
            </Card.Body>
          </Card>

          {/* Map */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <h5>🗺️ Bản đồ</h5>
              <MapComponent latitude={tour.latitude} longitude={tour.longitude} />
            </Card.Body>
          </Card>

          {/* Related Articles */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">📰 Bài viết về tour này</h5>
                <Button as={Link} to="/articles" size="sm" variant="outline-primary">Xem tất cả</Button>
              </div>
              {relatedArticles.length === 0 ? (
                <p className="text-muted mb-0">Hiện chưa có bài viết cho tour này.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {relatedArticles.map((article) => (
                    <Card key={article.id} className="border-0 bg-light-subtle" role="button" style={{ cursor: 'pointer' }} as={Link} to={`/articles/${article.id}`}>
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

          {/* Reviews Section - moved to bottom of left column */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">⭐ Đánh giá ({tour.reviews?.length || 0})</h5>

              {/* User's own review form */}
              {canBookTour && (
                <div className="mb-4 p-3" style={{ background: '#f8fafc', borderRadius: '8px' }}>
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
                      <Button size="sm" variant="outline-danger" disabled={deleteReviewSubmitting} onClick={deleteOwnReview}>
                        {deleteReviewSubmitting ? 'Đang xóa...' : 'Xóa để đánh giá lại'}
                      </Button>
                    </div>
                  ) : (
                    <Form onSubmit={submitReview}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1 fw-semibold">Đánh giá của bạn</Form.Label>
                        <div className="d-flex align-items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star} type="button" aria-label={`Chọn ${star} sao`}
                              onClick={() => setReviewForm((c) => ({ ...c, rating: star }))}
                              style={{
                                border: 'none', background: 'transparent', padding: 0, lineHeight: 1,
                                fontSize: '28px', cursor: 'pointer',
                                color: star <= reviewForm.rating ? '#f59e0b' : '#cbd5e1'
                              }}
                            >
                              {star <= reviewForm.rating ? '★' : '☆'}
                            </button>
                          ))}
                          <span className="ms-2" style={{ color: '#6b7280', fontSize: '13px' }}>{reviewForm.rating}/5</span>
                        </div>
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Control
                          as="textarea" rows={3} value={reviewForm.comment}
                          onChange={(e) => setReviewForm((c) => ({ ...c, comment: e.target.value }))}
                          placeholder="Chia sẻ trải nghiệm của bạn về tour"
                        />
                      </Form.Group>
                      <Button type="submit" size="sm" disabled={reviewSubmitting}>
                        {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                      </Button>
                    </Form>
                  )}
                </div>
              )}

              {/* All reviews */}
              {tour.reviews?.length ? tour.reviews.map((r) => (
                <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 16 }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#0d6efd', color: '#fff',
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
                  {r.comment && <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{r.comment}</div>}
                </div>
              )) : <p className="text-muted">Chưa có đánh giá nào</p>}
            </Card.Body>
          </Card>
        </Col>

        {/* === RIGHT COLUMN - Sticky Booking Widget === */}
        <Col lg={4}>
          <div style={{ position: 'sticky', top: '90px' }}>
            {/* Price & Booking Card */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Body>
                <div className="text-center mb-3">
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Giá từ</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d6efd' }}>
                    {Number(tour.price).toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 400 }}>VND</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>/ người</div>
                </div>

                <hr />

                {tour.start_date && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between" style={{ fontSize: '14px' }}>
                      <span className="text-muted">📅 Khởi hành</span>
                      <strong>{new Date(tour.start_date).toLocaleDateString('vi-VN')}</strong>
                    </div>
                    {tour.end_date && (
                      <div className="d-flex justify-content-between mt-1" style={{ fontSize: '14px' }}>
                        <span className="text-muted">📅 Kết thúc</span>
                        <strong>{new Date(tour.end_date).toLocaleDateString('vi-VN')}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="d-flex justify-content-between mb-2" style={{ fontSize: '14px' }}>
                  <span className="text-muted">👤 Chỗ còn</span>
                  <strong style={{ color: tour.slots <= 5 ? '#ef4444' : undefined }}>
                    {tour.slots} chỗ
                  </strong>
                </div>

                {message && <Alert variant="info" className="py-2 mt-2" style={{ fontSize: '13px' }}>{message}</Alert>}

                {showBookingSection && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontSize: '14px', fontWeight: 600 }}>Số người</Form.Label>
                      <Form.Control
                        type="number" min={1} max={tour.slots || 99}
                        value={booking.peopleCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setBooking({ ...booking, peopleCount: Number.isNaN(v) ? '' : v });
                        }}
                      />
                    </Form.Group>

                    {booking.peopleCount > 0 && (
                      <div className="d-flex justify-content-between mb-3 p-2" style={{ background: '#f0f9ff', borderRadius: '6px', fontSize: '14px' }}>
                        <span>Tổng tiền</span>
                        <strong style={{ color: '#0d6efd' }}>
                          {(Number(tour.price) * (booking.peopleCount || 1)).toLocaleString()} VND
                        </strong>
                      </div>
                    )}

                    <Button className="w-100 py-2 fw-bold" size="lg" onClick={submitBooking}
                      style={{ fontSize: '16px', borderRadius: '8px' }}
                    >
                      Đặt tour ngay
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>

            {/* Quick Info Card */}
            {tour.avg_rating > 0 && (
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div style={{ fontSize: '32px', color: '#f59e0b' }}>
                    {'★'.repeat(Math.round(Number(tour.avg_rating) || 0))}{'☆'.repeat(5 - Math.round(Number(tour.avg_rating) || 0))}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {Number(tour.avg_rating).toFixed(1)}/5 — {tour.reviews?.length || 0} đánh giá
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
};

export default TourDetailPage;
