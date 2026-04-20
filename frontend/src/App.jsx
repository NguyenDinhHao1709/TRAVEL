import AdminSystemLogsPage from './pages/admin/AdminSystemLogsPage';
import { Container } from 'react-bootstrap';
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AppNavbar from './components/AppNavbar';
import AppFooter from './components/AppFooter';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TourListPage from './pages/customer/TourListPage';
import ArticlesPage from './pages/customer/ArticlesPage';
import ArticleDetailPage from './pages/customer/ArticleDetailPage';
import TourDetailPage from './pages/customer/TourDetailPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import WishlistPage from './pages/customer/WishlistPage';
import ChatbotPage from './pages/customer/ChatbotPage';
import PaymentReturnPage from './pages/customer/PaymentReturnPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import TourManagementPage from './pages/admin/TourManagementPage';
import AdminArticlesPage from './pages/admin/AdminArticlesPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import HuongDanDatTourPage from './pages/info/HuongDanDatTourPage';
import HuongDanThanhToanPage from './pages/info/HuongDanThanhToanPage';
import ChinhSachBaoMatPage from './pages/info/ChinhSachBaoMatPage';
import DieuKhoanChungPage from './pages/info/DieuKhoanChungPage';
import CauHoiThuongGapPage from './pages/info/CauHoiThuongGapPage';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import Footer from './components/Footer';

const App = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app-shell">
      <AppNavbar />
      <ForceChangePasswordModal />
      <Container className="pb-5 pt-1 app-content">
        <Routes>
          <Route path="/" element={<TourListPage />} />
          <Route path="/tours" element={<TourListPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:id" element={<ArticleDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/huong-dan-dat-tour" element={<HuongDanDatTourPage />} />
          <Route path="/huong-dan-thanh-toan" element={<HuongDanThanhToanPage />} />
          <Route path="/chinh-sach-bao-mat" element={<ChinhSachBaoMatPage />} />
          <Route path="/dieu-khoan-chung" element={<DieuKhoanChungPage />} />
          <Route path="/cau-hoi-thuong-gap" element={<CauHoiThuongGapPage />} />
          <Route path="/tours/:id" element={<TourDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/payment-return" element={<PaymentReturnPage />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute roles={['user']}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute roles={['user']}>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={<ChatbotPage />}
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <StaffDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tours"
            element={
              <ProtectedRoute roles={['admin', 'staff']}>
                <TourManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/articles"
            element={
              <ProtectedRoute roles={['admin', 'staff']}>
                <AdminArticlesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-logs"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminSystemLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/tours"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <TourManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/articles"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <AdminArticlesPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Container>
      <AppFooter />
      <ChatWidget />
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-to-top-btn"
          aria-label="Về đầu trang"
        >↑</button>
      )}
    </div>
  );
};

export default App;
