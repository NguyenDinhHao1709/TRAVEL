import { useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Badge, Alert, Spinner, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const initialForm = {
  title: '',
  content: '',
  imageUrl: '',
  tourId: ''
};

const ArticlesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'staff' || user?.role === 'admin';
  const fileInputRef = useRef(null);
  const [articles, setArticles] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await client.get('/articles');
      setArticles(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
  };

  const loadTours = async () => {
    try {
      const { data } = await client.get('/tours');
      setTours(data || []);
    } catch {
      setTours([]);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      let uploadedImageUrl = form.imageUrl.trim();
      let uploadWarning = '';
      if (imageFile) {
        try {
          const uploadForm = new FormData();
          uploadForm.append('file', imageFile);
          const { data: uploadData } = await client.post('/upload/article', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploadedImageUrl = uploadData?.imageUrl || uploadedImageUrl;
        } catch {
          uploadWarning = ' (Không thể tải ảnh lên, bài viết sẽ lưu không có ảnh mới)';
        }
      }

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        imageUrl: uploadedImageUrl,
        tourId: form.tourId || null
      };

      if (editingId) {
        await client.put(`/articles/${editingId}`, payload);
        setMessage('Cập nhật bài viết thành công' + uploadWarning);
      } else {
        await client.post('/articles', payload);
        setMessage('Thêm bài viết thành công' + uploadWarning);
      }

      resetForm();
      await loadArticles();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu bài viết');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (article) => {
    if (!canManage) return;
    setError('');
    setMessage('');
    setEditingId(article.id);
    setForm({
      title: article.title || '',
      content: article.content || '',
      imageUrl: article.image_url || '',
      tourId: article.tour_id ? String(article.tour_id) : ''
    });
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (articleId) => {
    if (!canManage) return;
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;

    try {
      setError('');
      setMessage('');
      await client.delete(`/articles/${articleId}`);
      setMessage('Xóa bài viết thành công');
      if (editingId === articleId) {
        resetForm();
      }
      await loadArticles();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa bài viết');
    }
  };

  useEffect(() => {
    loadArticles();
    if (canManage) {
      loadTours();
    }
  }, [canManage]);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-1">Bài viết du lịch</h3>
          <small className="text-muted">Cập nhật kinh nghiệm, cẩm nang và thông tin hữu ích cho chuyến đi</small>
        </div>
      </div>

      {canManage && (
        <Card className="mb-3">
          <Card.Body>
            <h5 className="mb-3">{editingId ? 'Chỉnh sửa bài viết' : 'Thêm bài viết mới'}</h5>
            <Form onSubmit={handleSubmit}>
              <Row className="g-2">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Tiêu đề</Form.Label>
                    <Form.Control
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Nhập tiêu đề bài viết"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Tour liên quan (không bắt buộc)</Form.Label>
                    <Form.Select
                      value={form.tourId}
                      onChange={(e) => setForm({ ...form, tourId: e.target.value })}
                    >
                      <option value="">Cẩm nang chung</option>
                      {tours.map((tour) => (
                        <option key={tour.id} value={tour.id}>{tour.title}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Nội dung</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="Nhập nội dung bài viết"
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Ảnh đại diện (không bắt buộc)</Form.Label>
                    <Form.Control
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setError('');
                        setImageFile(e.target.files?.[0] || null);
                      }}
                    />
                    <Form.Text className="text-muted">
                      {imageFile
                        ? `Đã chọn: ${imageFile.name}`
                        : form.imageUrl
                          ? 'Giữ ảnh hiện tại nếu không chọn ảnh mới'
                          : 'Chưa có ảnh'}
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={12} className="d-flex gap-2 mt-2">
                  <Button type="submit" disabled={saving}>{editingId ? 'Lưu thay đổi' : 'Thêm bài viết'}</Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Hủy chỉnh sửa
                    </Button>
                  )}
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Đang tải bài viết...</div>
        </div>
      ) : (
        <Row className="g-3">
          {articles.length === 0 && (
            <Col xs={12}>
              <Alert variant="info" className="mb-0">Chưa có bài viết nào.</Alert>
            </Col>
          )}

          {articles.map((article) => (
            <Col md={6} lg={4} key={article.id}>
              <Card
                className="h-100 shadow-sm border-0"
                role="button"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/articles/${article.id}`)}
              >
                {article.image_url && (
                  <Card.Img
                    variant="top"
                    src={article.image_url}
                    style={{ height: '190px', objectFit: 'cover' }}
                    alt={article.title}
                  />
                )}
                <Card.Body className="d-flex flex-column">
                  <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                    {article.tour_id ? (
                      <Badge bg="primary">Tour liên quan</Badge>
                    ) : (
                      <Badge bg="secondary">Cẩm nang chung</Badge>
                    )}
                    <small className="text-muted">{new Date(article.created_at).toLocaleDateString('vi-VN')}</small>
                  </div>

                  <h5 className="mb-2">{article.title}</h5>
                  <p className="text-muted mb-3" style={{ minHeight: '72px' }}>
                    {(article.content || '').slice(0, 140)}{article.content?.length > 140 ? '...' : ''}
                  </p>

                  {article.tour_id && (
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <small className="text-muted">{article.tour_title || 'Tour'}</small>
                      <div className="d-flex gap-2">
                        <Button
                          as={Link}
                          to={`/tours/${article.tour_id}`}
                          size="sm"
                          variant="outline-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Xem tour
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(article);
                              }}
                            >
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(article.id);
                              }}
                            >
                              Xóa
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!article.tour_id && canManage && (
                    <div className="mt-auto d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-warning"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(article);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
};

export default ArticlesPage;
