# Travel Management System — HK2 Travel

Hệ thống quản lý du lịch phục vụ 3 loại người dùng: **Customer / Staff / Admin**.

- **Frontend:** ReactJS 18 + Vite + Bootstrap 5 + Recharts
- **Backend:** Node.js + Express 4 (Monolith), REST API, JWT, Socket.IO
- **Database:** MySQL (Clever Cloud)
- **Tích hợp:** PayOS/VietQR (thanh toán), Cloudinary (upload ảnh), Brevo API (email), AI Chatbot
- **Triển khai:** Backend trên [Render.com](https://render.com), Frontend trên cPanel (`hk2travel.io.vn`)

---

## Kiến trúc hệ thống

```
Browser
  └── Frontend (React + Vite — hk2travel.io.vn)
        └── API calls /api/* ──▶ Backend (Express — Render.com)
                                    ├── MySQL (Clever Cloud)
                                    ├── Cloudinary (image upload)
                                    ├── PayOS / SePay (payment webhook)
                                    └── Brevo HTTP API (email)
```

**Production URLs:**
- Frontend: `https://hk2travel.io.vn`
- Backend API: `https://travel-management-backend-b4pr.onrender.com/api`

---

## Cấu trúc thư mục

```
travel-management/
├── sim-pay.js                     # Script giả lập SePay webhook (dev)
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point, port 10000
│   │   ├── config/db.js           # MySQL connection pool
│   │   ├── controllers/           # Logic nghiệp vụ
│   │   ├── routes/                # API endpoints
│   │   ├── middleware/            # auth, rate-limit, sanitize, security, upload
│   │   ├── services/              # email, payment, cloudinary, AI, OTP, log-rotation
│   │   ├── utils/jwt.js
│   │   └── sql/
│   │       ├── schema.sql         # Tạo bảng
│   │       └── seed.sql           # Dữ liệu mẫu
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                # Router chính
    │   ├── api/client.js          # Axios instance
    │   ├── components/            # Navbar, Footer, ChatWidget, MapComponent, ...
    │   ├── contexts/              # AuthContext, AppContext, ThemeContext
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── ContactPage.jsx
    │   │   ├── AboutPage.jsx
    │   │   ├── info/              # Hướng dẫn, chính sách, FAQ
    │   │   ├── customer/          # TourList, TourDetail, MyBookings, Payment, Wishlist, ...
    │   │   ├── staff/             # StaffDashboardPage
    │   │   └── admin/             # AdminDashboard, TourManagement, Articles, SystemLogs
    │   └── styles/
    └── package.json
```

---

## Tài khoản test

| Role  | Email              | Password   | Trang sau đăng nhập    |
|-------|--------------------|------------|------------------------|
| Admin | admin@travel.com   | 123456 | `/admin`               |
| Staff | staff@travel.com   | 123456 | `/staff`               |
| User  | user@travel.com    | User@2025  | `/` (Trang chủ)        |

> **Đăng ký tài khoản mới:** cần nhập OTP gửi qua email (hiệu lực **5 phút**).
> Trong môi trường dev, OTP in ra console: `[Auth][DEV] OTP Code: XXXXXX`

---

## Cài đặt & Chạy (local)

### Yêu cầu
- Node.js 18+
- MySQL / MariaDB (XAMPP hoặc cloud)

### 1. Clone & cài packages

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Thiết lập Database

```bash
mysql -u root < backend/src/sql/schema.sql
mysql -u root travel_management < backend/src/sql/seed.sql
```

### 3. Cấu hình `backend/.env`

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=travel_management

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email — Brevo HTTP API (không bị chặn trên cloud hosting)
BREVO_API_KEY=xkeysib-your-api-key
BREVO_SMTP_FROM=your-email@gmail.com

# PayOS (thanh toán QR)
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# SePay (webhook)
SEPAY_APIKEY=your_sepay_api_key
SEPAY_CHECKSUM_KEY=your_checksum_key

# Tài khoản ngân hàng nhận tiền
BANK_ID=your_bank_id
ACCOUNT_NUMBER=your_account_number

# Cloudinary (upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Chatbot (tùy chọn)
GEMINI_API_KEY=your_gemini_key
```

### 4. Cấu hình `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 5. Chạy

```bash
# Terminal 1 — Backend
cd backend && npm run dev     # port 5000

# Terminal 2 — Frontend
cd frontend && npm run dev    # port 5173
```

---

## Tính năng theo role

### Customer

| Tính năng | Route |
|-----------|-------|
| Xem & tìm kiếm tour (skeleton loading) | `/tours` |
| Xem chi tiết tour + bản đồ | `/tours/:id` |
| Đăng ký (OTP email) | `/register` |
| Đăng nhập | `/login` |
| Quên mật khẩu (OTP email) | `/login` |
| Đặt tour | `/tours/:id` |
| Thanh toán QR (PayOS/VietQR) | `/payment/:bookingId` |
| Lịch sử đặt tour | `/my-bookings` |
| Lịch sử thanh toán | `/my-payments` |
| Dashboard cá nhân | `/customer-dashboard` |
| Wishlist | `/wishlist` |
| Xem & viết đánh giá | `/tours/:id` |
| Xem bài viết | `/articles`, `/articles/:id` |
| AI Chatbot | `/chatbot` |
| Chat trực tiếp với nhân viên | Widget chat (Socket.IO) |
| Liên hệ | `/contact` |

**Trang thông tin (dropdown Giới thiệu):**

| Trang | Route |
|-------|-------|
| Về chúng tôi | `/about` |
| Hướng dẫn đặt tour | `/huong-dan-dat-tour` |
| Hướng dẫn thanh toán | `/huong-dan-thanh-toan` |
| Chính sách bảo mật | `/chinh-sach-bao-mat` |
| Điều khoản chung | `/dieu-khoan-chung` |
| Câu hỏi thường gặp | `/cau-hoi-thuong-gap` |

---

### Staff (`/staff`)

| Tính năng | Ghi chú |
|-----------|---------|
| Xem & xác nhận / hủy booking | Gửi email thông báo khách |
| Xem danh sách khách hàng | |
| Phản hồi đánh giá của khách | |
| Quản lý tour | `/staff/tours` |
| Quản lý bài viết | `/staff/articles` |
| **Xuất báo cáo Excel** | Thư viện `xlsx` |
| Chat nội bộ với khách | Socket.IO |

---

### Admin (`/admin`)

| Tính năng | Ghi chú |
|-----------|---------|
| Dashboard: Users, Tours, Bookings, Doanh thu | Biểu đồ Recharts |
| Báo cáo đặt tour theo ngày/tháng/năm | |
| Quản lý users (khóa, mở khóa, xóa, reset password) | Email mật khẩu tạm thời |
| Quản lý đánh giá | |
| System logs | `/admin/system-logs` |
| Tạo / Sửa / Xóa tour | Upload ảnh Cloudinary, geocoding tự động |
| Quản lý bài viết | `/admin/articles` |
| Quản lý liên hệ | Đánh dấu đã đọc |
| Quản lý nhân viên | CRUD |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register/request-otp` | Gửi OTP đăng ký (5 phút) | Public |
| POST | `/register` | Xác nhận OTP, tạo tài khoản | Public |
| POST | `/login` | Đăng nhập → JWT | Public |
| POST | `/refresh-token` | Làm mới access token | Public |
| POST | `/forgot-password/request-otp` | Gửi OTP quên mật khẩu | Public |
| POST | `/forgot-password/reset` | Đặt lại mật khẩu bằng OTP | Public |
| PUT | `/change-password` | Đổi mật khẩu | User |

### Tours — `/api/tours`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/featured` | Tour nổi bật | Public |
| GET | `/` | Danh sách tour (search, filter) | Public |
| GET | `/:id` | Chi tiết tour | Public |
| POST | `/` | Tạo tour | Staff/Admin |
| PUT | `/:id` | Sửa tour | Staff/Admin |
| DELETE | `/:id` | Xóa tour | Staff/Admin |

### Bookings — `/api/bookings`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Đặt tour | User |
| GET | `/my` | Booking của tôi | User |
| PATCH | `/my/:bookingId/cancel` | Hủy booking | User |
| GET | `/staff/all` | Toàn bộ booking | Staff/Admin |
| PATCH | `/staff/:id/cancel` | Hủy & hoàn vé | Staff/Admin |
| GET | `/` | Tất cả booking | Admin |
| GET | `/:id` | Chi tiết booking | Admin/Staff |
| PUT | `/:id` | Cập nhật booking | Admin/Staff |
| DELETE | `/:id` | Xóa booking | Admin |

### Payments — `/api/payments`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/vietqr/create` | Tạo link/QR thanh toán PayOS | User |
| GET | `/status/:bookingId` | Kiểm tra trạng thái thanh toán | User |
| POST | `/webhook/sepay` | Webhook SePay (xác nhận thanh toán) | Public |
| POST | `/webhook/payos` | Webhook PayOS | Public |

### Reviews — `/api/reviews`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Viết đánh giá | User |
| GET | `/` | Tất cả đánh giá | Public |
| GET | `/:id` | Chi tiết đánh giá | Public |
| GET | `/my/:tourId` | Đánh giá của tôi | User |
| PUT | `/:id` | Sửa đánh giá | User |
| DELETE | `/:id/my` | Xóa đánh giá của mình | User |
| PATCH | `/:id/customer-reply` | Trả lời phản hồi nhân viên | User |
| GET | `/staff/all` | Tất cả đánh giá | Staff/Admin |
| PATCH | `/staff/:id/reply` | Phản hồi đánh giá | Staff/Admin |
| DELETE | `/:id` | Xóa đánh giá | Staff/Admin |

### Wishlists — `/api/wishlists`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/my` | Danh sách yêu thích | User |
| POST | `/` | Thêm vào wishlist | User |
| DELETE | `/my/:tourId` | Xóa khỏi wishlist | User |

### Articles — `/api/articles`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách bài viết | Public |
| GET | `/:id` | Chi tiết bài viết | Public |
| POST | `/` | Tạo bài viết | Admin/Staff |
| PUT | `/:id` | Sửa bài viết | Admin/Staff |
| DELETE | `/:id` | Xóa bài viết | Admin/Staff |

### Chat — `/api/chat`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/room` | Lấy/tạo phòng chat | User |
| GET | `/rooms` | Tất cả phòng chat | Staff/Admin |
| GET | `/rooms/:roomId/messages` | Tin nhắn trong phòng | Auth |
| POST | `/rooms/:roomId/messages` | Gửi tin nhắn | Auth |
| PATCH | `/rooms/:roomId/close` | Đóng phòng chat | Staff/Admin |

### Contact — `/api/contact`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/` | Gửi form liên hệ | Public |
| GET | `/messages` | Xem tất cả liên hệ | Staff/Admin |
| PATCH | `/messages/:id/read` | Đánh dấu đã đọc | Staff/Admin |

### Upload — `/api/upload`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/tour` | Upload ảnh tour → Cloudinary | Admin/Staff |

### Chatbot — `/api/chatbot`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/ask` | Hỏi AI chatbot | Public |

### Admin — `/api/admin`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/dashboard` | Thống kê tổng quan | Admin |
| GET | `/users` | Danh sách users | Admin |
| GET | `/users/:userId/detail` | Chi tiết user | Admin |
| PATCH | `/users/:userId/lock` | Khóa tài khoản | Admin |
| PATCH | `/users/:userId/unlock` | Mở khóa tài khoản | Admin |
| DELETE | `/users/:userId` | Xóa user | Admin |
| PATCH | `/users/:userId/reset-password` | Reset mật khẩu (gửi email) | Admin |
| GET | `/logs` | Activity logs | Admin |
| GET | `/system-logs` | System logs | Admin |
| GET | `/bookings-report` | Báo cáo đặt tour | Admin |

### Staff — `/api/staff`

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/customers` | Danh sách khách hàng | Staff/Admin |
| GET | `/` | Danh sách nhân viên | Admin |
| POST | `/` | Thêm nhân viên | Admin |
| PUT | `/:id` | Sửa thông tin nhân viên | Admin |
| DELETE | `/:id` | Xóa nhân viên | Admin |

---

## Quy trình thanh toán (PayOS/VietQR)

```
User chọn tour → Đặt tour
  → POST /api/bookings                   (tạo booking, trạng thái: pending)
  → POST /api/payments/vietqr/create     (tạo QR code)
  → Frontend hiển thị QR tại /payment/:bookingId
  → User quét QR bằng app ngân hàng → chuyển tiền
  → SePay/PayOS gửi webhook → POST /api/payments/webhook/sepay
  → Backend xác thực checksum → cập nhật booking: paid + confirmed
  → Gửi email xác nhận cho khách
```

**Test thanh toán ở local**, dùng script giả lập:
```bash
node sim-pay.js <bookingId>
```

---

## Email tự động

Gửi qua **Brevo HTTP API** (HTTPS port 443 — không bị chặn trên cloud hosting).

| Sự kiện | Người nhận | Nội dung |
|---------|-----------|---------|
| Đặt tour thành công | Khách hàng | Thông tin booking, yêu cầu thanh toán |
| Thanh toán thành công | Khách hàng | Xác nhận thanh toán, chi tiết booking |
| Hủy & hoàn vé (nhân viên) | Khách hàng | Thông báo hoàn vé |
| Đăng ký tài khoản | Khách hàng | Mã OTP (5 phút) |
| Quên mật khẩu | Khách hàng | Mã OTP đặt lại mật khẩu (5 phút) |
| Đổi mật khẩu | Khách hàng | Thông báo bảo mật |
| Admin reset password | Khách hàng | Mật khẩu tạm thời |

---

## Bảo mật

| Lớp bảo vệ | Chi tiết |
|-----------|---------|
| JWT Authentication | Access token + Refresh token |
| Role-based Authorization | user / staff / admin |
| Rate limiting | Auth: 20 req/15 phút, OTP: 3 req/5 phút, mặc định: 200 req/15 phút |
| Helmet | Bảo vệ HTTP headers |
| Input sanitization | Lọc XSS trên tất cả request body |
| Mật khẩu | Bcrypt hash (salt rounds 10) |
| PayOS Webhook | Xác thực checksum key |
| OTP | Hash SHA-256, hiệu lực 5 phút, xóa sau dùng |

---

## Tối ưu hiệu năng

| Tối ưu | Chi tiết |
|--------|---------|
| OTP hash SHA-256 | Nhanh hơn bcrypt, OTP sống 5 phút nên đủ an toàn |
| Promise.all | Kiểm tra email trùng + hash mật khẩu song song |
| Email fire-and-forget | Response trả client ngay, email gửi nền qua Brevo API |
| Skeleton loading | Tour list hiển thị skeleton cards khi đang tải |
| Log rotation | Tự động xóa log cũ qua node-cron |
| CSS animations | fadeSlideUp, fadeIn, scaleIn cho chuyển trang mượt |

---

## UX/UI nổi bật

- **Dark/Light mode** (ThemeContext)
- **Dropdown "Giới thiệu"** với 6 trang thông tin
- **Hiện/ẩn mật khẩu** ở đăng nhập, đăng ký, quên mật khẩu
- **Skeleton loading** khi tải danh sách tour
- **Carousel** ảnh tour với controls khi hover
- **Scroll-to-top** button cố định góc phải
- **Chat widget** nổi trên tất cả trang (Socket.IO)
- **QR Code** hiển thị để thanh toán (`react-qr-code`)
- **Bản đồ** tọa độ tour (`@react-google-maps/api`)

---

## Tính năng dev đặc biệt

| Tính năng | Mô tả |
|-----------|-------|
| OTP log ra console | `[Auth][DEV] OTP Code: XXXXXX` |
| Giả lập thanh toán | `node sim-pay.js <bookingId>` |

---

## Cấu hình 3rd Party Services

### Brevo API (Email)
1. Đăng ký miễn phí tại: https://app.brevo.com (300 email/ngày)
2. **Settings** → **SMTP et API** → **Clés API et MCP** → tạo API key
3. Thêm `BREVO_API_KEY` và `BREVO_SMTP_FROM` vào Render Environment

### PayOS (Thanh toán QR)
1. Đăng ký tại: https://payos.vn
2. Lấy `Client ID`, `API Key`, `Checksum Key`
3. Điền vào `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`

### SePay (Webhook xác nhận thanh toán)
1. Đăng ký tại: https://sepay.vn
2. Cấu hình webhook URL: `https://your-backend.onrender.com/api/payments/webhook/sepay`
3. Điền `SEPAY_APIKEY`, `SEPAY_CHECKSUM_KEY`

### Cloudinary (Upload ảnh)
1. Đăng ký tại: https://cloudinary.com
2. Lấy Cloud Name, API Key, API Secret
3. Điền vào `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Google Maps
1. Tạo API Key tại: https://console.cloud.google.com
2. Bật **Maps JavaScript API**
3. Điền vào `VITE_GOOGLE_MAPS_API_KEY` trong `frontend/.env`

---

## Database Schema (tóm tắt)

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản (role: user/staff/admin) |
| `tours` | Tour du lịch (có latitude/longitude) |
| `bookings` | Đơn đặt tour |
| `reviews` | Đánh giá tour (hỗ trợ reply 2 chiều) |
| `wishlists` | Danh sách yêu thích |
| `articles` | Bài viết/tin tức |
| `contacts` | Form liên hệ |
| `system_logs` | Nhật ký hệ thống |
| `chat_rooms` | Phòng chat |
| `chat_messages` | Tin nhắn chat |
| `activity_logs` | Log hành động nhân viên/admin |
