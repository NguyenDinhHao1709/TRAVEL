import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Alert, Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import client from '../../api/client';

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(searchParams);
        const isMoMoReturn = Boolean(params.partnerCode && params.orderId);
        const endpoint = isMoMoReturn ? '/payments/momo/return' : '/payments/vnpay/return';
        const { data } = await client.get(endpoint, { params });
        setResult(data);
      } catch (error) {
        setResult({ success: false, message: error.response?.data?.message || 'Xác minh thanh toán thất bại' });
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (!result) {
    return (
      <Card className="mx-auto" style={{ maxWidth: 760 }}>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <h4 className="mt-3 mb-2">Đang xác minh giao dịch</h4>
          <p className="text-muted mb-0">Hệ thống đang kiểm tra kết quả thanh toán từ VNPay.</p>
        </Card.Body>
      </Card>
    );
  }

  const isSuccess = Boolean(result.success);

  return (
    <Card className="mx-auto" style={{ maxWidth: 820 }}>
      <Card.Body className="p-4 p-md-5">
        <div className="text-center mb-4">
          <div style={{ fontSize: '3rem', lineHeight: 1 }}>
            {isSuccess ? '✓' : '!'}
          </div>
          <h3 className={isSuccess ? 'text-success mt-2' : 'text-danger mt-2'}>
            {isSuccess ? 'Thanh toán thành công' : 'Thanh toán không thành công'}
          </h3>
          <p className="text-muted mb-0">
            {isSuccess
              ? 'Đơn đặt tour của bạn đã được ghi nhận và cập nhật trạng thái thanh toán.'
              : 'Giao dịch chưa hoàn tất. Bạn có thể kiểm tra lại thông tin và thực hiện lại nếu cần.'}
          </p>
        </div>

        <Alert variant={isSuccess ? 'success' : 'danger'} className="mb-4">
          {result.message}
        </Alert>

        <Row className="g-3 mb-4">
          <Col md={6}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body>
                <small className="text-muted d-block mb-1">Mã đơn đặt tour</small>
                <div className="fw-semibold">#{result.bookingId || '--'}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body>
                <small className="text-muted d-block mb-1">Số tiền</small>
                <div className="fw-semibold">{Number(result.amount || 0).toLocaleString()} VND</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body>
                <small className="text-muted d-block mb-1">Mã phản hồi VNPay</small>
                <div className="fw-semibold">{result.responseCode || '--'}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body>
                <small className="text-muted d-block mb-1">Mã giao dịch</small>
                <div className="fw-semibold">{result.transactionCode || '--'}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center">
          <Badge bg={isSuccess ? 'success' : 'danger'} className="px-3 py-2">
            {isSuccess ? 'Đã xác nhận thanh toán' : 'Cần thanh toán lại'}
          </Badge>
        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-center mt-4">
          <Button as={Link} to="/my-bookings">Xem đơn đặt tour của tôi</Button>
          {!isSuccess && <Button as={Link} to="/" variant="outline-secondary">Quay về trang chủ</Button>}
        </div>
      </Card.Body>
    </Card>
  );
};

export default PaymentReturnPage;
