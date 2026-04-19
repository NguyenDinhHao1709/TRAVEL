import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import ImageUpload from '../../components/ImageUpload';
import client from '../../api/client';

const initialForm = {
  title: '',
  destination: '',
  itinerary: '',
  price: '',
  startDate: '',
  endDate: '',
  slots: '',
  imageUrls: [],
  latitude: '',
  longitude: ''
};

const normalizeImageUrls = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [value];
  } catch {
    return [value];
  }
};

const TourManagementPage = () => {
  const [tours, setTours] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTourId, setEditingTourId] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(initialForm);
  const todayString = new Date().toISOString().split('T')[0];

  const loadTours = async () => {
    const { data } = await client.get('/tours');
    setTours(data);
  };

  useEffect(() => {
    loadTours();
  }, []);

  const resetFormState = () => {
    setForm(initialForm);
    setEditingTourId(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    setMessage('');
    setForm(initialForm);
    setEditingTourId(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (tour) => {
    setMessage('');
    setEditingTourId(tour.id);
    setForm({
      title: tour.title || '',
      destination: tour.destination || '',
      itinerary: tour.itinerary || '',
      price: tour.price || '',
      startDate: tour.start_date?.slice(0, 10) || '',
      endDate: tour.end_date?.slice(0, 10) || '',
      slots: tour.slots || '',
      imageUrls: normalizeImageUrls(tour.image_urls?.length ? tour.image_urls : tour.image_url),
      latitude: tour.latitude || '',
      longitude: tour.longitude || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) {
      setMessage('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }

    if (form.startDate < todayString || form.endDate < todayString) {
      setMessage('Không được chọn ngày trong quá khứ');
      return;
    }

    if (form.endDate < form.startDate) {
      setMessage('Ngày kết thúc không được trước ngày bắt đầu');
      return;
    }

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (form.latitude && (lat < -90 || lat > 90)) {
      setMessage('Vĩ độ phải nằm trong khoảng -90 đến 90');
      return;
    }
    if (form.longitude && (lng < -180 || lng > 180)) {
      setMessage('Kinh độ phải nằm trong khoảng -180 đến 180');
      return;
    }

    try {
      const payload = {
        title: form.title,
        destination: form.destination,
        itinerary: form.itinerary,
        price: Number(form.price),
        startDate: form.startDate,
        endDate: form.endDate,
        slots: Number(form.slots),
        imageUrls: form.imageUrls,
        latitude: form.latitude,
        longitude: form.longitude
      };

      if (editingTourId) {
        await client.put(`/tours/${editingTourId}`, payload);
        setMessage('Cập nhật tour thành công');
      } else {
        await client.post('/tours', payload);
        setMessage('Tạo tour thành công');
      }

      resetFormState();
      loadTours();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Lưu tour thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa tour này?')) {
      await client.delete(`/tours/${id}`);
      loadTours();
    }
  };

  return (
    <>
      <h3 className="mb-3">Quản lý tour</h3>
      {message && <Alert variant="info">{message}</Alert>}

      {!isFormOpen ? (
        <Button className="mb-3" onClick={handleStartCreate}>Tạo tour mới</Button>
      ) : (
        <Card className="mb-3">
          <Card.Body>
            <h5>{editingTourId ? 'Sửa tour' : 'Tạo tour mới'}</h5>
            <Row className="g-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tên tour</Form.Label>
                  <Form.Control
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Điểm đến</Form.Label>
                  <Form.Control
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Lịch trình</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.itinerary}
                    onChange={(e) => setForm({ ...form, itinerary: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Giá (VND)</Form.Label>
                  <Form.Control
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Số chỗ</Form.Label>
                  <Form.Control
                    type="number"
                    value={form.slots}
                    onChange={(e) => setForm({ ...form, slots: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Ngày bắt đầu</Form.Label>
                  <Form.Control
                    type="date"
                    min={todayString}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Ngày kết thúc</Form.Label>
                  <Form.Control
                    type="date"
                    min={form.startDate || todayString}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Vĩ độ (Latitude)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    placeholder="VD: 10.762622"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  />
                  <Form.Text className="text-muted">-90 đến 90</Form.Text>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Kinh độ (Longitude)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    placeholder="VD: 106.660172"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  />
                  <Form.Text className="text-muted">-180 đến 180</Form.Text>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  className="w-100 mb-3"
                  onClick={async () => {
                    const q = form.destination.trim();
                    if (!q) { setMessage('Nhập điểm đến trước khi lấy tọa độ'); return; }
                    try {
                      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Việt Nam')}&limit=1`);
                      const data = await resp.json();
                      if (data.length > 0) {
                        setForm(f => ({ ...f, latitude: data[0].lat, longitude: data[0].lon }));
                        setMessage(`Đã lấy tọa độ: ${data[0].display_name}`);
                      } else {
                        setMessage('Không tìm thấy tọa độ cho điểm đến này');
                      }
                    } catch { setMessage('Lỗi khi lấy tọa độ'); }
                  }}
                >
                  📍 Tự lấy
                </Button>
              </Col>
              <Col md={12}>
                <ImageUpload
                  folder="tour"
                  multiple
                  onUploadSuccess={(urls) => setForm((currentForm) => ({
                    ...currentForm,
                    imageUrls: [...currentForm.imageUrls, ...urls]
                  }))}
                />
                {form.imageUrls.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {form.imageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} style={{ position: 'relative' }}>
                        <img src={url} alt={`preview-${index + 1}`} style={{ width: '140px', height: '100px', objectFit: 'contain', borderRadius: '8px' }} />
                        <Button
                          size="sm"
                          variant="danger"
                          style={{ position: 'absolute', top: '4px', right: '4px', lineHeight: 1, padding: '2px 6px' }}
                          onClick={() => setForm((currentForm) => ({
                            ...currentForm,
                            imageUrls: currentForm.imageUrls.filter((_, imageIndex) => imageIndex !== index)
                          }))}
                        >
                          x
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Col>
            </Row>
            <Button className="mt-2 me-2" onClick={handleSubmit}>{editingTourId ? 'Lưu thay đổi' : 'Tạo'}</Button>
            <Button variant="secondary" onClick={resetFormState}>Hủy</Button>
          </Card.Body>
        </Card>
      )}

      <Row className="g-3">
        {tours.map((tour) => (
          <Col md={6} key={tour.id}>
            <Card>
              {tour.image_url && <Card.Img variant="top" src={tour.image_url} style={{ height: 'auto', maxHeight: '250px', objectFit: 'contain' }} />}
              <Card.Body>
                <h6>{tour.title}</h6>
                <small>{tour.destination}</small>
                <p className="mb-1">{Number(tour.price).toLocaleString()} VND</p>
                {tour.image_urls?.length > 1 && (
                  <div className="d-flex flex-wrap gap-2 mb-2 mt-2">
                    {tour.image_urls.slice(0, 4).map((url, index) => (
                      <img key={`${tour.id}-${index}`} src={url} alt={`${tour.title}-${index + 1}`} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '6px' }} />
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleStartEdit(tour)}>Sửa</Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(tour.id)}>Xóa</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default TourManagementPage;
