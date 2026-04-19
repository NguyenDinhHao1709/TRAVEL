import React from 'react';

function ApiStatus({ status }) {
  if (status === 'loading') return <div>Đang tải dữ liệu...</div>;
  if (status === 'error') return <div style={{color:'red'}}>Lỗi kết nối API!</div>;
  if (status === 'success') return <div style={{color:'green'}}>Kết nối API thành công!</div>;
  return null;
}

export default ApiStatus;
