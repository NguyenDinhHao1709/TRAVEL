import { useState } from 'react';
import { Card, Button, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const normalizeFullName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isValidFullName = (value) => /^[\p{L}\s]+$/u.test(normalizeFullName(value));

const RegisterPage = () => {
  const { register, requestRegisterOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [registerToken, setRegisterToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValue = String(form.email || '').trim();
  const fullNameValue = normalizeFullName(form.fullName);
  const showFullNameError = fullNameValue.length > 0 && !isValidFullName(fullNameValue);
  const showEmailError = emailValue.length > 0 && !isValidEmail(emailValue);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!isValidEmail(form.email)) {
      setError('Email không đúng định dạng');
      return;
    }

    if (!isValidFullName(form.fullName)) {
      setError('Họ tên chỉ được chứa chữ cái và khoảng trắng');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    try {
      setLoading(true);
      if (!otpSent) {
        const result = await requestRegisterOtp(form.fullName, form.email, form.password);
        setRegisterToken(result.registerToken);
        setOtpSent(true);
        setInfo('Mã OTP đã được gửi về Gmail. Vui lòng nhập mã để hoàn tất đăng ký.');
        return;
      }

      if (!otpCode.trim()) {
        setError('Vui lòng nhập mã OTP đã gửi về email');
        return;
      }

      await register(registerToken, otpCode.trim());
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    try {
      setError('');
      setInfo('');
      setLoading(true);
      const result = await requestRegisterOtp(form.fullName, form.email, form.password);
      setRegisterToken(result.registerToken);
      setInfo('Đã gửi lại mã OTP mới về Gmail của bạn.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    setForm({ fullName: '', email: '', password: '', confirmPassword: '' });
    setRegisterToken('');
    setOtpCode('');
    setOtpSent(false);
    setInfo('');
    setError('');
    navigate('/login');
  };

  return (
    <Card className="mx-auto" style={{ maxWidth: 480 }}>
      <Card.Body>
        <h4 className="mb-3">Đăng ký</h4>
        {info && <Alert variant="success">{info}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Họ tên</Form.Label>
            <Form.Control
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              isInvalid={showFullNameError}
              required
            />
            <Form.Control.Feedback type="invalid">Họ tên không được chứa số hoặc ký tự đặc biệt</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              isInvalid={showEmailError}
              required
            />
            <Form.Control.Feedback type="invalid">Email không đúng định dạng</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <Button variant="outline-secondary" onClick={() => setShowPw(!showPw)} tabIndex={-1} style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                {showPw ? '🙈' : '👁️'}
              </Button>
            </InputGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nhập lại mật khẩu</Form.Label>
            <InputGroup>
              <Form.Control
                type={showConfirmPw ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
              <Button variant="outline-secondary" onClick={() => setShowConfirmPw(!showConfirmPw)} tabIndex={-1} style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                {showConfirmPw ? '🙈' : '👁️'}
              </Button>
            </InputGroup>
          </Form.Group>

          {otpSent && (
            <Form.Group className="mb-3">
              <Form.Label>Mã OTP xác nhận email</Form.Label>
              <Form.Control
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Nhập 6 số OTP"
                required
              />
            </Form.Group>
          )}

          <div className="d-flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner animation="border" size="sm" className="me-1" />}
              {otpSent ? 'Xác nhận OTP & đăng ký' : 'Gửi mã OTP'}
            </Button>
            {otpSent && (
              <Button type="button" variant="outline-secondary" onClick={onResendOtp} disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Gửi lại OTP'}
              </Button>
            )}
            <Button type="button" variant="outline-danger" onClick={onCancel}>
              Hủy
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default RegisterPage;
