import { useEffect, useState } from 'react';
import { Button, Alert, Badge, Form, InputGroup, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import client from '../../api/client';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN');
};

const BOOKING_STATUS = {
  pending:   { label: 'Chờ xác nhận', variant: 'warning',  icon: '⏳' },
  confirmed: { label: 'Đã xác nhận',  variant: 'primary',  icon: '✅' },
  cancelled: { label: 'Đã hủy',       variant: 'danger',   icon: '❌' },
  completed: { label: 'Hoàn tất',     variant: 'success',  icon: '🏆' },
};

const FILTER_OPTIONS = [
  { value: 'all',       label: 'Tất cả' },
  { value: 'pending',   label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyBookingsPage = () => {
  const [bookings, setBookings]         = useState([]);
  const [message, setMessage]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder]       = useState('newest');
  const [searchQuery, setSearchQuery]   = useState('');

  const loadBookings = async () => {
    const { data } = await client.get('/bookings/my');
    setBookings(data);
  };

  useEffect(() => { loadBookings(); }, []);

  /* ── Filter / Search / Sort ──────────────────────────────────────── */
  let filtered = statusFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.booking_status === statusFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    const normalizedBookingCode = q.startsWith('#') ? q.slice(1) : q;
    filtered = filtered.filter((b) =>
      (b.title       || '').toLowerCase().includes(q) ||
      (b.destination || '').toLowerCase().includes(q) ||
      `#${b.id}`.toLowerCase().includes(q) ||
      String(b.id).includes(normalizedBookingCode)
    );
  }

  if (sortOrder === 'oldest') filtered = [...filtered].reverse();

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.booking_status === 'confirmed').length,
    pending:   bookings.filter((b) => b.booking_status === 'pending').length,
    cancelled: bookings.filter((b) => b.booking_status === 'cancelled').length,
  };

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mybooking-header mb-4">
        <div>
          <h3 className="mb-1">📋 Lịch sử đặt tour</h3>
          <p className="text-muted mb-0">Danh sách các chuyến tour bạn đã đặt</p>
        </div>
        <div className="d-flex gap-3 mybooking-stats">
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num">{stats.total}</span>
            <span className="mybooking-stat-label">Tổng đơn</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-warning">{stats.pending}</span>
            <span className="mybooking-stat-label">Chờ xác nhận</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-primary">{stats.confirmed}</span>
            <span className="mybooking-stat-label">Đã xác nhận</span>
          </div>
          <div className="mybooking-stat-item">
            <span className="mybooking-stat-num text-danger">{stats.cancelled}</span>
            <span className="mybooking-stat-label">Đã hủy</span>
          </div>
        </div>
      </div>

      {message && (
        <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>
      )}

      {/* ── Search + Filter ────────────────────────────────────────── */}
      <div className="mybooking-filter-bar mb-4">
        <InputGroup size="sm" className="mb-2" style={{ maxWidth: 440 }}>
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control
            placeholder="Tìm theo tên tour, điểm đến, mã đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>✕</Button>
          )}
        </InputGroup>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={statusFilter === opt.value ? 'primary' : 'outline-secondary'}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              {opt.value !== 'all' && (
                <Badge bg="light" text="dark" className="ms-1">
                  {bookings.filter((b) => b.booking_status === opt.value).length}
                </Badge>
              )}
            </Button>
          ))}
          <Form.Select
            size="sm"
            className="ms-auto"
            style={{ width: 'auto', minWidth: 160 }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </Form.Select>
        </div>

        {searchQuery && (
          <p className="text-muted small mt-1 mb-0">
            Tìm thấy <strong>{filtered.length}</strong> kết quả cho &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* ── Booking list ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Alert variant="light" className="text-center py-5">
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>📋</div>
          <p className="mb-0 text-muted">
            {searchQuery
              ? `Không tìm thấy đơn nào khớp với "${searchQuery}".`
              : statusFilter !== 'all'
                ? `Không có đơn ở trạng thái "${FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}".`
                : 'Bạn chưa có đơn đặt tour nào.'}
          </p>
          {searchQuery && (
            <Button size="sm" variant="link" className="mt-1" onClick={() => setSearchQuery('')}>
              Xóa tìm kiếm
            </Button>
          )}
        </Alert>
      ) : (
        <div className="bg-white border rounded-4 shadow-sm overflow-hidden">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Mã đơn</th>
                  <th>Tour</th>
                  <th>Ngày đặt</th>
                  <th>Lịch trình</th>
                  <th>Điểm đến</th>
                  <th>Số người</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => {
                  const bs = BOOKING_STATUS[booking.booking_status]
                    || { label: booking.booking_status, variant: 'secondary', icon: '📋' };

                  return (
                    <tr key={booking.id}>
                      <td className="fw-semibold">#{booking.id}</td>
                      <td>
                        <div className="fw-semibold">{booking.title}</div>
                      </td>
                      <td>
                        {booking.created_at
                          ? new Date(booking.created_at).toLocaleString('vi-VN', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td>
                        {formatDate(booking.start_date || booking.departure_date)}
                        {' → '}
                        {formatDate(booking.end_date)}
                      </td>
                      <td>{booking.destination || '—'}</td>
                      <td>{booking.people_count} người</td>
                      <td className="fw-bold" style={{ color: '#e65100' }}>
                        {Number(booking.total_amount || 0).toLocaleString('vi-VN')} VND
                      </td>
                      <td>
                        <Badge bg={bs.variant}>{bs.icon} {bs.label}</Badge>
                      </td>
                      <td className="text-end">
                        <Button
                          as={Link}
                          to={`/tours/${booking.tour_id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          Xem tour
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
};

export default MyBookingsPage;
