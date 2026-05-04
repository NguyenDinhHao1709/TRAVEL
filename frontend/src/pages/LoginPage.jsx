import { useState } from 'react';
import { Card, Button, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', otpCode: '', newPassword: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotInfo, setForgotInfo] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValue = String(form.email || '').trim();
  const showEmailError = emailValue.length > 0 && !isValidEmail(emailValue);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!isValidEmail(form.email)) {
      setError('Email không đúng định dạng');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setForgotInfo('');

    if (!isValidEmail(forgotForm.email)) {
      setError('Email không đúng định dạng');
      return;
    }

    try {
      setLoading(true);
      if (!forgotOtpSent) {
        const { data } = await client.post('/auth/forgot-password/request-otp', {
          email: forgotForm.email.trim()
        });
        setResetToken(data.resetToken);
        setForgotOtpSent(true);
        setForgotInfo('Mã OTP đặt lại mật khẩu đã được gửi về email của bạn.');
        return;
      }

      if (!forgotForm.otpCode.trim()) {
        setError('Vui lòng nhập mã OTP');
        return;
      }

      if (!forgotForm.newPassword || String(forgotForm.newPassword).length < 6) {
        setError('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

      if (forgotForm.newPassword !== forgotForm.confirmPassword) {
        setError('Nhập lại mật khẩu mới không khớp');
        return;
      }

      const { data } = await client.post('/auth/forgot-password/reset', {
        resetToken,
        otpCode: forgotForm.otpCode.trim(),
        newPassword: forgotForm.newPassword
      });

      setForgotInfo(data.message || 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại');
      setForgotMode(false);
      setForgotOtpSent(false);
      setResetToken('');
      setForgotForm({ email: forgotForm.email, otpCode: '', newPassword: '', confirmPassword: '' });
      setForm((prev) => ({ ...prev, email: forgotForm.email, password: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xử lý quên mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const onForgotResendOtp = async () => {
    try {
      setError('');
      setForgotInfo('');
      setLoading(true);
      const { data } = await client.post('/auth/forgot-password/request-otp', {
        email: forgotForm.email.trim()
      });
      setResetToken(data.resetToken);
      setForgotInfo('Đã gửi lại mã OTP đặt lại mật khẩu về email của bạn.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại OTP');
    } finally {
      setLoading(false);
    }
  };

  const switchToForgotMode = () => {
    setError('');
    setForgotInfo('');
    setForgotMode(true);
    setForgotOtpSent(false);
    setResetToken('');
    setForgotForm({
      email: form.email || '',
      otpCode: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const switchToLoginMode = () => {
    setError('');
    setForgotInfo('');
    setForgotMode(false);
  };

  return (
    <Card className="mx-auto" style={{ maxWidth: 480 }}>
      <Card.Body>
        <h4 className="mb-3">{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        {forgotInfo && <Alert variant="success">{forgotInfo}</Alert>}

        {!forgotMode ? (
          <Form onSubmit={onSubmit}>
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
            <div className="d-flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading && <Spinner animation="border" size="sm" className="me-1" />}
                Đăng nhập
              </Button>
              <Button type="button" variant="link" className="px-0" onClick={switchToForgotMode}>
                Quên mật khẩu?
              </Button>
            </div>
          </Form>
        ) : (
          <Form onSubmit={onForgotSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={forgotForm.email}
                onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                required
              />
            </Form.Group>

            {forgotOtpSent && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Mã OTP</Form.Label>
                  <Form.Control
                    value={forgotForm.otpCode}
                    onChange={(e) => setForgotForm({ ...forgotForm, otpCode: e.target.value })}
                    placeholder="Nhập mã OTP từ email"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu mới</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showNewPw ? 'text' : 'password'}
                      value={forgotForm.newPassword}
                      onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                      required
                    />
                    <Button variant="outline-secondary" onClick={() => setShowNewPw(!showNewPw)} tabIndex={-1} style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                      {showNewPw ? '🙈' : '👁️'}
                    </Button>
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nhập lại mật khẩu mới</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showConfirmPw ? 'text' : 'password'}
                      value={forgotForm.confirmPassword}
                      onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                      required
                    />
                    <Button variant="outline-secondary" onClick={() => setShowConfirmPw(!showConfirmPw)} tabIndex={-1} style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                      {showConfirmPw ? '🙈' : '👁️'}
                    </Button>
                  </InputGroup>
                </Form.Group>
              </>
            )}

            <div className="d-flex gap-2 flex-wrap">
              <Button type="submit" disabled={loading}>
                {loading && <Spinner animation="border" size="sm" className="me-1" />}
                {forgotOtpSent ? 'Xác nhận OTP & đổi mật khẩu' : 'Gửi mã OTP'}
              </Button>
              {forgotOtpSent && (
                <Button type="button" variant="outline-secondary" onClick={onForgotResendOtp} disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Gửi lại OTP'}
                </Button>
              )}
              <Button type="button" variant="link" className="px-0" onClick={switchToLoginMode}>
                Quay lại đăng nhập
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default LoginPage;
