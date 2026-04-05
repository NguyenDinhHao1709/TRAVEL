import { Container } from 'react-bootstrap';
import { Routes, Route } from 'react-router-dom';
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
import ContactPage from './pages/ContactPage';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';

const App = () => {
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
              <ProtectedRoute roles={['admin']}>
                <TourManagementPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Container>
      <AppFooter />
      <ChatWidget />
    </div>
  );
};

export default App;
