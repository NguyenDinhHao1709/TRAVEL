-- SQL schema cho hệ thống quản lý du lịch
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin','staff') DEFAULT 'user',
  phone VARCHAR(20),
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  destination VARCHAR(120),
  departure_point VARCHAR(120),
  category ENUM('bien-dao','mien-bac','mien-trung','mien-nam','nuoc-ngoai','trekking','tam-linh') DEFAULT NULL,
  status ENUM('open','almost-full','closed','draft') DEFAULT 'open',
  transport ENUM('may-bay','oto-giuong-nam','tau-hoa','oto-du-lich') DEFAULT NULL,
  itinerary TEXT,
  price BIGINT,
  start_date DATE,
  end_date DATE,
  slots INT DEFAULT 0,
  image_url VARCHAR(500),
  image_urls JSON,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT,
  title VARCHAR(180) NOT NULL,
  content TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  tour_id INT,
  people_count INT NOT NULL DEFAULT 1,
  total_amount BIGINT NOT NULL DEFAULT 0,
  booking_status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  payment_status ENUM('unpaid','paid','failed','refunded') DEFAULT 'unpaid',
  payment_method VARCHAR(30) DEFAULT 'vnpay',
  vnpay_txn_ref VARCHAR(100),
  vnpay_transaction_no VARCHAR(100),
  confirmed_by_staff_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by_staff_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  tour_id INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  staff_reply TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  tour_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_tour (user_id, tour_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  info_type VARCHAR(50) DEFAULT 'Du lịch',
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(20),
  guest_count INT DEFAULT 0,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  sender_name VARCHAR(120),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  role VARCHAR(20) DEFAULT 'system',
  action VARCHAR(200) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (compatible with MariaDB 10.4)
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_tour ON bookings(tour_id);
CREATE INDEX idx_reviews_tour ON reviews(tour_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_chat_rooms_user ON chat_rooms(user_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_logs_user ON activity_logs(user_id);
