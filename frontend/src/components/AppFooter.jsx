import { Container, Row, Col } from 'react-bootstrap';

const AppFooter = () => {
  return (
    <footer className="app-footer mt-auto">
      <Container>
        <Row className="g-3 app-footer-grid">
          <Col md={4}>
            <h6 className="footer-title">Công ty</h6>
            <p className="mb-0">Công ty Du lịch HK2 Travel</p>
            <small className="footer-sub">Giải pháp quản lý và đặt tour chuyên nghiệp</small>
          </Col>
          <Col md={4}>
            <h6 className="footer-title">Địa chỉ</h6>
            <p className="mb-0">12 Nguyễn Văn Bảo, Phường Hạnh Thông, TPHCM.</p>
            <small className="footer-sub">Thời gian làm việc: 08:00 - 17:30 (Thứ 2 - Thứ 7)</small>
          </Col>
          <Col md={4}>
            <h6 className="footer-title">Thông tin liên lạc</h6>
            <ul className="footer-contact-list mb-0">
              <li>
                Facebook:{' '}
                <a href="https://www.facebook.com/share/17aRvUb4YV/?mibextid=wwXIfr" target="_blank" rel="noreferrer">
                  Trang Facebook công ty
                </a>
              </li>
              <li>Điện thoại: <a href="tel:0354162165">0354162165</a></li>
              <li>Email: <a href="mailto:nguyendinhhao170909@gmail.com">nguyendinhhao170909@gmail.com</a></li>
            </ul>
          </Col>
        </Row>
        <div className="footer-divider" />
        <p className="footer-copy mb-0">© 2026 HK2 Travel. Bảo lưu mọi quyền.</p>
      </Container>
    </footer>
  );
};

export default AppFooter;
