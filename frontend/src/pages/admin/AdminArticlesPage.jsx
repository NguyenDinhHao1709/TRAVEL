import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Table } from 'react-bootstrap';
import ImageUpload from '../../components/ImageUpload';
import client from '../../api/client';

const initialForm = { title: '', content: '', imageUrl: '', tourId: '' };

const AdminArticlesPage = () => {
  const [articles, setArticles] = useState([]);
  const [tours, setTours] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  const loadArticles = async () => {
    const { data } = await client.get('/articles');
    setArticles(data);
  };

  const loadTours = async () => {
    const { data } = await client.get('/tours');
    setTours(data);
  };

  useEffect(() => {
    loadArticles();
    loadTours();
  }, []);

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
      loadArticles();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Lưu bài viết thất bại');
      setMessageType('danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    await client.delete(`/articles/${id}`);
    loadArticles();
  };

  return (
    <>
      <h3 className="mb-3">Quản lý bài viết</h3>
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
          {articles.map((a) => (
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
    </>
  );
};

export default AdminArticlesPage;
