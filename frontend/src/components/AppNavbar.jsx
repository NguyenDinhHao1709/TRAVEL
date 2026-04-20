import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Container, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleLabel = {
    user: 'Khách hàng',
    staff: 'Nhân viên',
    admin: 'Quản trị viên'
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userDisplayName = user ? `${user.fullName} · ${roleLabel[String(user.role)] || String(user.role)}` : '';

  return (
    <>
      <Navbar variant="dark" expand="lg" className="app-navbar" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/" className="app-brand">
            <img src="/uploads/logo.png" alt="HK2 Travel" style={{ height: '40px', marginRight: '10px' }} />
            <div className="app-brand-text">
              HK2 TRAVEL
              <span>Công ty Du lịch HK2 Travel</span>
            </div>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto app-main-nav">
              <Nav.Link as={Link} to="/">Danh sách tour</Nav.Link>
              {(!user || user.role === 'user') && (
                <NavDropdown title="Giới thiệu" id="intro-dropdown">
                  <NavDropdown.Item as={Link} to="/about">Về chúng tôi</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/huong-dan-dat-tour">Hướng dẫn đặt tour</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/huong-dan-thanh-toan">Hướng dẫn thanh toán</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item as={Link} to="/chinh-sach-bao-mat">Chính sách bảo mật</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/dieu-khoan-chung">Điều khoản chung</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/cau-hoi-thuong-gap">Câu hỏi thường gặp</NavDropdown.Item>
                </NavDropdown>
              )}
              {(!user || user.role === 'user') && <Nav.Link as={Link} to="/chatbot">Trợ lý AI</Nav.Link>}
              {!user && <Nav.Link as={Link} to="/contact">Liên hệ</Nav.Link>}
              {user?.role === 'user' && <Nav.Link as={Link} to="/contact">Liên hệ</Nav.Link>}
              {(user?.role === 'staff' || user?.role === 'admin') && <Nav.Link as={Link} to="/staff">Nhân viên</Nav.Link>}
              {user?.role === 'staff' && <Nav.Link as={Link} to="/staff#chat">Chat hỗ trợ</Nav.Link>}
              {user?.role === 'admin' && <Nav.Link as={Link} to="/admin">Quản trị</Nav.Link>}
            </Nav>
            {user ? (
              <Nav className="app-user-dropdown-nav">
                <NavDropdown
                  title={<span className="app-user-toggle">👤 {userDisplayName}</span>}
                  id="user-dropdown"
                  align="end"
                  className="app-user-dropdown"
                >
                  {user.role === 'user' && (
                    <>
                      <NavDropdown.Item as={Link} to="/my-bookings">🎒 Đặt tour của tôi</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/wishlist">❤️ Danh sách yêu thích</NavDropdown.Item>
                      <NavDropdown.Divider />
                    </>
                  )}
                  <NavDropdown.Item onClick={handleLogout} className="text-danger fw-bold">🚪 Đăng xuất</NavDropdown.Item>
                </NavDropdown>
              </Nav>
            ) : (
              <div className="d-flex gap-2">
                <Button as={Link} to="/login" size="sm" variant="outline-light">Đăng nhập</Button>
                <Button as={Link} to="/register" size="sm" className="btn-accent">Đăng ký</Button>
              </div>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default AppNavbar;
