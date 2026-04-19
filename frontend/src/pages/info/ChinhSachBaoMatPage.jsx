import { Card, Badge } from 'react-bootstrap';

const SECTIONS = [
  {
    title: '1. Thông tin chúng tôi thu thập',
    content: `HK2 Travel thu thập các thông tin sau khi bạn sử dụng dịch vụ:
• Thông tin cá nhân: họ tên, số điện thoại, địa chỉ email, địa chỉ nhà.
• Thông tin thanh toán: được mã hóa và xử lý qua cổng thanh toán bảo mật, chúng tôi không lưu trữ thông tin thẻ của bạn.
• Thông tin kỹ thuật: địa chỉ IP, loại trình duyệt, trang bạn truy cập – dùng để cải thiện trải nghiệm dịch vụ.`,
  },
  {
    title: '2. Mục đích sử dụng thông tin',
    content: `Thông tin của bạn được sử dụng để:
• Xử lý và xác nhận các đơn đặt tour.
• Liên lạc về thông tin tour, lịch trình và chương trình khuyến mãi.
• Cải thiện chất lượng dịch vụ và nội dung trang web.
• Tuân thủ các nghĩa vụ pháp lý khi cần thiết.`,
  },
  {
    title: '3. Bảo mật thông tin',
    content: `Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin:
• Mã hóa dữ liệu truyền tải bằng SSL/TLS.
• Mật khẩu được lưu trữ dưới dạng mã hóa bcrypt.
• Kiểm soát truy cập nội bộ nghiêm ngặt.
• Không bán, cho thuê hoặc chia sẻ thông tin cá nhân với bên thứ ba vì mục đích thương mại.`,
  },
  {
    title: '4. Chia sẻ thông tin',
    content: `HK2 Travel chỉ chia sẻ thông tin của bạn trong các trường hợp:
• Đối tác cung cấp dịch vụ trực tiếp liên quan đến tour (khách sạn, hãng xe, hướng dẫn viên).
• Cơ quan nhà nước có thẩm quyền khi được yêu cầu hợp pháp.
• Bên thứ ba xử lý thanh toán (VNPay) theo chính sách bảo mật của họ.`,
  },
  {
    title: '5. Quyền của người dùng',
    content: `Bạn có quyền:
• Truy cập, chỉnh sửa thông tin cá nhân trong tài khoản của mình.
• Yêu cầu xóa tài khoản và dữ liệu cá nhân.
• Từ chối nhận email marketing bất kỳ lúc nào.
• Khiếu nại về việc xử lý dữ liệu tại địa chỉ email: hk2travel@gmail.com`,
  },
  {
    title: '6. Cookies',
    content: `Trang web sử dụng cookies để:
• Duy trì phiên đăng nhập.
• Ghi nhớ tùy chọn của bạn.
• Phân tích lưu lượng truy cập (Google Analytics).
Bạn có thể tắt cookies trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể bị ảnh hưởng.`,
  },
];

const ChinhSachBaoMatPage = () => (
  <div>
    <div style={{
      background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
      borderRadius: '16px', padding: '48px 40px', marginBottom: '40px', color: '#fff',
    }}>
      <Badge bg="danger" className="mb-3">Chính sách</Badge>
      <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '12px' }}>Chính sách bảo mật</h1>
      <p style={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.7 }}>
        HK2 Travel cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu.
      </p>
      <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: 0 }}>Cập nhật lần cuối: 01/01/2026</p>
    </div>

    {SECTIONS.map((s, i) => (
      <Card body key={i} className="border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
        <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#0a2342' }}>{s.title}</h6>
        <div style={{ color: '#495057', fontSize: '0.92rem', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
          {s.content}
        </div>
      </Card>
    ))}

    <Card body className="border-0 mt-4" style={{ background: '#e8f5e9', borderRadius: '12px' }}>
      <p style={{ color: '#2e7d32', marginBottom: 0, fontSize: '0.92rem' }}>
        📧 Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ: <strong>hk2travel@gmail.com</strong> hoặc gọi hotline <strong>0354162165</strong> (miễn phí).
      </p>
    </Card>
  </div>
);

export default ChinhSachBaoMatPage;
