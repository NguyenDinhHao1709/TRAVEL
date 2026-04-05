import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const VN_MOBILE_PREFIXES = [
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094', '096', '097', '098', '099'
];

const hcmBranch = {
  name: 'TRỤ SỞ TP. HỒ CHÍ MINH',
  address: '12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP.HCM',
  hotline: '0354162165',
  email: 'nguyendinhhao170909@gmail.com'
};

const isValidGmail = (value) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(value.trim());

const isValidVietnamPhone = (value) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length !== 10) return false;
  return VN_MOBILE_PREFIXES.some((prefix) => digitsOnly.startsWith(prefix));
};

const buildInitialForm = (user = null) => ({
  infoType: 'Du lịch',
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

  const emailError = form.email && !isValidGmail(form.email) ? 'Email không hợp lệ' : '';
  const phoneError = form.phone && !isValidVietnamPhone(form.phone) ? 'Số điện thoại không hợp lệ' : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidated(true);
    setTouched({ email: true, phone: true });

    if (!event.currentTarget.checkValidity()) {
      return;
    }

    if (emailError || phoneError) {
      return;
    }

    setSending(true);
    setFeedback({ type: '', text: '' });

    try {
      const payload = {
        infoType: form.infoType,
        fullName: form.fullName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\D/g, ''),
        guestCount: Number(form.guestCount || 0),
        message: form.message
      };
      const { data } = await client.post('/contact', payload);
      setFeedback({ type: 'success', text: data.message || 'Gửi liên hệ thành công.' });
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
      <Card className="contact-card border-0">
        <Card.Body>
          <h2 className="contact-title text-center">LIÊN HỆ</h2>
          <p className="contact-subtitle mb-4">
            Để có thể đáp ứng được các yêu cầu và đóng góp ý kiến của quý khách, xin vui lòng gửi thông tin
            hoặc gọi đến hotline các chi nhánh bên dưới để liên hệ một cách nhanh chóng.
          </p>

          {feedback.text && (
            <Alert variant={feedback.type} className="mb-4">
              {feedback.text}
            </Alert>
          )}

          <Row className="g-4">
            <Col lg={7}>
              <h4 className="contact-section-title">THÔNG TIN LIÊN LẠC</h4>
              <Form noValidate validated={validated} onSubmit={handleSubmit} className="contact-form-grid">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Loại thông tin *</Form.Label>
                      <Form.Select value={form.infoType} onChange={(e) => setField('infoType', e.target.value)}>
                        <option value="Du lịch">Du lịch</option>
                        <option value="Hợp tác">Hợp tác</option>
                        <option value="Khiếu nại">Khiếu nại</option>
                        <option value="Khác">Khác</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Họ tên *</Form.Label>
                      <Form.Control
                        value={form.fullName}
                        onChange={(e) => setField('fullName', e.target.value)}
                        placeholder="Liên hệ"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                        placeholder="Nhập email"
                        isInvalid={(validated || touched.email) && !!emailError}
                        required
                      />
                      <Form.Control.Feedback type="invalid">{emailError}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Điện thoại *</Form.Label>
                      <Form.Control
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                        placeholder="Nhập số điện thoại"
                        isInvalid={(validated || touched.phone) && !!phoneError}
                        required
                      />
                      <Form.Control.Feedback type="invalid">{phoneError}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Số khách</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={form.guestCount}
                        onChange={(e) => setField('guestCount', e.target.value)}
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Nội dung *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        value={form.message}
                        onChange={(e) => setField('message', e.target.value)}
                        placeholder="Nhập nội dung"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="d-flex justify-content-end">
                    <Button type="submit" disabled={sending}>
                      {sending ? 'Đang gửi...' : 'Gửi thông tin'}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Col>

            <Col lg={5}>
              <h4 className="contact-section-title">TRỤ SỞ</h4>
              <Card className="contact-branch-card">
                <Card.Body>
                  <div className="contact-branch-list mt-3">
                    <div className="contact-branch-item">
                      <h5>{hcmBranch.name}</h5>
                      <p>📍 {hcmBranch.address}</p>
                      <p>📞 Hotline: {hcmBranch.hotline}</p>
                      <p>✉️ Email: {hcmBranch.email}</p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ContactPage;
