import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <Link to="/">Tour</Link> | <Link to="/articles">Bài viết</Link> | <Link to="/bookings">Booking</Link> | <Link to="/reviews">Review</Link> | <Link to="/dashboard">Dashboard</Link> | <Link to="/staff">Staff</Link> | <Link to="/wishlist">Wishlist</Link> | <Link to="/contact">Liên hệ</Link> | <Link to="/chatbot">Chatbot</Link> | <Link to="/upload">Upload</Link> | <Link to="/login">Đăng nhập</Link> | <Link to="/register">Đăng ký</Link>
    </nav>
  );
}

export default Navbar;
