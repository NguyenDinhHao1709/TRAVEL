-- ALTER TABLE cho bảng system_logs để đảm bảo đầy đủ các trường cần thiết cho nhật ký hệ thống
ALTER TABLE system_logs
  ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'system' AFTER user_id,
  ADD COLUMN IF NOT EXISTS action VARCHAR(200) NOT NULL AFTER role,
  ADD COLUMN IF NOT EXISTS action_detail TEXT AFTER action,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) AFTER action_detail,
  ADD COLUMN IF NOT EXISTS details JSON AFTER ip_address,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER details,
  ADD CONSTRAINT fk_system_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Nếu cột đã tồn tại, MySQL sẽ báo lỗi, bạn có thể chạy từng lệnh riêng lẻ nếu cần.
-- Đảm bảo bảng system_logs có đủ các trường trên để ghi nhận chi tiết mọi hành động.