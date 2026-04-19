import { Card, Row, Col, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    cat: 'Đặt tour',
    color: '#0d6efd',
    bg: '#e8f4fd',
    items: [
      {
        q: 'Tôi cần đặt tour trước bao lâu?',
        a: 'Bạn nên đặt tour trước ít nhất 3 ngày so với ngày khởi hành. Với các tour có số lượng hạn chế hoặc tour dịp lễ Tết, chúng tôi khuyến nghị đặt trước 2–4 tuần để đảm bảo có chỗ.',
      },
      {
        q: 'Tôi có thể thay đổi ngày khởi hành không?',
        a: 'Có thể, nhưng phụ thuộc vào lịch chạy tour và chỗ còn trống. Vui lòng liên hệ hotline trước ngày khởi hành ít nhất 5 ngày để được hỗ trợ.',
      },
      {
        q: 'Tour có tổ chức theo nhóm hay cá nhân?',
        a: 'Hầu hết các tour của HK2 Travel là tour ghép nhóm. Tuy nhiên, chúng tôi cũng cung cấp dịch vụ tour riêng (private tour) theo yêu cầu với mức giá ưu đãi cho đoàn từ 10 người trở lên.',
      },
    ],
  },
  {
    cat: 'Thanh toán & Hoàn tiền',
    color: '#198754',
    bg: '#e8f5e9',
    items: [
      {
        q: 'Tôi cần đặt cọc bao nhiêu?',
        a: 'Mức đặt cọc tối thiểu là 30% tổng giá trị tour để giữ chỗ. Số tiền còn lại phải được thanh toán đầy đủ trước ngày khởi hành ít nhất 3 ngày.',
      },
      {
        q: 'Nếu tôi hủy tour, tôi có được hoàn tiền không?',
        a: 'Chính sách hoàn tiền phụ thuộc vào thời gian hủy: hủy trước 15 ngày hoàn 80%, hủy 7–14 ngày hoàn 50%, hủy dưới 7 ngày không hoàn tiền. Xem thêm tại Điều khoản chung.',
      },
      {
        q: 'Phương thức thanh toán nào được chấp nhận?',
        a: 'HK2 Travel chấp nhận: VNPay (thẻ ATM, Visa/Mastercard, QR Code), chuyển khoản ngân hàng, và thanh toán tiền mặt tại văn phòng.',
      },
    ],
  },
  {
    cat: 'Dịch vụ & Hành trình',
    color: '#fd7e14',
    bg: '#fff3e0',
    items: [
      {
        q: 'Giá tour đã bao gồm những gì?',
        a: 'Giá tour thường bao gồm: xe đưa đón, hướng dẫn viên, vé tham quan, ăn theo chương trình và bảo hiểm tai nạn. Chi tiết xem trong phần mô tả từng tour.',
      },
      {
        q: 'Trẻ em dưới mấy tuổi được đi miễn phí?',
        a: 'Trẻ em dưới 2 tuổi được miễn phí (không tính chỗ ngồi riêng). Trẻ từ 2–11 tuổi được giảm 50% giá tour. Từ 12 tuổi trở lên tính giá người lớn.',
      },
      {
        q: 'Tour có thể thay đổi lịch trình không?',
        a: 'Lịch trình có thể điều chỉnh do điều kiện thời tiết hoặc bất khả kháng. HK2 Travel sẽ thông báo sớm nhất có thể và đảm bảo chất lượng dịch vụ không đổi.',
      },
    ],
  },
  {
    cat: 'Tài khoản & Kỹ thuật',
    color: '#6f42c1',
    bg: '#f3e5f5',
    items: [
      {
        q: 'Làm sao để theo dõi trạng thái đặt tour?',
        a: 'Sau khi đăng nhập, vào mục "Đặt tour của tôi" để xem toàn bộ lịch sử và trạng thái các đơn đặt tour của bạn.',
      },
      {
        q: 'Tôi quên mật khẩu thì phải làm gì?',
        a: 'Nhấp vào "Quên mật khẩu" ở trang đăng nhập. Hệ thống sẽ gửi link đặt lại mật khẩu về email đã đăng ký của bạn.',
      },
    ],
  },
];

const CauHoiThuongGapPage = () => (
  <div>
    <div style={{
      background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
      borderRadius: '16px', padding: '48px 40px', marginBottom: '40px', color: '#fff',
    }}>
      <Badge bg="info" className="mb-3">FAQ</Badge>
      <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '12px' }}>Câu hỏi thường gặp</h1>
      <p style={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7 }}>
        Tìm câu trả lời nhanh cho các thắc mắc phổ biến nhất khi sử dụng dịch vụ HK2 Travel.
      </p>
    </div>

    {FAQS.map((cat) => (
      <div key={cat.cat} className="mb-5">
        <h5 style={{ fontWeight: 700, marginBottom: '16px', color: cat.color }}>
          {cat.cat}
        </h5>
        <Row className="g-3">
          {cat.items.map((faq, i) => (
            <Col md={12} key={i}>
              <Card body className="border-0 shadow-sm" style={{ borderRadius: '12px', borderLeft: `4px solid ${cat.color}` }}>
                <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '0.97rem' }}>❓ {faq.q}</div>
                <div style={{ color: '#495057', fontSize: '0.9rem', lineHeight: 1.8 }}>{faq.a}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    ))}

    <Card body className="border-0 text-center" style={{
      background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
      borderRadius: '16px', color: '#fff', padding: '32px',
    }}>
      <h5 style={{ fontWeight: 700, marginBottom: '8px' }}>Không tìm thấy câu trả lời?</h5>
      <p style={{ opacity: 0.9, marginBottom: '16px' }}>Hãy liên hệ trực tiếp với đội ngũ hỗ trợ của chúng tôi.</p>
      <Link to="/contact" style={{
        display: 'inline-block', background: '#fff', color: '#0d6efd',
        fontWeight: 700, padding: '10px 32px', borderRadius: '8px', textDecoration: 'none',
      }}>Liên hệ ngay</Link>
    </Card>
  </div>
);

export default CauHoiThuongGapPage;
