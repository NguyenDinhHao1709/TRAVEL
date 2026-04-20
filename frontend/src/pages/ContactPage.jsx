import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const VN_MOBILE_PREFIXES = [
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094', '096', '097', '098', '099'
];

const INFO_TYPES = [
  { value: 'ho-tro-dat-tour', label: 'Hỗ trợ đặt tour' },
  { value: 'phan-anh-dich-vu', label: 'Phản ánh dịch vụ' },
  { value: 'thiet-ke-tour-rieng', label: 'Yêu cầu thiết kế tour riêng' },
  { value: 'hop-tac-doanh-nghiep', label: 'Hợp tác doanh nghiệp' },
  { value: 'khac', label: 'Khác' },
];

const hcmBranch = {
  name: 'TRỤ SỞ TP. HỒ CHÍ MINH',
  address: '12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP.HCM',
  hotline: '0354162165',
  email: 'hk2travel@gmail.com'
};

const MAPS_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.858237983!2d106.6826!3d10.8221!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528e1e7e1c9b1%3A0x1e4d4a0e0e0e0e0e!2zMTIgTmd1eeG7hW4gVsSDbiBCw6Nv!5e0!3m2!1svi!2svn!4v1700000000000!5m2!1svi!2svn';

const isValidGmail = (value) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(value.trim());

const isValidVietnamPhone = (value) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length !== 10) return false;
  return VN_MOBILE_PREFIXES.some((prefix) => digitsOnly.startsWith(prefix));
};

const buildInitialForm = (user = null) => ({
  infoType: 'ho-tro-dat-tour',
  fullName: user?.fullName || '',
  email: user?.email || '',
  phone: '',
  guestCount: 0,
  message: ''
});

const ContactPage = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [validated, setValidated] = useState(false);
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [form, setForm] = useState(() => buildInitialForm(user));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user?.fullName || '',
      email: current.email || user?.email || ''
    }));
  }, [user?.fullName, user?.email]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const showGuestCount = form.infoType === 'thiet-ke-tour-rieng';

  const emailError = form.email && !isValidGmail(form.email) ? 'Email không hợp lệ' : '';
  const phoneError = form.phone && !isValidVietnamPhone(form.phone) ? 'Số điện thoại không hợp lệ' : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidated(true);
    setTouched({ email: true, phone: true });

    if (!event.currentTarget.checkValidity()) return;
    if (emailError || phoneError) return;

    setSending(true);
    setFeedback({ type: '', text: '' });

    try {
      const infoLabel = INFO_TYPES.find((t) => t.value === form.infoType)?.label || form.infoType;
      const payload = {
        infoType: infoLabel,
        fullName: form.fullName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\D/g, ''),
        guestCount: showGuestCount ? Number(form.guestCount || 0) : 0,
        message: form.message
      };
      const { data } = await client.post('/contact', payload);
      setFeedback({ type: 'success', text: data.message || 'Gửi liên hệ thành công!' });
      setValidated(false);
      setTouched({ email: false, phone: false });
      setForm(buildInitialForm(user));
    } catch (error) {
      setFeedback({
        type: 'danger',
        text: error.response?.data?.message || 'Không thể gửi liên hệ lúc này. Vui lòng thử lại.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-page">
      {/* ===== HERO BANNER ===== */}
      <div className="contact-hero">
        <div className="contact-hero-overlay" />
        <div className="contact-hero-content">
          <h1>KẾT NỐI VỚI CHÚNG TÔI</h1>
          <p>Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn trên mọi hành trình</p>
        </div>
      </div>

      <Container className="py-5">
        {feedback.text && (
          <Alert variant={feedback.type} className="mb-4" dismissible onClose={() => setFeedback({ type: '', text: '' })}>
            {feedback.text}
          </Alert>
        )}

        <Row className="g-4">
          {/* ===== FORM ===== */}
          <Col lg={7}>
            <Card className="contact-form-card border-0">
              <Card.Body className="p-4">
                <h4 className="contact-section-title mb-1">📬 Gửi thông tin liên hệ</h4>
                <p className="text-muted mb-4" style={{ fontSize: '0.88rem' }}>
                  Hãy điền thông tin bên dưới, chúng tôi sẽ phản hồi trong thời gian sớm nhất.
                </p>

                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Row className="g-3">
                    {/* Row 1: Loại thông tin + Họ tên */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Loại thông tin <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={form.infoType} onChange={(e) => setField('infoType', e.target.value)}>
                          {INFO_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Họ tên <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          value={form.fullName}
                          onChange={(e) => setField('fullName', e.target.value)}
                          placeholder="Nhập họ và tên"
                          required
                        />
                      </Form.Group>
                    </Col>

                    {/* Row 2: Email + Điện thoại */}
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="email"
                          value={form.email}
                          onChange={(e) => setField('email', e.target.value)}
                          onBlur={() => setTouched((c) => ({ ...c, email: true }))}
                          placeholder="Nhập email"
                          isInvalid={(validated || touched.email) && !!emailError}
                          required
                        />
                        <Form.Control.Feedback type="invalid">{emailError}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Điện thoại <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          value={form.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                          onBlur={() => setTouched((c) => ({ ...c, phone: true }))}
                          placeholder="Nhập số điện thoại"
                          isInvalid={(validated || touched.phone) && !!phoneError}
                          required
                        />
                        <Form.Control.Feedback type="invalid">{phoneError}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    {/* Số khách - chỉ hiện khi chọn "Thiết kế tour riêng" */}
                    {showGuestCount && (
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Số khách dự kiến</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            value={form.guestCount}
                            onChange={(e) => setField('guestCount', e.target.value)}
                            placeholder="Nhập số khách"
                          />
                        </Form.Group>
                      </Col>
                    )}

                    {/* Nội dung */}
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Nội dung <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          value={form.message}
                          onChange={(e) => setField('message', e.target.value)}
                          placeholder="Mô tả chi tiết yêu cầu của bạn..."
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} className="d-flex justify-content-end">
                      <Button type="submit" disabled={sending} size="lg" className="contact-submit-btn rounded-pill px-5">
                        {sending ? '⏳ Đang gửi...' : '📨 Gửi thông tin'}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ===== RIGHT COLUMN: INFO + MAP ===== */}
          <Col lg={5}>
            {/* Branch info card */}
            <Card className="contact-branch-card border-0 mb-3">
              <Card.Body className="p-4">
                <h4 className="contact-section-title mb-3">🏢 {hcmBranch.name}</h4>
                <div className="contact-info-list">
                  <div className="contact-info-item">
                    <span className="contact-info-icon">📍</span>
                    <span>{hcmBranch.address}</span>
                  </div>
                  <div className="contact-info-item">
                    <span className="contact-info-icon">📞</span>
                    <span>Hotline: <strong>{hcmBranch.hotline}</strong></span>
                  </div>
                  <div className="contact-info-item">
                    <span className="contact-info-icon">✉️</span>
                    <span>Email: <strong>{hcmBranch.email}</strong></span>
                  </div>
                  <div className="contact-info-item">
                    <span className="contact-info-icon">🕐</span>
                    <span>Thứ 2 – Thứ 7: 8:00 – 17:30</span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Google Maps embed */}
            <Card className="contact-map-card border-0">
              <Card.Body className="p-0">
                <iframe
                  title="HK2 Travel Office"
                  src={MAPS_EMBED}
                  width="100%"
                  height="300"
                  style={{ border: 0, borderRadius: '12px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ContactPage;
