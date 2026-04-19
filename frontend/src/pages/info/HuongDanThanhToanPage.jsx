import { Card, Row, Col, Badge, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HuongDanThanhToanPage = () => (
  <div>
    {/* Header */}
    <div style={{
      background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
      borderRadius: '16px', padding: '48px 40px', marginBottom: '40px', color: '#fff',
    }}>
      <Badge bg="success" className="mb-3">Thanh toán</Badge>
      <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '12px' }}>Hướng dẫn thanh toán</h1>
      <p style={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7 }}>
        HK2 Travel hỗ trợ nhiều phương thức thanh toán tiện lợi, an toàn và nhanh chóng.
      </p>
    </div>

    {/* Payment methods */}
    <h5 style={{ fontWeight: 700, marginBottom: '20px' }}>Các phương thức thanh toán</h5>
    <Row className="g-3 mb-5">
      {[
        {
          icon: '💳', title: 'VNPay',
          desc: 'Thanh toán trực tuyến qua cổng VNPay với thẻ ATM nội địa, thẻ Visa/Mastercard hoặc quét mã QR. Tiền được ghi nhận ngay lập tức.',
          color: '#e8f5e9', border: '#198754',
        },
        {
          icon: '🏦', title: 'Chuyển khoản ngân hàng',
          desc: 'Chuyển khoản đến tài khoản công ty. Đơn đặt tour sẽ được xác nhận sau khi HK2 Travel nhận được thanh toán (tối đa 2 giờ làm việc).',
          color: '#e3f2fd', border: '#0d6efd',
        },
        {
          icon: '🏢', title: 'Thanh toán tại văn phòng',
          desc: 'Đến trực tiếp văn phòng HK2 Travel để thanh toán tiền mặt hoặc quẹt thẻ. Nhận hóa đơn và xác nhận đặt tour ngay tại chỗ.',
          color: '#fff3e0', border: '#fd7e14',
        },
      ].map((m) => (
        <Col md={4} key={m.title}>
          <Card body className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', borderTop: `4px solid ${m.border}`, background: m.color }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{m.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>{m.title}</div>
            <div style={{ color: '#495057', fontSize: '0.9rem', lineHeight: 1.7 }}>{m.desc}</div>
          </Card>
        </Col>
      ))}
    </Row>

    {/* Bank info */}
    <h5 style={{ fontWeight: 700, marginBottom: '16px' }}>Thông tin tài khoản ngân hàng</h5>
    <Card body className="border-0 shadow-sm mb-5" style={{ borderRadius: '12px' }}>
      <Table borderless className="mb-0" style={{ fontSize: '0.95rem' }}>
        <tbody>
          <tr><td style={{ color: '#6c757d', width: '200px' }}>Ngân hàng</td><td style={{ fontWeight: 600 }}>MBBANK</td></tr>
          <tr><td style={{ color: '#6c757d' }}>Số tài khoản</td><td style={{ fontWeight: 600, color: '#0d6efd' }}>2729999996789</td></tr>
          <tr><td style={{ color: '#6c757d' }}>Chủ tài khoản</td><td style={{ fontWeight: 600 }}>CÔNG TY DU LỊCH HK2 TRAVEL</td></tr>
          <tr><td style={{ color: '#6c757d' }}>Nội dung CK</td><td style={{ fontWeight: 600 }}>HK2 – [Mã booking] – [Họ tên]</td></tr>
        </tbody>
      </Table>
    </Card>

    {/* Notes */}
    <Card body className="border-0 mb-4" style={{ background: '#fff8e1', borderRadius: '12px', borderLeft: '4px solid #ffc107' }}>
      <h6 style={{ fontWeight: 700, color: '#856404', marginBottom: '10px' }}>⚠️ Lưu ý khi thanh toán</h6>
      <ul style={{ color: '#6c757d', lineHeight: 2, marginBottom: 0 }}>
        <li>Ghi đúng nội dung chuyển khoản để hệ thống tự động xác nhận.</li>
        <li>Thanh toán VNPay được bảo mật theo chuẩn PCI DSS.</li>
        <li>Liên hệ hỗ trợ nếu giao dịch bị lỗi hoặc chưa được xác nhận sau 2 giờ.</li>
        <li>Giữ lại biên lai/ảnh chụp màn hình thanh toán để đối chiếu khi cần.</li>
      </ul>
    </Card>

    <div className="text-center">
      <Link to="/contact" style={{
        display: 'inline-block', background: '#0d6efd', color: '#fff',
        fontWeight: 700, padding: '12px 36px', borderRadius: '8px', textDecoration: 'none',
      }}>Liên hệ hỗ trợ thanh toán</Link>
    </div>
  </div>
);

export default HuongDanThanhToanPage;
