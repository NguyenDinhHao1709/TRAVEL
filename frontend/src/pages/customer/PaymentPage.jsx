import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import QRCode from 'react-qr-code';
import client from '../../api/client';

const PAYMENT_TIMEOUT_SECONDS = 5 * 60;
const POLL_INTERVAL_MS = 5000;

const BIN_TO_BANK = {
  '970422': 'MB Bank',
  '970418': 'BIDV',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970405': 'Agribank',
  '970454': 'TPBank',
  '970423': 'Techcombank',
  '970432': 'VPBank',
  '970448': 'OCB',
  '970426': 'MSB',
  '970403': 'Sacombank',
  '970441': 'VIB',
  '970449': 'LPBank',
  '970431': 'Eximbank',
  '970443': 'SHB',
  '970416': 'ACB',
  '970425': 'ABBank',
  '970438': 'BaoViet Bank',
  '970421': 'VRB',
  '970407': 'Techcombank',
};
const getBankName = (bin) => BIN_TO_BANK[String(bin)] || bin;

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN');
};

const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

const formatCountdown = (sec) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getSecondsLeft = (createdAt) => {
  if (!createdAt) return 0;
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  return Math.max(0, PAYMENT_TIMEOUT_SECONDS - elapsed);
};

const BOOKING_STATUS = {
  pending:   { label: 'Chờ thanh toán', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận',   variant: 'primary' },
  cancelled: { label: 'Đã hủy',        variant: 'danger' },
  completed: { label: 'Hoàn tất',      variant: 'success' },
};

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState('');

  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState('');
  const [tick, setTick] = useState(0);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  // Load booking info
  useEffect(() => {
    setBookingLoading(true);
    client.get('/bookings/my')
      .then(({ data }) => {
        const found = data.find((b) => String(b.id) === String(bookingId));
        if (!found) {
          setBookingError('Không tìm thấy đơn đặt tour.');
        } else {
          setBooking(found);
          if (found.payment_status === 'paid') setPaid(true);
        }
      })
      .catch(() => setBookingError('Không tải được thông tin đặt tour.'))
      .finally(() => setBookingLoading(false));
  }, [bookingId]);

  // Create/load QR when booking is ready and unpaid
  useEffect(() => {
    if (!booking || booking.payment_status === 'paid' || booking.booking_status === 'cancelled') return;
    setQrLoading(true);
    client.post('/payments/vietqr/create', { bookingId: Number(bookingId) })
      .then(({ data }) => setQrData(data))
      .catch((err) => {
        const msg = err.response?.data?.message || '';
        if (msg === 'Don da duoc thanh toan') {
          setPaid(true);
        } else {
          setQrError(msg || 'Không tải được thông tin thanh toán.');
        }
      })
      .finally(() => setQrLoading(false));
  }, [booking, bookingId]);

  // Poll payment status
  useEffect(() => {
    if (!booking || booking.payment_status === 'paid' || booking.booking_status === 'cancelled' || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await client.get(`/payments/status/${bookingId}`);
        if (data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(pollRef.current);
          setBooking((prev) => prev ? { ...prev, payment_status: 'paid', booking_status: 'confirmed' } : prev);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [booking, bookingId, paid]);

  // Countdown tick
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      await client.patch(`/bookings/my/${bookingId}/cancel`);
      clearInterval(pollRef.current);
      setBooking((prev) => prev ? { ...prev, booking_status: 'cancelled' } : prev);
      setCancelConfirm(false);
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Không thể hủy. Vui lòng thử lại.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (bookingLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Đang tải thông tin đặt tour...</p>
      </div>
    );
  }

  if (bookingError) {
    return (
      <Alert variant="danger" className="my-4">
        {bookingError}
        <div className="mt-3">
          <Button as={Link} to="/my-bookings" variant="outline-danger" size="sm">← Quay lại lịch sử</Button>
        </div>
      </Alert>
    );
  }

  const bs = BOOKING_STATUS[booking.booking_status] || { label: booking.booking_status, variant: 'secondary' };
  const secondsLeft = getSecondsLeft(booking.created_at);
  const isCancelled = booking.booking_status === 'cancelled';
  const canPay = !paid && !isCancelled && booking.payment_status !== 'paid';

  return (
    <div className="payment-page py-2">
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontSize: '0.875rem' }}>
        <Link to="/my-payments" className="text-decoration-none text-muted">← Thanh toán</Link>
        <span className="mx-2 text-muted">/</span>
        <span className="text-dark fw-semibold">Thanh toán #{bookingId}</span>
      </nav>

      {/* Success state */}
      {paid && (
        <div className="text-center py-5">
          <div style={{ fontSize: '5rem', lineHeight: 1, marginBottom: 16 }}>✅</div>
          <h3 className="text-success fw-bold">Thanh toán thành công!</h3>
          <p className="text-muted mt-2">Đơn đặt tour của bạn đã được xác nhận.<br />
            Chúng tôi sẽ gửi email xác nhận đến địa chỉ email của bạn.</p>
          <div className="d-flex justify-content-center gap-3 mt-4">
            <Button as={Link} to="/my-payments" variant="primary">💳 Xem thanh toán của tôi</Button>
            <Button as={Link} to="/tours" variant="outline-primary">🗺️ Khám phá tour khác</Button>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {!paid && isCancelled && (
        <Alert variant="danger" className="my-4">
          <Alert.Heading>❌ Đơn đặt tour đã bị hủy</Alert.Heading>
          <p className="mb-3">Đơn đặt này đã bị hủy và không thể thanh toán.</p>
          <Button as={Link} to="/my-payments" variant="outline-danger" size="sm">← Quày lại thanh toán</Button>
          <Button as={Link} to="/tours" variant="danger" size="sm" className="ms-2">Đặt tour mới →</Button>
        </Alert>
      )}

      {/* Active payment — show for any unpaid, non-cancelled booking */}
      {!paid && !isCancelled && (
        <Row className="g-4">
          {/* Left: Booking summary */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white fw-bold border-bottom py-3">
                📋 Thông tin đặt tour
              </Card.Header>
              <Card.Body>
                {/* Tour image + title */}
                {booking.image_url && (
                  <img src={booking.image_url} alt={booking.title}
                    style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
                )}
                <h5 className="fw-bold mb-2">{booking.title}</h5>

                <div className="d-flex flex-column gap-2" style={{ fontSize: '0.9rem' }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Mã đơn</span>
                    <span className="fw-semibold">#{booking.id}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Điểm đến</span>
                    <span className="fw-semibold">{booking.destination || '—'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Ngày đặt</span>
                    <span className="fw-semibold">
                      {booking.created_at
                        ? new Date(booking.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Lịch trình</span>
                    <span className="fw-semibold">{formatDate(booking.start_date)} → {formatDate(booking.end_date)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Số người</span>
                    <span className="fw-semibold">{booking.people_count} người</span>
                  </div>
                  <hr className="my-1" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted fw-semibold">Tổng thanh toán</span>
                    <span className="fw-bold fs-5" style={{ color: '#e65100' }}>{formatMoney(booking.total_amount)}</span>
                  </div>
                </div>

                {/* Countdown */}
                {canPay && secondsLeft > 0 && (
                  <div className={`mt-3 p-2 rounded text-center ${secondsLeft <= 60 ? 'bg-danger text-white' : 'bg-warning-subtle'}`}
                    style={{ fontSize: '0.875rem' }}>
                    ⏳ Thời gian còn lại để thanh toán:{' '}
                    <strong style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{formatCountdown(secondsLeft)}</strong>
                  </div>
                )}

                <Badge bg={bs.variant} className="mt-2">{bs.label}</Badge>
              </Card.Body>
            </Card>

            <div className="d-flex gap-2">
              <Button as={Link} to="/my-bookings" variant="outline-secondary" size="sm" className="flex-fill">
                ← Quay lại
              </Button>
              {!cancelConfirm ? (
                <Button variant="outline-danger" size="sm" className="flex-fill"
                  onClick={() => { setCancelConfirm(true); setCancelError(''); }}>
                  Hủy thanh toán
                </Button>
              ) : (
                <div className="flex-fill">
                  <div className="border border-danger rounded p-2" style={{ fontSize: '0.82rem', background: '#fff5f5' }}>
                    <div className="fw-semibold text-danger mb-1">Xác nhận hủy đơn #{bookingId}?</div>
                    {cancelError && <div className="text-danger mb-1">{cancelError}</div>}
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="danger" className="flex-fill" disabled={cancelLoading}
                        onClick={handleCancel}>
                        {cancelLoading ? <Spinner size="sm" animation="border" /> : 'Xác nhận hủy'}
                      </Button>
                      <Button size="sm" variant="outline-secondary" className="flex-fill" disabled={cancelLoading}
                        onClick={() => { setCancelConfirm(false); setCancelError(''); }}>
                        Không
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Right: Payment QR */}
          <Col lg={7}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold border-bottom py-3">
                💳 Thanh toán chuyển khoản ngân hàng
              </Card.Header>
              <Card.Body>
                {qrLoading && (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Đang tạo mã QR...</p>
                  </div>
                )}

                {qrError && <Alert variant="danger">{qrError}</Alert>}

                {!qrLoading && !qrError && qrData && (
                  <>
                    {/* QR Code */}
                    <div className="text-center mb-4">
                      {qrData.qrCode ? (
                        <div style={{ background: '#fff', padding: 16, borderRadius: 16, border: '2px solid #e3e8f0', display: 'inline-block' }}>
                          <QRCode value={qrData.qrCode} size={220} />
                        </div>
                      ) : (
                        <a href={qrData.checkoutUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-lg">
                          Mở trang thanh toán PayOS
                        </a>
                      )}
                      <p className="text-muted small mt-2 mb-1">Quét mã QR bằng app ngân hàng hoặc ví điện tử</p>
                    </div>

                    {/* Bank info */}
                    <div className="rounded-3 border p-3 mb-3" style={{ background: '#f8faff', fontSize: '0.9rem' }}>
                      <h6 className="fw-bold mb-3">Thông tin chuyển khoản</h6>
                      <Row className="g-2 align-items-center">
                        <Col xs={5} className="text-muted">Ngân hàng</Col>
                        <Col xs={7} className="fw-semibold">{getBankName(qrData.bankId)}</Col>

                        <Col xs={5} className="text-muted">Số tài khoản</Col>
                        <Col xs={7} className="d-flex align-items-center gap-2">
                          <span className="fw-bold">{qrData.accountNo}</span>
                          <Button size="sm" variant="outline-secondary" style={{ padding: '1px 8px', fontSize: '0.75rem' }}
                            onClick={() => copyText(qrData.accountNo, 'account')}>
                            {copied === 'account' ? '✓ Đã sao' : 'Sao chép'}
                          </Button>
                        </Col>

                        <Col xs={5} className="text-muted">Chủ tài khoản</Col>
                        <Col xs={7} className="fw-semibold">{qrData.accountName}</Col>

                        <Col xs={5} className="text-muted">Số tiền</Col>
                        <Col xs={7} className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-danger">{Number(qrData.amount).toLocaleString('vi-VN')} ₫</span>
                          <Button size="sm" variant="outline-secondary" style={{ padding: '1px 8px', fontSize: '0.75rem' }}
                            onClick={() => copyText(String(qrData.amount), 'amount')}>
                            {copied === 'amount' ? '✓ Đã sao' : 'Sao chép'}
                          </Button>
                        </Col>

                        <Col xs={5} className="text-muted">Nội dung CK</Col>
                        <Col xs={7} className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="fw-bold text-primary">{qrData.transferContent}</span>
                          <Button size="sm" variant="outline-secondary" style={{ padding: '1px 8px', fontSize: '0.75rem' }}
                            onClick={() => copyText(qrData.transferContent, 'content')}>
                            {copied === 'content' ? '✓ Đã sao' : 'Sao chép'}
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    <Alert variant="warning" className="mb-3 py-2" style={{ fontSize: '0.85rem' }}>
                      ⚠️ Vui lòng nhập <strong>đúng nội dung chuyển khoản</strong>{' '}
                      <code>{qrData.transferContent}</code> để hệ thống tự động xác nhận thanh toán.
                    </Alert>

                    <div className="text-center text-muted" style={{ fontSize: '0.875rem' }}>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang chờ xác nhận thanh toán tự động...
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
