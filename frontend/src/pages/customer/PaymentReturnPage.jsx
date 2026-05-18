import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';

// Trang này không còn dùng cho VNPAY callback.
// Thanh toán chuyển khoản được xác nhận trực tiếp trong modal VietQR tại /my-bookings.
const PaymentReturnPage = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/my-bookings', { replace: true }); }, [navigate]);
  return (
    <div className="text-center py-5">
      <Spinner animation="border" />
      <p className="mt-3 text-muted">Đang chuyển hướng...</p>
    </div>
  );
};

export default PaymentReturnPage;

