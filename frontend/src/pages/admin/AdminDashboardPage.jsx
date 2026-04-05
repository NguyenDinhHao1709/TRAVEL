import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Form, Button, Alert, Badge, Nav, Tab } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../../api/client';

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
  momo: 'MoMo'
};

const toVietnameseStatus = (value, map) => map[String(value || '').toLowerCase()] || value || '-';
const renderStars = (value = 0) => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  return `${'★'.repeat(safeValue)}${'☆'.repeat(5 - safeValue)}`;
};

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [logs, setLogs] = useState([]);
  const [contactInbox, setContactInbox] = useState({ unreadCount: 0, items: [] });
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

  const load = async () => {
    const [dashRes, userRes, reviewRes, logRes, contactRes] = await Promise.all([
      client.get('/admin/dashboard'),
      client.get('/admin/users'),
      client.get('/reviews/admin/all'),
      client.get('/admin/logs'),
      client.get('/contact/messages')
    ]);

    setDashboard(dashRes.data);
    setUsers(userRes.data);
    setReviews(reviewRes.data);
    setLogs(logRes.data);
    setContactInbox(contactRes.data);
  };

  const markContactAsRead = async (id) => {
    await client.patch(`/contact/messages/${id}/read`);
    load();
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
      await load();
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
      await load();
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
      await load();
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

  useEffect(() => {
    load();
    loadBookingReport();
  }, []);

  if (!dashboard) {
    return <p>Đang tải...</p>;
  }

  const chartData = [
    { name: 'Người dùng', value: dashboard.totalUsers },
    { name: 'Tour', value: dashboard.totalTours },
    { name: 'Đơn đặt tour', value: dashboard.totalBookings }
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
      <h3 className="mb-3">Bảng điều khiển quản trị</h3>

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
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <Row className="g-3 mb-4">
              <Col md={3}><Card body>Tổng người dùng: <strong>{dashboard.totalUsers}</strong></Card></Col>
              <Col md={3}><Card body>Tổng tour: <strong>{dashboard.totalTours}</strong></Card></Col>
              <Col md={3}><Card body>Tổng đơn đặt tour: <strong>{dashboard.totalBookings}</strong></Card></Col>
              <Col md={3}><Card body>Doanh thu: <strong>{Number(dashboard.revenue).toLocaleString()} VND</strong></Card></Col>
            </Row>

            <Card className="mb-4">
              <Card.Body style={{ height: 280 }}>
                <h5>Thống kê</h5>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0d6efd" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="report">
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
                      <Card.Body style={{ height: 280 }}>
                        <h6>
                          Biểu đồ {reportGroupLabel[bookingReport.groupBy] || 'Theo thời gian'}
                          {bookingReport.selected ? ` (${bookingReport.selected})` : ''}
                        </h6>
                        <ResponsiveContainer width="100%" height="100%">
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

          <Tab.Pane eventKey="users">
            <Card className="mb-4">
              <Card.Body>
                <h5>Quản lý người dùng</h5>
                {userActionMessage && (
                  <Alert variant="info" dismissible onClose={() => setUserActionMessage('')}>
                    {userActionMessage}
                  </Alert>
                )}
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
                          {selectedUserDetail.bookings.length === 0 && (
                            <tr><td colSpan={7} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {selectedUserDetail.bookings.map((booking) => (
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
                          {selectedUserDetail.payments.length === 0 && (
                            <tr><td colSpan={6} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {selectedUserDetail.payments.map((payment) => (
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
                      <Table striped bordered hover responsive className="mb-0">
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
                          {selectedUserDetail.reviews.length === 0 && (
                            <tr><td colSpan={5} className="text-center">Chưa có dữ liệu</td></tr>
                          )}
                          {selectedUserDetail.reviews.map((review) => (
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
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="reviews">
            <Card className="mb-4">
              <Card.Body>
                <h5>Quản lý đánh giá</h5>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Người dùng</th>
                      <th>Tour</th>
                      <th>Sao</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td>{review.id}</td>
                        <td>{review.full_name}</td>
                        <td>{review.title}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 700 }}>{renderStars(review.rating)}</td>
                        <td>{review.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="contacts">
            <Card className="mb-4">
              <Card.Body className="mb-2">
                <h5>
                  Hộp thư liên hệ
                  {contactInbox.unreadCount > 0 && (
                    <span className="badge bg-danger ms-2">{contactInbox.unreadCount} mới</span>
                  )}
                </h5>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Người gửi</th>
                      <th>Liên hệ</th>
                      <th>Tiêu đề</th>
                      <th>Nội dung</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactInbox.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.full_name}</td>
                        <td>
                          <div>{item.email}</div>
                          <div>{item.phone}</div>
                        </td>
                        <td>{item.subject}</td>
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
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="logs">
            <Card>
              <Card.Body>
                <h5>Nhật ký hệ thống</h5>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Hành động</th>
                      <th>Vai trò</th>
                      <th>Thời gian tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{actionLabel[log.action] || log.action}</td>
                        <td>{roleLabel[log.actor_role] || log.actor_role}</td>
                        <td>{formatDateTimeVN(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
};

export default AdminDashboardPage;
