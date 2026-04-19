import { Card, Badge } from 'react-bootstrap';

const SECTIONS = [
  {
    title: '1. Đặt cọc và hủy tour',
    content: `• Đặt cọc tối thiểu 30% tổng giá trị tour để giữ chỗ.
• Thanh toán toàn bộ trước ngày khởi hành ít nhất 3 ngày.
• Hủy trước 15 ngày: hoàn 80% tiền cọc.
• Hủy từ 7–14 ngày: hoàn 50% tiền cọc.
• Hủy dưới 7 ngày: không hoàn tiền cọc.
• HK2 Travel hủy tour do lý do bất khả kháng: hoàn 100% và không chịu thêm trách nhiệm.`,
  },
  {
    title: '2. Trách nhiệm của HK2 Travel',
    content: `• Cung cấp dịch vụ đúng theo chương trình tour đã công bố.
• Đảm bảo an toàn cho khách hàng trong suốt hành trình.
• Hỗ trợ khách hàng 24/7 trong trường hợp phát sinh sự cố.
• Thông báo kịp thời nếu có thay đổi về lịch trình hoặc dịch vụ.
• Chịu trách nhiệm bồi thường theo quy định pháp luật khi có lỗi từ phía công ty.`,
  },
  {
    title: '3. Trách nhiệm của khách hàng',
    content: `• Cung cấp thông tin cá nhân chính xác khi đặt tour.
• Có mặt đúng giờ tại điểm tập kết; trường hợp trễ không được hoàn tiền.
• Tuân thủ hướng dẫn của hướng dẫn viên trong suốt hành trình.
• Mang theo giấy tờ tùy thân hợp lệ (CMND/CCCD/Hộ chiếu).
• Tự chịu trách nhiệm về tài sản cá nhân.`,
  },
  {
    title: '4. Bảo hiểm du lịch',
    content: `• Tất cả tour đều bao gồm bảo hiểm tai nạn cơ bản với mức bồi thường tối đa 50 triệu đồng/người.
• Khách hàng có thể mua thêm gói bảo hiểm du lịch nâng cao tại văn phòng HK2 Travel.
• Bảo hiểm không áp dụng với các rủi ro do cố ý gây ra hoặc vi phạm pháp luật.`,
  },
  {
    title: '5. Giải quyết tranh chấp',
    content: `• Khiếu nại phải được gửi bằng văn bản trong vòng 15 ngày kể từ ngày kết thúc tour.
• HK2 Travel sẽ phản hồi trong 5 ngày làm việc.
• Tranh chấp không giải quyết được sẽ được đưa ra tòa án có thẩm quyền tại TP.HCM.`,
  },
  {
    title: '6. Quyền sở hữu nội dung',
    content: `• Toàn bộ nội dung trên website bao gồm văn bản, hình ảnh, video thuộc quyền sở hữu của HK2 Travel.
• Không được sao chép, phân phối nội dung mà không có sự cho phép bằng văn bản.
• Đánh giá và bình luận của khách hàng là tài sản của người viết nhưng HK2 Travel có quyền sử dụng cho mục đích quảng bá.`,
  },
];

const DieuKhoanChungPage = () => (
  <div>
    <div style={{
      background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
      borderRadius: '16px', padding: '48px 40px', marginBottom: '40px', color: '#fff',
    }}>
      <Badge bg="secondary" className="mb-3">Pháp lý</Badge>
      <h1 style={{ fontWeight: 800, fontSize: '2.2rem', marginBottom: '12px' }}>Điều khoản chung</h1>
      <p style={{ opacity: 0.85, fontSize: '1.05rem', maxWidth: '600px', lineHeight: 1.7 }}>
        Khi sử dụng dịch vụ của HK2 Travel, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây.
      </p>
      <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: 0 }}>Có hiệu lực từ: 01/01/2026</p>
    </div>

    {SECTIONS.map((s, i) => (
      <Card body key={i} className="border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
        <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#0a2342' }}>{s.title}</h6>
        <div style={{ color: '#495057', fontSize: '0.92rem', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
          {s.content}
        </div>
      </Card>
    ))}

    <Card body className="border-0 mt-4" style={{ background: '#e3f2fd', borderRadius: '12px' }}>
      <p style={{ color: '#1565c0', marginBottom: 0, fontSize: '0.92rem' }}>
        📄 Bản điều khoản đầy đủ có thể được yêu cầu tại văn phòng hoặc qua email: <strong>hk2travel@gmail.com</strong>
      </p>
    </Card>
  </div>
);

export default DieuKhoanChungPage;
