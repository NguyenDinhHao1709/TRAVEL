import { Row, Col, Card } from 'react-bootstrap';

const AboutPage = () => {
  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0a2342 0%, #1a5276 60%, #117a8b 100%)',
        borderRadius: '16px',
        padding: '56px 48px',
        marginBottom: '40px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#7ec8e3', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            Về chúng tôi
          </p>
          <h1 style={{ fontWeight: 800, fontSize: '2.4rem', marginBottom: '16px' }}>
            HK2 Travel – Đồng hành mọi hành trình
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.85, maxWidth: '600px', lineHeight: 1.7 }}>
            Chúng tôi là công ty du lịch uy tín , chuyên cung cấp các tour du lịch trong nước chất lượng cao, giá cả hợp lý, phục vụ hàng nghìn khách hàng mỗi năm.
          </p>
        </div>
        <div style={{
          position: 'absolute', right: '-30px', top: '-30px',
          fontSize: '220px', opacity: 0.05, lineHeight: 1, userSelect: 'none',
        }}>✈</div>
      </div>

      {/* Số liệu nổi bật */}
  

      {/* Sứ mệnh & Tầm nhìn */}
      <Row className="g-4 mb-5">
        <Col md={6}>
          <Card body className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', borderLeft: '4px solid #0d6efd' }}>
            <h5 style={{ fontWeight: 700, color: '#0d6efd', marginBottom: '12px' }}>🎯 Sứ mệnh</h5>
            <p style={{ color: '#495057', lineHeight: 1.8 }}>
              Mang đến những trải nghiệm du lịch tuyệt vời, an toàn và đáng nhớ cho mọi du khách Việt Nam. Chúng tôi cam kết tạo ra những hành trình ý nghĩa với dịch vụ chuyên nghiệp, tận tâm từ đội ngũ hướng dẫn viên giàu kinh nghiệm.
            </p>
          </Card>
        </Col>
        <Col md={6}>
          <Card body className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', borderLeft: '4px solid #198754' }}>
            <h5 style={{ fontWeight: 700, color: '#198754', marginBottom: '12px' }}>🌟 Tầm nhìn</h5>
            <p style={{ color: '#495057', lineHeight: 1.8 }}>
              Trở thành thương hiệu du lịch nội địa hàng đầu Việt Nam vào năm 2030, tiên phong trong ứng dụng công nghệ số vào quản lý và đặt tour, góp phần quảng bá vẻ đẹp đất nước đến bạn bè trong và ngoài nước.
            </p>
          </Card>
        </Col>
      </Row>

      {/* Giá trị cốt lõi */}
      <h4 style={{ fontWeight: 700, marginBottom: '20px' }}>Giá trị cốt lõi</h4>
      <Row className="g-3 mb-5">
        {[
          { icon: '🤝', title: 'Uy tín', desc: 'Cam kết minh bạch, trung thực trong mọi giao dịch và dịch vụ.' },
          { icon: '💎', title: 'Chất lượng', desc: 'Không ngừng nâng cao chất lượng tour và dịch vụ khách hàng.' },
          { icon: '❤️', title: 'Tận tâm', desc: 'Đặt sự hài lòng của khách hàng là ưu tiên hàng đầu.' },
          { icon: '🚀', title: 'Đổi mới', desc: 'Ứng dụng công nghệ hiện đại để mang lại trải nghiệm tốt nhất.' },
        ].map((v) => (
          <Col xs={6} md={3} key={v.title}>
            <Card body className="h-100 text-center border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{v.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{v.title}</div>
              <div style={{ color: '#6c757d', fontSize: '0.88rem', lineHeight: 1.6 }}>{v.desc}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Liên hệ CTA */}
      <Card body className="text-center border-0" style={{
        background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
        borderRadius: '16px', color: '#fff', padding: '40px'
      }}>
        <h4 style={{ fontWeight: 700, marginBottom: '10px' }}>Sẵn sàng khám phá cùng HK2 Travel?</h4>
        <p style={{ opacity: 0.9, marginBottom: '20px' }}>Liên hệ ngay để được tư vấn tour phù hợp nhất cho bạn.</p>
        <a href="/contact" style={{
          display: 'inline-block', background: '#fff', color: '#0d6efd',
          fontWeight: 700, padding: '10px 32px', borderRadius: '8px', textDecoration: 'none'
        }}>Liên hệ tư vấn</a>
      </Card>
    </div>
  );
};

export default AboutPage;
