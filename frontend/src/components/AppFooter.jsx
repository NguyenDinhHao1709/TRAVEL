import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const AppFooter = () => {
  return (
    <footer className="app-footer mt-auto">
      <Container>
        <Row className="g-4 app-footer-grid">
          {/* Cột 1: Công ty */}
          <Col lg={3} md={6}>
            <h6 className="footer-title">Công ty</h6>
            <p className="mb-1 fw-semibold" style={{ color: '#fff' }}>HK2 Travel</p>
            <p className="footer-sub mb-2">Giải pháp quản lý và đặt tour chuyên nghiệp</p>
            <p className="footer-sub mb-0" style={{ fontSize: '0.82rem' }}>
              📍 12 Nguyễn Văn Bảo, P. Hạnh Thông, TPHCM
            </p>
            <p className="footer-sub mb-0" style={{ fontSize: '0.82rem' }}>
              🕐 08:00 – 17:30 (Thứ 2 – Thứ 7)
            </p>
          </Col>

          {/* Cột 2: Hỗ trợ khách hàng */}
          <Col lg={3} md={6}>
            <h6 className="footer-title">Hỗ trợ khách hàng</h6>
            <ul className="footer-link-list mb-0">
              <li><Link to="/huong-dan-dat-tour">Hướng dẫn đặt tour</Link></li>
              <li><Link to="/huong-dan-thanh-toan">Hướng dẫn thanh toán</Link></li>
              <li><Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link></li>
              <li><Link to="/dieu-khoan-chung">Điều khoản sử dụng</Link></li>
              <li><Link to="/cau-hoi-thuong-gap">Câu hỏi thường gặp</Link></li>
            </ul>
          </Col>

          {/* Cột 3: Liên hệ */}
          <Col lg={3} md={6}>
            <h6 className="footer-title">Liên hệ</h6>
            <ul className="footer-contact-list mb-0">
              <li>📞 <a href="tel:0354162165">0354 162 165</a></li>
              <li>✉️ <a href="mailto:hk2travel@gmail.com">hk2travel@gmail.com</a></li>
            </ul>
          </Col>

          {/* Cột 4: Kết nối */}
          <Col lg={3} md={6}>
            <h6 className="footer-title">Kết nối với chúng tôi</h6>
            <div className="footer-social-icons">
              <a href="https://www.facebook.com/share/17aRvUb4YV/?mibextid=wwXIfr" target="_blank" rel="noreferrer" title="Facebook" className="footer-social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://zalo.me/0354162165" target="_blank" rel="noreferrer" title="Zalo" className="footer-social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 14.163c-.18.44-.705.775-1.15.775H9.338l-.38.51c-.15.2-.39.31-.64.31-.14 0-.28-.04-.41-.11-.33-.19-.47-.59-.33-.94l.53-1.3C6.9 12.28 6 10.72 6 9c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.97-1.17 3.75-2.93 4.75l.57.38c.36.24.5.69.36 1.08z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram" className="footer-social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube" className="footer-social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </Col>
        </Row>
        <div className="footer-divider" />
        <p className="footer-copy mb-0">© 2026 HK2 Travel. Bảo lưu mọi quyền.</p>
      </Container>
    </footer>
  );
};

export default AppFooter;
