import React, { useEffect, useState } from 'react';
import axios from 'axios';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('vi-VN');
}

export default function AdminSystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Đảm bảo safeLogs luôn là mảng
  const safeLogs = Array.isArray(logs) ? logs : [];

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await axios.get(`/admin/system-logs?page=${page}&limit=${limit}`);
      const safeLogs = Array.isArray(res.data.data) ? res.data.data : [];
      setLogs(safeLogs);
      setTotal(res.data.total);
    } catch (err) {
      alert('Lỗi tải log');
    }
    setLoading(false);
  }

  return (
    <div className="container mt-4">
      <h2>Nhật ký hệ thống</h2>
      {loading ? <div>Đang tải...</div> : (
        <table className="table table-bordered table-hover mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Thời gian</th>
              <th>User ID</th>
              <th>Role</th>
              <th>Action</th>
              <th>IP</th>
              <th>Chi tiết</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {safeLogs.map(log => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{formatDate(log.created_at)}</td>
                <td>{log.user_id}</td>
                <td>{log.role}</td>
                <td>{log.action_detail || log.action}</td>
                <td>{log.ip_address}</td>
                <td>
                  <button className="btn btn-sm btn-info" onClick={() => setSelectedLog(log)}>
                    Xem
                  </button>
                </td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="d-flex justify-content-between align-items-center">
        <span>Tổng: {total}</span>
        <div>
          <button className="btn btn-secondary btn-sm me-2" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page}</span>
          <button className="btn btn-secondary btn-sm ms-2" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Sau</button>
        </div>
      </div>
      {/* Modal chi tiết log */}
      {selectedLog && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết log #{selectedLog.id}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedLog(null)}></button>
              </div>
              <div className="modal-body">
                <div><b>Thời gian:</b> {formatDate(selectedLog.created_at)}</div>
                <div><b>User ID:</b> {selectedLog.user_id}</div>
                <div><b>Role:</b> {selectedLog.role}</div>
                <div><b>Action:</b> {selectedLog.action_detail || selectedLog.action}</div>
                <div><b>IP:</b> {selectedLog.ip_address}</div>
                <div><b>Payload:</b>
                  <pre style={{ background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
                    {selectedLog.details ? JSON.stringify(JSON.parse(selectedLog.details), null, 2) : 'Không có'}
                  </pre>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
