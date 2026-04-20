import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Table, Badge, Modal, ProgressBar, InputGroup } from 'react-bootstrap';
import ImageUpload from '../../components/ImageUpload';
import client from '../../api/client';

const initialForm = {
  title: '',
  destination: '',
  departurePoint: '',
  category: '',
  status: 'open',
  transport: '',
  itinerary: '',
  price: '',
  startDate: '',
  endDate: '',
  slots: '',
  imageUrls: [],
  latitude: '',
  longitude: ''
};

const CATEGORY_OPTIONS = [
  { value: '', label: '-- Chọn danh mục --' },
  { value: 'bien-dao', label: 'Tour Biển đảo' },
  { value: 'mien-bac', label: 'Tour Miền Bắc' },
  { value: 'mien-trung', label: 'Tour Miền Trung' },
  { value: 'mien-nam', label: 'Tour Miền Nam' },
  { value: 'nuoc-ngoai', label: 'Tour Nước ngoài' },
  { value: 'trekking', label: 'Tour Trekking' },
  { value: 'tam-linh', label: 'Tour Tâm linh' }
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Đang mở bán' },
  { value: 'almost-full', label: 'Sắp hết chỗ' },
  { value: 'closed', label: 'Đã đóng' },
  { value: 'draft', label: 'Bản nháp' }
];

const TRANSPORT_OPTIONS = [
  { value: '', label: '-- Chọn phương tiện --' },
  { value: 'may-bay', label: 'Máy bay' },
  { value: 'oto-giuong-nam', label: 'Ô tô giường nằm' },
  { value: 'tau-hoa', label: 'Tàu hỏa' },
  { value: 'oto-du-lich', label: 'Ô tô du lịch' }
];

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
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
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
      departurePoint: tour.departure_point || '',
      category: tour.category || '',
      status: tour.status || 'open',
      transport: tour.transport || '',
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
        departurePoint: form.departurePoint,
        category: form.category,
        status: form.status,
        transport: form.transport,
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
    try {
      await client.delete(`/tours/${id}`);
      setDeleteTarget(null);
      setMessage('Xóa tour thành công');
      loadTours();
    } catch (error) {
      setDeleteTarget(null);
      setMessage(error.response?.data?.message || 'Xóa tour thất bại');
    }
  };

  const STATUS_BADGE = {
    open: 'success',
    'almost-full': 'warning',
    closed: 'danger',
    draft: 'secondary'
  };

  const STATUS_LABEL = {
    open: 'Đang mở bán',
    'almost-full': 'Sắp hết chỗ',
    closed: 'Đã đóng',
    draft: 'Bản nháp'
  };

  const CATEGORY_LABEL = Object.fromEntries(
    CATEGORY_OPTIONS.filter(o => o.value).map(o => [o.value, o.label])
  );

  const TRANSPORT_LABEL = Object.fromEntries(
    TRANSPORT_OPTIONS.filter(o => o.value).map(o => [o.value, o.label])
  );

  const filteredTours = tours.filter((t) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchesSearch = (t.title || '').toLowerCase().includes(q)
        || (t.destination || '').toLowerCase().includes(q)
        || String(t.id).includes(q);
      if (!matchesSearch) return false;
    }
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Quản lý tour</h3>
        <span className="text-muted">{filteredTours.length} / {tours.length} tour</span>
      </div>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      {!isFormOpen ? (
        <>
          {/* Toolbar */}
          <Card className="mb-3">
            <Card.Body className="py-2">
              <Row className="g-2 align-items-center">
                <Col md={4}>
                  <InputGroup size="sm">
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      placeholder="Tìm theo tên, điểm đến, ID..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select size="sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select size="sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label || 'Tất cả danh mục'}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4} className="text-end">
                  <Button size="sm" onClick={handleStartCreate}>+ Tạo tour mới</Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Data Table */}
          <div className="table-responsive">
            <Table striped bordered hover size="sm" className="align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: '50px' }}>ID</th>
                  <th>Tên tour</th>
                  <th>Điểm đến</th>
                  <th>Khởi hành</th>
                  <th>Danh mục</th>
                  <th>Phương tiện</th>
                  <th style={{ width: '120px' }}>Thời gian</th>
                  <th style={{ width: '120px' }}>Giá (VND)</th>
                  <th style={{ width: '140px' }}>Số chỗ</th>
                  <th style={{ width: '110px' }}>Trạng thái</th>
                  <th style={{ width: '120px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTours.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-muted py-4">
                      {tours.length === 0 ? 'Chưa có tour nào.' : 'Không tìm thấy tour phù hợp.'}
                    </td>
                  </tr>
                ) : filteredTours.map((tour) => {
                  const slotPercent = tour.slots > 0 ? Math.round(((tour.slots - (tour.available_slots ?? tour.slots)) / tour.slots) * 100) : 0;
                  return (
                    <tr key={tour.id}>
                      <td className="text-center fw-bold">{tour.id}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {tour.image_url && (
                            <img src={tour.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                          )}
                          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>{tour.title}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{tour.destination}</td>
                      <td style={{ fontSize: '0.85rem' }}>{tour.departure_point || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{CATEGORY_LABEL[tour.category] || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{TRANSPORT_LABEL[tour.transport] || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {tour.start_date
                          ? new Date(tour.start_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                          : '—'}
                        {tour.end_date && (
                          <> – {new Date(tour.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</>
                        )}
                      </td>
                      <td className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                        {Number(tour.price).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }} className="mb-1">{tour.slots} chỗ</div>
                        <ProgressBar
                          now={slotPercent}
                          variant={slotPercent >= 90 ? 'danger' : slotPercent >= 60 ? 'warning' : 'success'}
                          style={{ height: 6 }}
                        />
                      </td>
                      <td className="text-center">
                        <Badge bg={STATUS_BADGE[tour.status] || 'secondary'}>
                          {STATUS_LABEL[tour.status] || tour.status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button size="sm" variant="outline-primary" className="me-1 px-2 py-0" onClick={() => handleStartEdit(tour)} title="Sửa">
                          ✏️
                        </Button>
                        <Button size="sm" variant="outline-danger" className="px-2 py-0" onClick={() => setDeleteTarget(tour)} title="Xóa">
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Điểm khởi hành</Form.Label>
                  <Form.Control
                    placeholder="VD: TP.HCM"
                    value={form.departurePoint}
                    onChange={(e) => setForm({ ...form, departurePoint: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Danh mục tour</Form.Label>
                  <Form.Select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Phương tiện di chuyển</Form.Label>
                  <Form.Select
                    value={form.transport}
                    onChange={(e) => setForm({ ...form, transport: e.target.value })}
                  >
                    {TRANSPORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
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

      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa tour</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn xóa tour <strong>{deleteTarget?.title}</strong> không?
          <br />
          <small className="text-muted">Hành động này không thể hoàn tác.</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(deleteTarget?.id)}>Xóa tour</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TourManagementPage;
