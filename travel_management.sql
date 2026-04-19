-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th4 19, 2026 lúc 12:22 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `travel_management`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'system',
  `action` varchar(200) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `role`, `action`, `details`, `created_at`) VALUES
(1, NULL, 'system', 'System initialized', 'Seed script executed', '2026-04-19 03:20:08');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `articles`
--

CREATE TABLE `articles` (
  `id` int(11) NOT NULL,
  `tour_id` int(11) DEFAULT NULL,
  `title` varchar(180) NOT NULL,
  `content` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `articles`
--

INSERT INTO `articles` (`id`, `tour_id`, `title`, `content`, `image_url`, `created_at`, `updated_at`) VALUES
(2, 2, 'Khám phá Phú Quốc', 'Phú Quốc - hòn đảo ngọc của Việt Nam...', '/uploads/1776577631631_kzozklq0xor.jpg', '2026-04-19 03:20:08', '2026-04-19 05:47:11'),
(4, NULL, 'tphcm', 'fdsfd', '/uploads/1776577657758_oljvzkec71j.jpg', '2026-04-19 05:47:37', '2026-04-19 05:47:37');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `tour_id` int(11) DEFAULT NULL,
  `people_count` int(11) NOT NULL DEFAULT 1,
  `total_amount` bigint(20) NOT NULL DEFAULT 0,
  `booking_status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `payment_status` enum('unpaid','paid','failed','refunded') DEFAULT 'unpaid',
  `payment_method` varchar(30) DEFAULT 'vnpay',
  `vnpay_txn_ref` varchar(100) DEFAULT NULL,
  `vnpay_transaction_no` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `confirmed_by_staff_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `bookings`
--

INSERT INTO `bookings` (`id`, `user_id`, `tour_id`, `people_count`, `total_amount`, `booking_status`, `payment_status`, `payment_method`, `vnpay_txn_ref`, `vnpay_transaction_no`, `created_at`, `updated_at`, `confirmed_by_staff_id`) VALUES
(6, 4, 1, 1, 3500000, 'cancelled', 'unpaid', 'vnpay', '6_1776570835016', NULL, '2026-04-19 03:48:59', '2026-04-19 03:54:00', NULL),
(7, 4, 1, 1, 3500000, 'cancelled', 'refunded', 'dev_simulate', '7_1776570976678', NULL, '2026-04-19 03:56:00', '2026-04-19 05:09:31', NULL),
(8, 4, 1, 1, 3500000, 'confirmed', 'paid', 'dev_simulate', NULL, NULL, '2026-04-19 04:59:24', '2026-04-19 04:59:26', NULL),
(9, 4, 3, 1, 7200000, 'confirmed', 'paid', 'dev_simulate', NULL, NULL, '2026-04-19 04:59:44', '2026-04-19 04:59:45', NULL),
(10, 4, 2, 1, 5500000, 'cancelled', 'unpaid', 'vnpay', NULL, NULL, '2026-04-19 06:42:43', '2026-04-19 06:42:48', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_role` varchar(20) NOT NULL,
  `sender_name` varchar(120) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `room_id`, `sender_id`, `sender_role`, `sender_name`, `message`, `created_at`) VALUES
(1, 1, 3, 'user', 'User Updated', 'Hello from test!', '2026-04-19 03:35:43'),
(2, 1, 3, 'user', 'User Updated', 'Hello from test!', '2026-04-19 03:36:32'),
(3, 1, 3, 'user', 'User Updated', 'Hello from test!', '2026-04-19 03:37:00'),
(4, 1, 3, 'user', 'User Updated', 'Hello from test!', '2026-04-19 03:37:55'),
(5, 2, 4, 'user', 'User', 'hi', '2026-04-19 03:52:19'),
(6, 2, 4, 'user', 'User', 'g', '2026-04-19 03:52:22'),
(7, 2, 2, 'staff', 'Nhân viên HK2', 'hi', '2026-04-19 04:40:32'),
(8, 2, 2, 'staff', 'Nhân viên HK2', 'hi', '2026-04-19 04:40:38'),
(9, 2, 4, 'user', 'User', 'alo', '2026-04-19 05:03:41'),
(10, 2, 4, 'user', 'User', 'alo', '2026-04-19 05:05:07'),
(11, 2, 4, 'user', 'User', 'hoàn tiền', '2026-04-19 05:05:12'),
(12, 2, 2, 'staff', 'Nhân viên HK2', 'oke', '2026-04-19 05:05:23'),
(13, 2, 2, 'staff', 'User', 'ck', '2026-04-19 05:07:57'),
(14, 2, 2, 'staff', 'User', 'bao nhiêu', '2026-04-19 05:08:10'),
(15, 2, 4, 'user', 'User', 'ht', '2026-04-19 05:08:56');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chat_rooms`
--

CREATE TABLE `chat_rooms` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `last_message` text DEFAULT NULL,
  `last_message_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chat_rooms`
--

INSERT INTO `chat_rooms` (`id`, `user_id`, `status`, `last_message`, `last_message_at`, `created_at`, `updated_at`) VALUES
(1, 3, 'open', 'Hello from test!', '2026-04-19 03:37:55', '2026-04-19 03:35:43', '2026-04-19 03:37:55'),
(2, 4, 'open', 'ht', '2026-04-19 05:08:56', '2026-04-19 03:48:07', '2026-04-19 05:08:56');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL,
  `info_type` varchar(50) DEFAULT 'Du lß╗ïch',
  `full_name` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `guest_count` int(11) DEFAULT 0,
  `subject` varchar(200) DEFAULT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `contact_messages`
--

INSERT INTO `contact_messages` (`id`, `info_type`, `full_name`, `email`, `phone`, `guest_count`, `subject`, `message`, `is_read`, `created_at`, `updated_at`) VALUES
(1, 'Du lịch', 'Test Contact', 'testcontact@gmail.com', '0901111111', 0, NULL, 'Test message from API test', 0, '2026-04-19 03:34:41', '2026-04-19 03:34:41'),
(2, 'Du lịch', 'Test Contact', 'testcontact@gmail.com', '0901111111', 0, NULL, 'Test message from API test', 0, '2026-04-19 03:35:43', '2026-04-19 03:35:43'),
(3, 'Du lịch', 'Test Contact', 'testcontact@gmail.com', '0901111111', 0, NULL, 'Test message from API test', 0, '2026-04-19 03:36:32', '2026-04-19 03:36:32'),
(4, 'Du lịch', 'Test Contact', 'testcontact@gmail.com', '0901111111', 0, NULL, 'Test message from API test', 0, '2026-04-19 03:37:00', '2026-04-19 03:37:00'),
(5, 'Du lịch', 'Test Contact', 'testcontact@gmail.com', '0901111111', 0, NULL, 'Test message from API test', 0, '2026-04-19 03:37:55', '2026-04-19 03:37:55');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `tour_id` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `staff_reply` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reply_staff_name` varchar(120) DEFAULT NULL,
  `staff_reply_at` datetime DEFAULT NULL,
  `customer_reply` text DEFAULT NULL,
  `customer_reply_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `reviews`
--

INSERT INTO `reviews` (`id`, `user_id`, `tour_id`, `rating`, `comment`, `staff_reply`, `status`, `created_at`, `updated_at`, `reply_staff_name`, `staff_reply_at`, `customer_reply`, `customer_reply_at`) VALUES
(3, 4, 1, 5, NULL, NULL, 'approved', '2026-04-19 03:48:16', '2026-04-19 03:48:16', NULL, NULL, NULL, NULL),
(5, 4, 2, 1, 'hiiii', NULL, 'approved', '2026-04-19 04:13:26', '2026-04-19 04:50:13', NULL, NULL, NULL, NULL),
(7, 4, 3, 5, 'giá rẻ tuyệt vời', NULL, 'approved', '2026-04-19 06:59:54', '2026-04-19 06:59:54', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tours`
--

CREATE TABLE `tours` (
  `id` int(11) NOT NULL,
  `title` varchar(180) NOT NULL,
  `destination` varchar(120) DEFAULT NULL,
  `itinerary` text DEFAULT NULL,
  `price` bigint(20) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `slots` int(11) DEFAULT 0,
  `image_url` varchar(500) DEFAULT NULL,
  `image_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`image_urls`)),
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tours`
--

INSERT INTO `tours` (`id`, `title`, `destination`, `itinerary`, `price`, `start_date`, `end_date`, `slots`, `image_url`, `image_urls`, `latitude`, `longitude`, `created_at`, `updated_at`) VALUES
(1, 'Tour Đà Nẵng 3N2D', 'Đà Nẵng', 'Ngày 1: TP.HCM - Đà Nẵng\nNgày 2: Bà Nà Hills - Cầu Vàng\nNgày 3: Phố Cổ Hội An - TP.HCM', 3500000, '2026-06-09', '2026-06-11', 29, 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80', '[\"https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80\"]', 16.06800000, 108.21200000, '2026-04-19 03:20:08', '2026-04-19 06:56:42'),
(2, 'Tour Phú Quốc 4N3D', 'Phú Quốc', 'Ngày 1: TP.HCM - Phú Quốc\nNgày 2: Safari & Cáp treo\nNgày 3: Hòn Thơm\nNgày 4: Về TP.HCM', 5500000, '2026-06-29', '2026-07-02', 25, '/uploads/1776577692670_0ioey2drwbo9.jpg', '[\"/uploads/1776577692670_0ioey2drwbo9.jpg\"]', 10.22878560, 104.01435920, '2026-04-19 03:20:08', '2026-04-19 06:57:02'),
(3, 'Tour Hà Nội - Hạ Long 5N4D', 'Hạ Long', 'Ngày 1: Bay ra Hà Nội\nNgày 2-4: Vịnh Hạ Long\nNgày 5: Về TP.HCM', 7200000, '2026-08-13', '2026-08-17', 19, '/uploads/1776577713936_t5qtx35xww.jpg', '[\"/uploads/1776577713936_t5qtx35xww.jpg\"]', 20.94725560, 107.11646730, '2026-04-19 03:20:08', '2026-04-19 06:56:50'),
(10, 'Nghệ An', 'Nghệ An', 'Quê Bác', 10000000, '2026-04-24', '2026-04-25', 20, '/uploads/1776581455625_51w85lv62jt.jpg', '[\"/uploads/1776581455625_51w85lv62jt.jpg\"]', 19.19760010, 105.06067600, '2026-04-19 06:50:57', '2026-04-19 06:55:43');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','staff') DEFAULT 'user',
  `phone` varchar(20) DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role`, `phone`, `is_locked`, `must_change_password`, `created_at`, `updated_at`) VALUES
(1, 'Quản trị viên', 'admin@travel.com', '$2a$10$yxff.yBGF6ap/RlV6erb/OjFbkHbaUFdKkjJqNAMnZCsr292lz2q.', 'admin', NULL, 0, 0, '2026-04-19 03:20:08', '2026-04-19 03:20:08'),
(2, 'Nhân viên HK2', 'staff@travel.com', '$2a$10$KU9UZYV9XtHU57tYMAFta.3YJ.yg5urxT/TWKA07x1F1m0/ftn.72', 'staff', NULL, 0, 0, '2026-04-19 03:20:08', '2026-04-19 03:20:08'),
(3, 'User Updated', 'user@travel.com', '$2a$10$aYaQnsBdRHzBH4kjshMBOuTfjfmlaXOy5gJfHvto0pya8qPb4PIz.', 'user', '0901234567', 0, 0, '2026-04-19 03:20:08', '2026-04-19 03:37:55'),
(4, 'NguyenDinhHao', 'nguyendinhhao170909@gmail.com', '$2a$10$BpJwwtP2N4DFLWbbAskmdesljTCkJjl.1.FBlnMvQayIU3Gt03RB2', 'user', NULL, 0, 0, '2026-04-19 03:48:07', '2026-04-19 07:06:32');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `wishlists`
--

CREATE TABLE `wishlists` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `tour_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `wishlists`
--

INSERT INTO `wishlists` (`id`, `user_id`, `tour_id`, `created_at`) VALUES
(6, 4, 1, '2026-04-19 03:48:58');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logs_user` (`user_id`);

--
-- Chỉ mục cho bảng `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tour_id` (`tour_id`);

--
-- Chỉ mục cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_user` (`user_id`),
  ADD KEY `idx_bookings_tour` (`tour_id`);

--
-- Chỉ mục cho bảng `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_messages_room` (`room_id`);

--
-- Chỉ mục cho bảng `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_rooms_user` (`user_id`);

--
-- Chỉ mục cho bảng `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reviews_tour` (`tour_id`),
  ADD KEY `idx_reviews_user` (`user_id`);

--
-- Chỉ mục cho bảng `tours`
--
ALTER TABLE `tours`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Chỉ mục cho bảng `wishlists`
--
ALTER TABLE `wishlists`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_tour` (`user_id`,`tour_id`),
  ADD KEY `tour_id` (`tour_id`),
  ADD KEY `idx_wishlists_user` (`user_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `articles`
--
ALTER TABLE `articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT cho bảng `chat_rooms`
--
ALTER TABLE `chat_rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `tours`
--
ALTER TABLE `tours`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `wishlists`
--
ALTER TABLE `wishlists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `articles`
--
ALTER TABLE `articles`
  ADD CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD CONSTRAINT `chat_rooms_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `wishlists`
--
ALTER TABLE `wishlists`
  ADD CONSTRAINT `wishlists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `wishlists_ibfk_2` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
