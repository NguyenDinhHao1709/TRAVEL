USE travel_management;

INSERT INTO users (full_name, email, password, role)
VALUES
('Admin System', 'admin@travel.com', '$2a$10$3euPcmQFCiblsZeEu5s7p.NzQe3fQ93fQOHv5Xw2kA6WYfDWLh3u6', 'admin'),
('Staff Support', 'staff@travel.com', '$2a$10$3euPcmQFCiblsZeEu5s7p.NzQe3fQ93fQOHv5Xw2kA6WYfDWLh3u6', 'staff'),
('Nguyen Van A', 'user@travel.com', '$2a$10$3euPcmQFCiblsZeEu5s7p.NzQe3fQ93fQOHv5Xw2kA6WYfDWLh3u6', 'user')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO tours (title, destination, itinerary, price, start_date, end_date, slots)
VALUES
('Da Nang 3N2D', 'Da Nang', 'Ngay 1: Ban dao Son Tra; Ngay 2: Ba Na Hills; Ngay 3: Bien My Khe', 3500000, '2026-04-10', '2026-04-12', 30),
('Phu Quoc 4N3D', 'Phu Quoc', 'Ngay 1: Grand World; Ngay 2: VinWonders; Ngay 3: Hon Thom; Ngay 4: Cho dem', 5500000, '2026-05-02', '2026-05-05', 25),
('Da Lat 3N2D', 'Da Lat', 'Ngay 1: Doi che Cau Dat; Ngay 2: Lang Cu Lan; Ngay 3: Cho Da Lat', 3200000, '2026-06-15', '2026-06-17', 40)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO articles (tour_id, title, content, image_url)
VALUES
(1, 'Kinh nghiệm đi Đà Nẵng 3N2D tiết kiệm', 'Bài viết chia sẻ lịch trình chi tiết, gợi ý điểm ăn uống, mẹo di chuyển và danh sách vật dụng nên chuẩn bị cho chuyến Đà Nẵng 3 ngày 2 đêm.', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80'),
(1, 'Top địa điểm check-in đẹp ở Đà Nẵng', 'Tổng hợp các địa điểm sống ảo nổi bật như bán đảo Sơn Trà, cầu Rồng, biển Mỹ Khê cùng khung giờ đẹp để chụp ảnh.', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80'),
(2, 'Review tour Phú Quốc 4N3D mới nhất', 'Đánh giá lịch trình tham quan Phú Quốc, thời gian phù hợp trong năm và chi phí dự kiến cho từng hoạt động.', 'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=1200&q=80'),
(3, 'Kinh nghiệm săn mây Đà Lạt cho người mới', 'Hướng dẫn chọn thời điểm, địa điểm săn mây nổi tiếng và các lưu ý để có trải nghiệm an toàn, trọn vẹn.', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'),
(NULL, 'Cẩm nang chuẩn bị trước khi đi tour', 'Những điều cần kiểm tra trước ngày khởi hành: giấy tờ tùy thân, lịch trình, thời tiết, thuốc cá nhân và phương án liên hệ khẩn cấp.', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80');

INSERT INTO system_logs (action, actor_role)
VALUES
('System initialized', 'system'),
('Sample data inserted', 'system');
