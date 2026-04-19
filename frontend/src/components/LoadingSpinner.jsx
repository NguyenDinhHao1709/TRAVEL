import React from 'react';

function LoadingSpinner({ text = 'Đang tải dữ liệu...' }) {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
      <span className="spinner-text">{text}</span>
    </div>
  );
}

export default LoadingSpinner;
