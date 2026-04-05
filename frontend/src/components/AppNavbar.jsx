import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
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

  return (
    <>
      <Navbar variant="dark" expand="lg" className="app-navbar" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/" className="app-brand">
            <span className="app-brand-icon">✈</span>
            <div className="app-brand-text">
              HK2 TRAVEL
              <span>Công ty Du lịch HK2 Travel</span>
            </div>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto app-main-nav">
              <Nav.Link as={Link} to="/">Danh sách tour</Nav.Link>
              <Nav.Link as={Link} to="/articles">Bài viết</Nav.Link>
              {(!user || user.role === 'user') && <Nav.Link as={Link} to="/chatbot">Trợ lý AI</Nav.Link>}
              {user?.role === 'user' && <Nav.Link as={Link} to="/my-bookings">Đặt tour của tôi</Nav.Link>}
              {user?.role === 'user' && <Nav.Link as={Link} to="/wishlist">Danh sách yêu thích</Nav.Link>}
              {!user && <Nav.Link as={Link} to="/contact">Liên hệ</Nav.Link>}
              {user?.role === 'user' && <Nav.Link as={Link} to="/contact">Liên hệ</Nav.Link>}
              {(user?.role === 'staff' || user?.role === 'admin') && <Nav.Link as={Link} to="/staff">Nhân viên</Nav.Link>}
              {user?.role === 'admin' && <Nav.Link as={Link} to="/admin">Quản trị</Nav.Link>}
              {user?.role === 'admin' && <Nav.Link as={Link} to="/admin/tours">Quản lý tour</Nav.Link>}
            </Nav>
            {user ? (
              <div className="app-user-panel">
                <span className="app-user-text">👤 {user.fullName} · {roleLabel[user.role] || user.role}</span>
                <Button size="sm" variant="outline-light" onClick={handleLogout}>Đăng xuất</Button>
              </div>
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
