import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Table, Form, Button, Alert, Badge, Nav, Tab } from 'react-bootstrap';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../../api/client';
import TourManagementPage from './TourManagementPage';
import AdminArticlesPage from './AdminArticlesPage';

const formatDateTimeVN = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 19).replace('T', ' ');
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(date).replace(',', '');
};

const bookingStatusLabel = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành'
};

const paymentStatusLabel = {
  paid: 'Đã thanh toán',
  unpaid: 'Chưa thanh toán',
  success: 'Thành công',
  failed: 'Thất bại'
};

const paymentMethodLabel = {
  cash: 'Tiền mặt',
  card: 'Thẻ',
  bank_transfer: 'Chuyển khoản',
  vnpay: 'VNPay',
};

const toVietnameseStatus = (value, map) => map[String(value || '').toLowerCase()] || value || '-';
const renderStars = (value = 0) => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  return `${'★'.repeat(safeValue)}${'☆'.repeat(5 - safeValue)}`;
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  // Users
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userFilter, setUserFilter] = useState({ search: '', role: '', status: '' });

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState({ search: '', status: '', rating: '' });

  // Logs
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logFilter, setLogFilter] = useState({ search: '', role: '', action: '' });

  // Contacts
  const [contactInbox, setContactInbox] = useState({ unreadCount: 0, items: [] });
  const [contactPage, setContactPage] = useState(1);
  const [contactTotalPages, setContactTotalPages] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactFilter, setContactFilter] = useState({ search: '', is_read: '', email: '', phone: '' });
  const [bookingReport, setBookingReport] = useState(null);
  const [userActionMessage, setUserActionMessage] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [reportFilter, setReportFilter] = useState({
    groupBy: 'day',
    day: '',
    month: '',
    year: String(new Date().getFullYear())
  });

  const actionLabel = {
    'System initialized': 'Hệ thống đã khởi tạo',
    'Sample data inserted': 'Đã chèn dữ liệu mẫu'
  };

  const roleLabel = {
    system: 'Hệ thống',
    admin: 'Quản trị viên',
    staff: 'Nhân viên',
    user: 'Khách hàng'
  };

  // Load dashboard
  const loadDashboard = async () => {
    const { data } = await client.get('/admin/dashboard');
    setDashboard(data);
  };

  // Load users
  const loadUsers = async (page = userPage, filter = userFilter) => {
    const { data } = await client.get('/admin/users', {
      params: { page, limit: 10, ...filter }
    });
    setUsers(data.data);
    setUserTotal(data.total);
    setUserPage(data.page);
    setUserTotalPages(data.totalPages);
  };

  // Load reviews
  const loadReviews = async (page = reviewPage, filter = reviewFilter) => {
    const { data } = await client.get('/reviews/admin/all', {
      params: { page, limit: 10, ...filter }
    });
    setReviews(data.data);
    setReviewTotal(data.total);
    setReviewPage(data.page);
    setReviewTotalPages(data.totalPages);
  };

  // Load logs (system logs)
  const loadLogs = async (page = logPage, filter = logFilter) => {
    const { data } = await client.get('/admin/system-logs', {
      params: { page, limit: 10, ...filter }
    });
    setLogs(data.data);
    setLogTotal(data.total);
    setLogPage(data.page);
    setLogTotalPages(data.totalPages);
  };

  // Load contacts
  const loadContacts = async (page = contactPage, filter = contactFilter) => {
    const { data } = await client.get('/contact/messages', {
      params: { page, limit: 10, ...filter }
    });
    setContactInbox({ unreadCount: data.unreadCount, items: data.items });
    setContactTotal(data.total);
    setContactPage(data.page);
    setContactTotalPages(data.totalPages);
  };

  const markContactAsRead = async (id) => {
    await client.patch(`/contact/messages/${id}/read`);
    loadContacts();
  };

  const viewUserDetail = async (userId) => {
    try {
      setLoadingUserDetail(true);
      const { data } = await client.get(`/admin/users/${userId}/detail`);
      setSelectedUserDetail(data);
    } catch (error) {
      setUserActionMessage(error.response?.data?.message || 'Không thể tải chi tiết người dùng');
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const lockUser = async (userId) => {
    try {
      await client.patch(`/admin/users/${userId}/lock`);
      setUserActionMessage('Đã khóa tài khoản người dùng');
      await loadUsers();
      if (selectedUserDetail?.user?.id === userId) {
        await viewUserDetail(userId);
      }
    } catch (error) {
      setUserActionMessage(error.response?.data?.message || 'Không thể khóa tài khoản');
    }
  };

  const unlockUser = async (userId) => {
    try {
      await client.patch(`/admin/users/${userId}/unlock`);
      setUserActionMessage('Đã mở khóa tài khoản người dùng');
      await loadUsers();
      if (selectedUserDetail?.user?.id === userId) {
        await viewUserDetail(userId);
      }
    } catch (error) {
      setUserActionMessage(error.response?.data?.message || 'Không thể mở khóa tài khoản');
    }
  };

  const hardDeleteUser = async (userId) => {
    if (!window.confirm('Xóa vĩnh viễn tài khoản này? Hành động không thể hoàn tác.')) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      setUserActionMessage('Đã xóa vĩnh viễn tài khoản người dùng');
      await loadUsers();
      if (selectedUserDetail?.user?.id === userId) {
        setSelectedUserDetail(null);
      }
    } catch (error) {
      setUserActionMessage(error.response?.data?.message || 'Không thể xóa vĩnh viễn tài khoản');
    }
  };

  const resetPassword = async (userId, email) => {
    const sendEmail = window.confirm(`Bạn có muốn gửi email reset tới ${email}? (Hệ thống sẽ tự tạo mật khẩu mới)`);

    try {
      const { data } = await client.patch(`/admin/users/${userId}/reset-password`, {
        sendEmail
      });

      const msg = data.message || 'Đã reset mật khẩu thành công';
      setUserActionMessage(msg);
      window.alert(msg);
    } catch (error) {
      setUserActionMessage(error.response?.data?.message || 'Không thể reset mật khẩu');
    }
  };

  const loadBookingReport = async () => {
    const params = { groupBy: reportFilter.groupBy };

    if (reportFilter.groupBy === 'day') {
      params.day = reportFilter.day;
    }

    if (reportFilter.groupBy === 'month') {
      params.month = reportFilter.month;
    }

    if (reportFilter.groupBy === 'year') {
      params.year = reportFilter.year;
    }

    const { data } = await client.get('/admin/bookings-report', { params });
    setBookingReport(data);
  };
  const handleReportGroupChange = (value) => {
    setReportFilter((current) => ({
      ...current,
      groupBy: value,
      day: value === 'day' ? current.day : '',
      month: value === 'month' ? current.month : '',
      year: value === 'year' ? (current.year || String(new Date().getFullYear())) : current.year
    }));
  };


  const handleApplyReportFilter = async (event) => {
    event.preventDefault();
    await loadBookingReport();
  };
      // (Đã khai báo logFilter ở đầu file, xóa dòng này)

  useEffect(() => {
    loadDashboard();
    loadUsers(1, userFilter);
    loadReviews(1, reviewFilter);
    loadLogs(1, logFilter);
    loadContacts(1, contactFilter);
    loadBookingReport();
    // eslint-disable-next-line
  }, []);

  // Reload when filter/page changes
  useEffect(() => { loadUsers(userPage, userFilter); }, [userPage, userFilter]);
  useEffect(() => { loadReviews(reviewPage, reviewFilter); }, [reviewPage, reviewFilter]);
  useEffect(() => { loadLogs(logPage, logFilter); }, [logPage, logFilter]);
  useEffect(() => { loadContacts(contactPage, contactFilter); }, [contactPage, contactFilter]);

  if (!dashboard) {
    return <p>Đang tải...</p>;
  }

  const chartData = [
    { name: 'Người dùng', value: dashboard.totalUsers, fill: '#0d6efd' },
    { name: 'Tour', value: dashboard.totalTours, fill: '#198754' },
    { name: 'Đơn đặt tour', value: dashboard.totalBookings, fill: '#fd7e14' }
  ];

  const reportGroupLabel = {
    day: 'Theo ngày',
    month: 'Theo tháng',
    year: 'Theo năm'
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => String(currentYear - index));

  return (
    <>
      <h3 className="mb-3">Quản trị</h3>
      <Tab.Container defaultActiveKey="overview">
        <Nav variant="tabs" className="mb-3 app-scroll-tabs">
          <Nav.Item>
            <Nav.Link eventKey="overview">Tổng quan</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="report">Báo cáo</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="users">Người dùng</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="reviews">Đánh giá</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="contacts">
              Liên hệ
              {contactInbox.unreadCount > 0 && (
                <Badge bg="danger" className="ms-2">{contactInbox.unreadCount}</Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="logs">Nhật ký</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="tours">Quản lý Tour</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="articles">Quản lý Bài viết</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview" mountOnEnter unmountOnExit>
            <Row className="g-3 mb-4">
              <Col md={3}><Card body>Tổng người dùng: <strong>{dashboard.totalUsers}</strong></Card></Col>
              <Col md={3}><Card body>Tổng tour: <strong>{dashboard.totalTours}</strong></Card></Col>
              <Col md={3}><Card body>Tổng đơn đặt tour: <strong>{dashboard.totalBookings}</strong></Card></Col>
              <Col md={3}><Card body>Doanh thu: <strong>{Number(dashboard.totalRevenue || dashboard.revenue || 0).toLocaleString()} VND</strong></Card></Col>
            </Row>

            <Card className="mb-4">
              <Card.Body>
                <h5>Thống kê</h5>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="report" mountOnEnter unmountOnExit>
            <Card className="mb-4">
              <Card.Body>
                <h5 className="mb-3">Báo cáo đặt tour theo thời gian</h5>

                <Form onSubmit={handleApplyReportFilter} className="mb-3">
                  <Row className="g-2 align-items-end">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Kiểu thống kê</Form.Label>
                        <Form.Select
                          value={reportFilter.groupBy}
                          onChange={(e) => handleReportGroupChange(e.target.value)}
                        >
                          <option value="day">Theo ngày</option>
                          <option value="month">Theo tháng</option>
                          <option value="year">Theo năm</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      {reportFilter.groupBy === 'day' && (
                        <Form.Group>
                          <Form.Label>Chọn ngày</Form.Label>
                          <Form.Control
                            type="date"
                            value={reportFilter.day}
                            onChange={(e) => setReportFilter({ ...reportFilter, day: e.target.value })}
                          />
                        </Form.Group>
                      )}

                      {reportFilter.groupBy === 'month' && (
                        <Form.Group>
                          <Form.Label>Chọn tháng</Form.Label>
                          <Form.Control
                            type="month"
                            value={reportFilter.month}
                            onChange={(e) => setReportFilter({ ...reportFilter, month: e.target.value })}
                          />
                        </Form.Group>
                      )}

                      {reportFilter.groupBy === 'year' && (
                        <Form.Group>
                          <Form.Label>Chọn năm</Form.Label>
                          <Form.Select
                            value={reportFilter.year}
                            onChange={(e) => setReportFilter({ ...reportFilter, year: e.target.value })}
                          >
                            {yearOptions.map((itemYear) => (
                              <option key={itemYear} value={itemYear}>{itemYear}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      )}
                    </Col>
                    <Col md={3}>
                      <Button type="submit" className="w-100">Áp dụng bộ lọc</Button>
                    </Col>
                  </Row>
                </Form>

                {bookingReport && (
                  <>
                    <Row className="g-3 mb-3">
                      <Col md={3}><Card body>Tổng tour được đặt: <strong>{bookingReport.summary.totalBooked}</strong></Card></Col>
                      <Col md={3}><Card body>Tour thành công: <strong>{bookingReport.summary.totalSuccess}</strong></Card></Col>
                      <Col md={3}><Card body>Tour bị hủy: <strong>{bookingReport.summary.totalCancelled}</strong></Card></Col>
                      <Col md={3}><Card body>Doanh thu: <strong>{Number(bookingReport.summary.totalRevenue).toLocaleString()} VND</strong></Card></Col>
                    </Row>

                    <Card className="mb-3">
                      <Card.Body>
                        <h6>
                          Biểu đồ {reportGroupLabel[bookingReport.groupBy] || 'Theo thời gian'}
                          {bookingReport.selected ? ` (${bookingReport.selected})` : ''}
                        </h6>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={bookingReport.series}>
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="totalBooked" fill="#0d6efd" name="Được đặt" />
                            <Bar dataKey="successCount" fill="#198754" name="Thành công" />
                            <Bar dataKey="cancelledCount" fill="#dc3545" name="Bị hủy" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>

                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Được đặt</th>
                          <th>Thành công</th>
                          <th>Bị hủy</th>
                          <th>Doanh thu (VND)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingReport.series.map((item) => (
                          <tr key={item.period}>
                            <td>{item.period}</td>
                            <td>{item.totalBooked}</td>
                            <td>{item.successCount}</td>
                            <td>{item.cancelledCount}</td>
                            <td>{Number(item.revenue).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="users" mountOnEnter unmountOnExit>
            <Card className="mb-4">
              <Card.Body>
                <h5>Quản lý người dùng</h5>
                {userActionMessage && (
                  <Alert variant="info" dismissible onClose={() => setUserActionMessage('')}>
                    {userActionMessage}
                  </Alert>
                )}
                {/* Bộ lọc users */}
                <Form className="mb-3" onSubmit={e => { e.preventDefault(); setUserPage(1); loadUsers(1, userFilter); }}>
                  <Row className="g-2 align-items-end">
                    <Col md={3}><Form.Control placeholder="Tìm tên/email" value={userFilter.search} onChange={e => setUserFilter(f => ({ ...f, search: e.target.value }))} /></Col>
                    <Col md={2}>
                      <Form.Select value={userFilter.role} onChange={e => setUserFilter(f => ({ ...f, role: e.target.value }))}>
                        <option value="">Tất cả vai trò</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="user">User</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Select value={userFilter.status} onChange={e => setUserFilter(f => ({ ...f, status: e.target.value }))}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="locked">Đang khóa</option>
                        <option value="deleted">Đã xóa</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}><Button type="submit" className="w-100">Lọc</Button></Col>
                  </Row>
                </Form>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.full_name}</td>
                        <td>{item.email}</td>
                        <td>{item.role}</td>
                        <td>
                          {Number(item.is_deleted || 0) === 1 ? (
                            <Badge bg="dark">Đã xóa</Badge>
                          ) : Number(item.is_locked || 0) === 1 ? (
                            <Badge bg="warning" text="dark">Đang khóa</Badge>
                          ) : (
                            <Badge bg="success">Hoạt động</Badge>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <Button size="sm" variant="outline-primary" onClick={() => viewUserDetail(item.id)}>
                              Chi tiết
                            </Button>
                            {Number(item.is_deleted || 0) === 0 && Number(item.is_locked || 0) === 0 && (
                              <Button size="sm" variant="outline-warning" onClick={() => lockUser(item.id)}>
                                Khóa
                              </Button>
                            )}
                            {Number(item.is_deleted || 0) === 0 && Number(item.is_locked || 0) === 1 && (
                              <Button size="sm" variant="outline-success" onClick={() => unlockUser(item.id)}>
                                Mở khóa
                              </Button>
                            )}
                            {Number(item.is_deleted || 0) === 0 && (
                              <Button size="sm" variant="outline-danger" onClick={() => hardDeleteUser(item.id)}>
                                Xóa vĩnh viễn
                              </Button>
                            )}
                            {Number(item.is_deleted || 0) === 0 && (
                              <Button size="sm" variant="outline-dark" onClick={() => resetPassword(item.id, item.email)}>
                                Reset mật khẩu
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {/* Phân trang users */}
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>Tổng: {userTotal} | Trang {userPage}/{userTotalPages}</div>
                  <div>
                    <Button size="sm" disabled={userPage === 1} onClick={() => setUserPage(p => Math.max(1, p - 1))}>Trước</Button>{' '}
                    <Button size="sm" disabled={userPage === userTotalPages} onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}>Sau</Button>
                  </div>
                </div>

                {loadingUserDetail && <p className="mb-0">Đang tải chi tiết người dùng...</p>}
                {selectedUserDetail && !loadingUserDetail && (
                  <Card className="mt-3">
                    <Card.Body>
                      <h6 className="mb-3">
                        Chi tiết người dùng: {selectedUserDetail.user.full_name} ({selectedUserDetail.user.email})
                      </h6>
                      <Row className="g-3 mb-3">
                        <Col md={3}><Card body>ID: <strong>{selectedUserDetail.user.id}</strong></Card></Col>
                        <Col md={3}><Card body>Vai trò: <strong>{selectedUserDetail.user.role}</strong></Card></Col>
                        <Col md={3}><Card body>Khóa: <strong>{Number(selectedUserDetail.user.is_locked || 0) === 1 ? 'Có' : 'Không'}</strong></Card></Col>
                        <Col md={3}><Card body>Đã xóa: <strong>{Number(selectedUserDetail.user.is_deleted || 0) === 1 ? 'Có' : 'Không'}</strong></Card></Col>
                      </Row>
                      {!['staff', 'admin'].includes(selectedUserDetail.user?.role) && (
                        <>
                      <h6>Lịch sử đặt tour</h6>
                      <Table striped bordered hover responsive className="mb-3">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Tour</th>
                            <th>Số người</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái đặt</th>
                            <th>Thanh toán</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedUserDetail.bookings || []).length === 0 && (
                            <tr><td colSpan={7} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {(selectedUserDetail.bookings || []).map((booking) => (
                            <tr key={`booking-${booking.id}`}>
                              <td>{booking.id}</td>
                              <td>{booking.tour_title || '-'}</td>
                              <td>{booking.people_count}</td>
                              <td>{Number(booking.total_amount || 0).toLocaleString()} VND</td>
                              <td>{toVietnameseStatus(booking.booking_status, bookingStatusLabel)}</td>
                              <td>{toVietnameseStatus(booking.payment_status, paymentStatusLabel)}</td>
                              <td>{formatDateTimeVN(booking.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <h6>Lịch sử thanh toán</h6>
                      <Table striped bordered hover responsive className="mb-3">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Mã đơn đặt</th>
                            <th>Phương thức</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedUserDetail.payments || []).length === 0 && (
                            <tr><td colSpan={6} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {(selectedUserDetail.payments || []).map((payment) => (
                            <tr key={`payment-${payment.id}`}>
                              <td>{payment.id}</td>
                              <td>{payment.booking_id}</td>
                              <td>{toVietnameseStatus(payment.method, paymentMethodLabel)}</td>
                              <td>{Number(payment.amount || 0).toLocaleString()} VND</td>
                              <td>{toVietnameseStatus(payment.status, paymentStatusLabel)}</td>
                              <td>{formatDateTimeVN(payment.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <h6>Lịch sử đánh giá</h6>
                      <Table striped bordered hover responsive className="mb-3">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Tour</th>
                            <th>Sao</th>
                            <th>Trạng thái</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedUserDetail.reviews || []).length === 0 && (
                            <tr><td colSpan={5} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {(selectedUserDetail.reviews || []).map((review) => (
                            <tr key={`review-${review.id}`}>
                              <td>{review.id}</td>
                              <td>{review.tour_title || '-'}</td>
                              <td style={{ color: '#f59e0b', fontWeight: 700 }}>{renderStars(review.rating)}</td>
                              <td>{review.status}</td>
                              <td>{formatDateTimeVN(review.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                        </>
                      )}

                      {/* Hiển thị booking đã xử lý cho staff/admin */}
                      {['staff', 'admin'].includes(selectedUserDetail.user?.role) && (
                        <>
                          <h6 className="mt-2">
                            Booking đã xử lý
                            <span className="ms-2 badge bg-secondary">{(selectedUserDetail.handledBookings || []).length}</span>
                          </h6>
                          <Table striped bordered hover responsive className="mb-0">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Tour</th>
                                <th>Khách hàng</th>
                                <th>Số người</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái đặt</th>
                                <th>Thanh toán</th>
                                <th>Thời gian xử lý</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedUserDetail.handledBookings || []).length === 0 && (
                                <tr><td colSpan={8} className="text-center">Chưa xử lý booking nào</td></tr>
                              )}
                              {(selectedUserDetail.handledBookings || []).map((b) => (
                                <tr key={`handled-${b.id}`}>
                                  <td>{b.id}</td>
                                  <td>{b.tour_title || '-'}</td>
                                  <td>{b.customer_name || '-'}<br /><small className="text-muted">{b.customer_email}</small></td>
                                  <td>{b.people_count}</td>
                                  <td>{Number(b.total_amount || 0).toLocaleString()} VND</td>
                                  <td>{toVietnameseStatus(b.booking_status, bookingStatusLabel)}</td>
                                  <td>{toVietnameseStatus(b.payment_status, paymentStatusLabel)}</td>
                                  <td>{formatDateTimeVN(b.updated_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="reviews" mountOnEnter unmountOnExit>
            <Card className="mb-4">
              <Card.Body>
                <h5 className="mb-3">Quản lý đánh giá</h5>

                {/* Filter */}
                <Form className="mb-3">
                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Control
                        placeholder="Tìm theo bình luận hoặc tên người dùng"
                        value={reviewFilter.search}
                        onChange={(e) => setReviewFilter({ ...reviewFilter, search: e.target.value })}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Select
                        value={reviewFilter.status}
                        onChange={(e) => setReviewFilter({ ...reviewFilter, status: e.target.value })}
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="rejected">Đã từ chối</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={reviewFilter.rating}
                        onChange={(e) => setReviewFilter({ ...reviewFilter, rating: e.target.value })}
                      >
                        <option value="">Tất cả sao</option>
                        {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} sao</option>)}
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Button onClick={() => loadReviews(1, reviewFilter)}>Lọc</Button>
                    </Col>
                  </Row>
                </Form>

                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Người dùng</th>
                      <th>Tour</th>
                      <th>Sao</th>
                      <th>Bình luận</th>
                      <th>Phản hồi</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.length === 0 && (
                      <tr><td colSpan={9} className="text-center">Không có dữ liệu</td></tr>
                    )}
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td>{review.id}</td>
                        <td>{review.user_name || '-'}</td>
                        <td>{review.tour_title || '-'}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 700 }}>{renderStars(review.rating)}</td>
                        <td style={{ maxWidth: 200 }}>{review.comment || '-'}</td>
                        <td style={{ maxWidth: 200 }}>{review.staff_reply || '-'}</td>
                        <td>
                          <Badge bg={review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'danger' : 'warning'}>
                            {review.status === 'approved' ? 'Đã duyệt' : review.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                          </Badge>
                        </td>
                        <td>{formatDateTimeVN(review.created_at)}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {review.status === 'approved' ? (
                              <Button size="sm" variant="secondary" onClick={async () => {
                                await client.put(`/reviews/${review.id}`, { status: 'rejected' });
                                loadReviews(reviewPage, reviewFilter);
                              }}>Ẩn</Button>
                            ) : (
                              <Button size="sm" variant="success" onClick={async () => {
                                await client.put(`/reviews/${review.id}`, { status: 'approved' });
                                loadReviews(reviewPage, reviewFilter);
                              }}>Hiện</Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={async () => {
                              if (!window.confirm('Xóa đánh giá này?')) return;
                              await client.delete(`/reviews/${review.id}`);
                              loadReviews(reviewPage, reviewFilter);
                            }}>Xóa</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>Tổng: {reviewTotal} | Trang {reviewPage}/{reviewTotalPages}</div>
                  <div>
                    <Button size="sm" disabled={reviewPage === 1} onClick={() => setReviewPage(p => Math.max(1, p - 1))}>Trước</Button>{' '}
                    <Button size="sm" disabled={reviewPage === reviewTotalPages} onClick={() => setReviewPage(p => Math.min(reviewTotalPages, p + 1))}>Sau</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="contacts" mountOnEnter unmountOnExit>
            <Card className="mb-4">
              <Card.Body className="mb-2">
                <h5>
                  Hộp thư liên hệ
                  {contactInbox.unreadCount > 0 && (
                    <span className="badge bg-danger ms-2">{contactInbox.unreadCount} mới</span>
                  )}
                </h5>
                <Form className="mb-3" onSubmit={e => { e.preventDefault(); setContactPage(1); loadContacts(1, contactFilter); }}>
                  <Row className="g-2 align-items-end">
                    <Col md={4}><Form.Control placeholder="Tìm tên người gửi hoặc nội dung" value={contactFilter.search} onChange={e => setContactFilter(f => ({ ...f, search: e.target.value }))} /></Col>
                    <Col md={3}><Form.Control placeholder="Lọc theo email" value={contactFilter.email} onChange={e => setContactFilter(f => ({ ...f, email: e.target.value }))} /></Col>
                    <Col md={2}>
                      <Form.Select value={contactFilter.is_read} onChange={e => setContactFilter(f => ({ ...f, is_read: e.target.value }))}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="0">Chưa đọc</option>
                        <option value="1">Đã đọc</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}><Button type="submit" className="w-100">Lọc</Button></Col>
                  </Row>
                </Form>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Loại thông tin</th>
                      <th>Người gửi</th>
                      <th>Liên hệ</th>
                      <th>Nội dung</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactInbox.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td><span className="badge bg-info text-dark">{item.info_type || '—'}</span></td>
                        <td>{item.full_name}</td>
                        <td>
                          <div>📧 {item.email}</div>
                          {item.phone && <div>📞 {item.phone}</div>}
                        </td>
                        <td style={{ maxWidth: 360 }}>{item.message}</td>
                        <td>{formatDateTimeVN(item.created_at)}</td>
                        <td>
                          {Number(item.is_read) === 1 ? (
                            <span className="badge bg-secondary">Đã đọc</span>
                          ) : (
                            <Button size="sm" variant="outline-primary" onClick={() => markContactAsRead(item.id)}>
                              Đánh dấu đã đọc
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>Tổng: {contactTotal} | Trang {contactPage}/{contactTotalPages}</div>
                  <div>
                    <Button size="sm" disabled={contactPage === 1} onClick={() => setContactPage(p => Math.max(1, p - 1))}>Trước</Button>{' '}
                    <Button size="sm" disabled={contactPage === contactTotalPages} onClick={() => setContactPage(p => Math.min(contactTotalPages, p + 1))}>Sau</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="logs" mountOnEnter unmountOnExit>
            <Card>
              <Card.Body>
                <h5>Nhật ký hệ thống</h5>
                <Form className="mb-3" onSubmit={e => { e.preventDefault(); setLogPage(1); loadLogs(1, logFilter); }}>
                  <Row className="g-2 align-items-end">
                    <Col md={4}><Form.Control placeholder="Tìm theo hành động hoặc chi tiết" value={logFilter.search} onChange={e => setLogFilter(f => ({ ...f, search: e.target.value }))} /></Col>
                    <Col md={2}>
                      <Form.Select value={logFilter.role} onChange={e => setLogFilter(f => ({ ...f, role: e.target.value }))}>
                        <option value="">Tất cả vai trò</option>
                        <option value="admin">Quản trị viên</option>
                        <option value="staff">Nhân viên</option>
                        <option value="user">Khách hàng</option>
                        <option value="system">Hệ thống</option>
                      </Form.Select>
                    </Col>
                    <Col md={3}><Form.Control placeholder="Lọc theo hành động" value={logFilter.action} onChange={e => setLogFilter(f => ({ ...f, action: e.target.value }))} /></Col>
                    <Col md={2}><Button type="submit" className="w-100">Lọc</Button></Col>
                  </Row>
                </Form>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Hành động</th>
                      <th>Người thực hiện</th>
                      <th>Vai trò</th>
                      <th>Thời gian tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{actionLabel[log.action] || log.action}</td>
                        <td>{log.user_name || '—'}</td>
                        <td>{roleLabel[log.role] || log.role || '—'}</td>
                        <td>{formatDateTimeVN(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>Tổng: {logTotal} | Trang {logPage}/{logTotalPages}</div>
                  <div>
                    <Button size="sm" disabled={logPage === 1} onClick={() => setLogPage(p => Math.max(1, p - 1))}>Trước</Button>{' '}
                    <Button size="sm" disabled={logPage === logTotalPages} onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}>Sau</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="tours" mountOnEnter unmountOnExit>
            <TourManagementPage />
          </Tab.Pane>
          <Tab.Pane eventKey="articles" mountOnEnter unmountOnExit>
            <AdminArticlesPage />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
};

export default AdminDashboardPage;
