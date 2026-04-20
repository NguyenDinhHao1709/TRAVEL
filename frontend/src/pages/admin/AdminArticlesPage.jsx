import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../../components/ImageUpload';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const initialForm = { title: '', content: '', imageUrl: '', tourId: '' };

const AdminArticlesPage = () => {
  const [articles, setArticles] = useState([]);
  const [tours, setTours] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [articleFilter, setArticleFilter] = useState({ search: '', tourId: '' });
  const [articlePage, setArticlePage] = useState(1);
  const [articleTotalPages, setArticleTotalPages] = useState(1);
  const [articleTotal, setArticleTotal] = useState(0);

  const loadArticles = async (page = articlePage, filter = articleFilter) => {
    const { data } = await client.get('/articles', {
      params: { page, limit: 10, ...filter }
    });
    setArticles(data.data);
    setArticleTotal(data.total);
    setArticlePage(data.page);
    setArticleTotalPages(data.totalPages);
  };

  const loadTours = async () => {
    const { data } = await client.get('/tours', { params: { all: true } });
    setTours(data);
  };

  useEffect(() => {
    loadArticles(1, articleFilter);
    loadTours();
  }, []);

  useEffect(() => { loadArticles(articlePage, articleFilter); }, [articlePage, articleFilter]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormOpen(false);
    setMessage('');
  };

  const handleStartCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormOpen(true);
    setMessage('');
  };

  const handleStartEdit = (article) => {
    setForm({
      title: article.title || '',
      content: article.content || '',
      imageUrl: article.image_url || '',
      tourId: article.tour_id ? String(article.tour_id) : ''
    });
    setEditingId(article.id);
    setIsFormOpen(true);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setMessage('Tiêu đề không được để trống');
      setMessageType('danger');
      return;
    }
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content || '',
        imageUrl: form.imageUrl || '',
        tourId: form.tourId || null
      };
      if (editingId) {
        await client.put(`/articles/${editingId}`, payload);
        setMessage('Cập nhật bài viết thành công');
      } else {
        await client.post('/articles', payload);
        setMessage('Tạo bài viết thành công');
      }
      setMessageType('success');
      resetForm();
      loadArticles(1, articleFilter);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Lưu bài viết thất bại');
      setMessageType('danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    await client.delete(`/articles/${id}`);
    loadArticles(articlePage, articleFilter);
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const backUrl = user?.role === 'staff' ? '/staff' : '/admin';

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(backUrl)}>
          ← Quay lại trang quản trị
        </Button>
        <h3 className="mb-0">Quản lý bài viết</h3>
      </div>
      {message && (
        <Alert variant={messageType} dismissible onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {!isFormOpen ? (
        <Button className="mb-3" onClick={handleStartCreate}>Tạo bài viết mới</Button>
      ) : (
        <Card className="mb-4">
          <Card.Body>
            <h5>{editingId ? 'Sửa bài viết' : 'Tạo bài viết mới'}</h5>
            <Row className="g-2">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Tiêu đề</Form.Label>
                  <Form.Control
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Nhập tiêu đề bài viết"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Nội dung</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Nhập nội dung bài viết"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tour liên quan</Form.Label>
                  <Form.Select
                    value={form.tourId}
                    onChange={(e) => setForm({ ...form, tourId: e.target.value })}
                  >
                    <option value="">-- Không gắn tour --</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>URL ảnh (nhập tay hoặc upload bên dưới)</Form.Label>
                  <Form.Control
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <ImageUpload
                  folder="article"
                  multiple={false}
                  onUploadSuccess={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                />
                {form.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </Col>
            </Row>
            <div className="mt-3">
              <Button className="me-2" onClick={handleSubmit}>
                {editingId ? 'Lưu thay đổi' : 'Tạo'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>Hủy</Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Form className="mb-3" onSubmit={e => { e.preventDefault(); setArticlePage(1); loadArticles(1, articleFilter); }}>
        <Row className="g-2 align-items-end">
          <Col md={4}><Form.Control placeholder="Tìm theo tiêu đề hoặc nội dung" value={articleFilter.search} onChange={e => setArticleFilter(f => ({ ...f, search: e.target.value }))} /></Col>
          <Col md={3}>
            <Form.Select value={articleFilter.tourId} onChange={e => setArticleFilter(f => ({ ...f, tourId: e.target.value }))}>
              <option value="">Tất cả tour</option>
              {tours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Form.Select>
          </Col>
          <Col md={2}><Button type="submit" className="w-100">Lọc</Button></Col>
        </Row>
      </Form>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tiêu đề</th>
            <th>Tour</th>
            <th>Ảnh</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {articles.length === 0 && (
            <tr><td colSpan={6} className="text-center">Chưa có bài viết nào</td></tr>
          )}
          {(articles || []).map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.title}</td>
              <td>{a.tour_title || '-'}</td>
              <td>
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.title}
                    style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                )}
              </td>
              <td>{a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : '-'}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleStartEdit(a)}>
                  Sửa
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(a.id)}>
                  Xóa
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div>Tổng: {articleTotal} | Trang {articlePage}/{articleTotalPages}</div>
        <div>
          <Button size="sm" disabled={articlePage === 1} onClick={() => setArticlePage(p => Math.max(1, p - 1))}>Trước</Button>{' '}
          <Button size="sm" disabled={articlePage === articleTotalPages} onClick={() => setArticlePage(p => Math.min(articleTotalPages, p + 1))}>Sau</Button>
        </div>
      </div>
    </>
  );
};

export default AdminArticlesPage;
