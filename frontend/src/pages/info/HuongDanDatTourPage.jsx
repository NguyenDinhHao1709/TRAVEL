import { Card, Row, Col, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    num: '01',
    icon: '🔍',
    title: 'Tìm kiếm tour',
    desc: 'Truy cập trang Danh sách tour, dùng bộ lọc để tìm tour theo điểm đến, ngày khởi hành, số người và mức giá phù hợp với nhu cầu của bạn.',
  },
  {
    num: '02',
    icon: '📋',
    title: 'Xem chi tiết tour',
    desc: 'Nhấp vào tour bạn quan tâm để xem đầy đủ thông tin: lịch trình, điểm tham quan, dịch vụ bao gồm, giá cả và đánh giá từ khách hàng trước.',
  },
  {
    num: '03',
    icon: '👤',
    title: 'Đăng ký / Đăng nhập',
    desc: 'Để đặt tour bạn cần có tài khoản. Nếu chưa có, hãy đăng ký miễn phí. Nếu đã có tài khoản, đăng nhập để tiếp tục.',
  },
  {
    num: '04',
    icon: '📝',
    title: 'Điền thông tin đặt tour',
    desc: 'Chọn ngày khởi hành, số lượng người lớn và trẻ em. Kiểm tra lại thông tin cá nhân và yêu cầu đặc biệt (nếu có) trước khi xác nhận.',
  },
  {
    num: '05',
    icon: '💳',
    title: 'Thanh toán',
    desc: 'Chọn phương thức thanh toán phù hợp: VNPay, chuyển khoản ngân hàng, hoặc thanh toán trực tiếp tại văn phòng. Hoàn tất thanh toán để xác nhận chỗ.',
  },
  {
    num: '06',
    icon: '✅',
    title: 'Nhận xác nhận',
    desc: 'Sau khi thanh toán thành công, bạn sẽ nhận email xác nhận đặt tour kèm mã booking. Lưu lại mã này để theo dõi trạng thái tour của bạn.',
  },
];

const HuongDanDatTourPage = () => (
  <div>
    {/* Header */}
    <div style={{
      background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
      borderRadius: '16px', padding: '48px 40px', marginBottom: '40px', color: '#fff',
    }}>
      <Badge bg="warning" text="dark" className="mb-3">Hướng dẫn</Badge>
      <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '12px' }}>Hướng dẫn đặt tour</h1>
      <p style={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7 }}>
        Chỉ vài bước đơn giản, bạn đã có thể sở hữu một chuyến du lịch tuyệt vời cùng HK2 Travel.
      </p>
    </div>

    {/* Steps */}
    <Row className="g-4 mb-5">
      {STEPS.map((step) => (
        <Col md={6} key={step.num}>
          <Card body className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '48px', height: '48px', borderRadius: '12px',
                background: '#e8f4fd', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.5rem',
              }}>{step.icon}</div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d6efd', marginBottom: '4px', letterSpacing: '1px' }}>
                  BƯỚC {step.num}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>{step.title}</div>
                <div style={{ color: '#6c757d', fontSize: '0.9rem', lineHeight: 1.7 }}>{step.desc}</div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>

    {/* Notes */}
    <Card body className="border-0 mb-4" style={{ background: '#fff8e1', borderRadius: '12px', borderLeft: '4px solid #ffc107' }}>
      <h6 style={{ fontWeight: 700, color: '#856404', marginBottom: '10px' }}>⚠️ Lưu ý quan trọng</h6>
      <ul style={{ color: '#6c757d', lineHeight: 2, marginBottom: 0 }}>
        <li>Vui lòng đặt tour trước ngày khởi hành ít nhất <strong>3 ngày</strong>.</li>
        <li>Trẻ em dưới 2 tuổi miễn phí, từ 2–11 tuổi giảm 50% giá tour.</li>
        <li>Giá tour đã bao gồm VAT và các chi phí theo chương trình.</li>
        <li>Liên hệ hotline <strong>0354162165</strong> nếu cần hỗ trợ thêm.</li>
      </ul>
    </Card>

    {/* CTA */}
    <div className="text-center">
      <Link to="/" style={{
        display: 'inline-block', background: '#0d6efd', color: '#fff',
        fontWeight: 700, padding: '12px 36px', borderRadius: '8px', textDecoration: 'none',
      }}>Xem danh sách tour ngay</Link>
    </div>
  </div>
);

export default HuongDanDatTourPage;
