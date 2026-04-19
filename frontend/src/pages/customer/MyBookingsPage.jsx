import { useEffect, useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import client from '../../api/client';

const PAYMENT_TIMEOUT_SECONDS = 5 * 60;

const getSecondsLeft = (createdAt) => {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - createdTime) / 1000);
  return Math.max(0, PAYMENT_TIMEOUT_SECONDS - elapsedSeconds);
};

const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  const bookingStatusLabel = {
    pending: 'Chờ thanh toán',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
    completed: 'Hoàn tất'
  };

  const paymentStatusLabel = {
    unpaid: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền'
  };

  const loadBookings = async () => {
    const { data } = await client.get('/bookings/my');
    setBookings(data);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasExpiredPending = bookings.some(
      (booking) => booking.booking_status === 'pending' && booking.payment_status === 'unpaid' && getSecondsLeft(booking.created_at) === 0
    );

    if (!hasExpiredPending) return;

    const timeout = setTimeout(() => {
      loadBookings();
      setMessage('Đơn quá hạn 5 phút chưa thanh toán đã được tự động hủy và hoàn lại số chỗ.');
    }, 600);

    return () => clearTimeout(timeout);
  }, [bookings, tick]);

  const payWithVNPay = async (bookingId) => {
    try {
      const { data } = await client.post('/payments/vnpay/create-url', { bookingId });
      window.location.href = data.paymentUrl;
    } catch (error) {
      if (!error.response) {
        setMessage('Không kết nối được backend. Vui lòng kiểm tra server API đang chạy ở cổng 5000.');
        return;
      }

      setMessage(error.response?.data?.message || 'Tạo URL thanh toán thất bại');
    }
  };

  const devSimulatePayment = async (bookingId) => {
    try {
      await client.post(`/payments/dev-simulate/${bookingId}`);
      setMessage('[DEV] Giả lập thanh toán thành công!');
      loadBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Giả lập thanh toán thất bại');
    }
  };

  const isDev = import.meta.env.DEV;


  const cancel = async (bookingId) => {
    try {
      await client.patch(`/bookings/my/${bookingId}/cancel`);
      setMessage('Đã hủy đặt tour');
      loadBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Hủy thất bại');
    }
  };

  return (
    <>
      <h3 className="mb-3">Đặt tour của tôi</h3>
      {message && <Alert variant="info">{message}</Alert>}
      {bookings.map((booking) => (
        <Card key={booking.id} className="mb-2">
          <Card.Body>
            {booking.booking_status === 'pending' && booking.payment_status === 'unpaid' && (
              <Alert variant={getSecondsLeft(booking.created_at) <= 60 ? 'warning' : 'info'}>
                Thanh toán trong vòng 5 phút để giữ chỗ. Còn lại: <strong>{formatCountdown(getSecondsLeft(booking.created_at))}</strong>
              </Alert>
            )}

            <h5>{booking.title}</h5>
            <p>Ngày đi: {formatDate(booking.start_date) || formatDate(booking.departure_date)}</p>
            <p>Ngày kết thúc: {formatDate(booking.end_date) || 'Chưa cập nhật'}</p>
            <p>Số người: {booking.people_count}</p>
            <p>Tổng tiền: {Number(booking.total_amount).toLocaleString()} VND</p>
            <p>Trạng thái đặt tour: {bookingStatusLabel[booking.booking_status] || booking.booking_status}</p>
            <p>Trạng thái thanh toán: {paymentStatusLabel[booking.payment_status] || booking.payment_status}</p>

            {booking.payment_status === 'unpaid' && booking.booking_status !== 'cancelled' && (
              <>
                <Button className="me-2" onClick={() => payWithVNPay(booking.id)}>Thanh toán VNPAY</Button>
                {isDev && (
                  <Button variant="success" className="me-2" onClick={() => devSimulatePayment(booking.id)}>[DEV] Giả lập thanh toán</Button>
                )}
                {booking.booking_status === 'pending' && (
                  <Button variant="outline-danger" onClick={() => cancel(booking.id)}>Hủy đặt tour</Button>
                )}
              </>
            )}

            {booking.payment_status === 'paid' && (
              <Alert variant="secondary" className="mt-2 mb-2">
                Đơn đã thanh toán online và xác nhận tự động. Nếu cần hủy, vui lòng liên hệ hỗ trợ để xử lý hoàn tiền.
              </Alert>
            )}

            {booking.booking_status !== 'cancelled'
              && booking.booking_status !== 'completed'
              && booking.payment_status !== 'paid'
              && !(booking.booking_status === 'pending' && booking.payment_status === 'unpaid') && (
              <Button variant="outline-danger" onClick={() => cancel(booking.id)}>Hủy đặt tour</Button>
            )}
          </Card.Body>
        </Card>
      ))}
    </>
  );
};

export default MyBookingsPage;
