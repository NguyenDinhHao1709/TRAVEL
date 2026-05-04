# Travel Management System — HK2 Travel

Hệ thống quản lý du lịch phục vụ 3 loại người dùng: **Customer / Staff / Admin**.

- **Frontend:** ReactJS + Vite + Bootstrap 5 + Recharts + OpenStreetMap
- **Backend:** Node.js + Express (Monolith), REST API, JWT, Socket.IO
- **Database:** MySQL / MariaDB 10.4
- **Tích hợp:** VNPAY Payment Gateway, Cloudinary (upload ảnh), Gmail SMTP (OTP + email thông báo), AI Chatbot

---

## Kiến trúc hệ thống

```
Browser
  └── Frontend (React, port 5173)
        └── API calls /api/* ──▶ Backend (Express, port 5000)
                                    ├── MySQL (travel_management)
                                    ├── Cloudinary (image upload)
                                    ├── VNPAY (payment)
                                    └── Gmail SMTP (OTP + thông báo email)
```

Backend là **monolith** — tất cả routes/controllers/services nằm trong `backend/src/`.

---

## Cấu trúc thư mục

```
travel-management/
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point, port 5000
│   │   ├── config/db.js           # MySQL connection pool
│   │   ├── controllers/           # Xử lý logic nghiệp vụ
│   │   ├── routes/                # Định nghĩa API endpoints
│   │   ├── middleware/            # Auth, rate-limit, sanitize, security, upload
│   │   ├── services/              # VNPAY, Cloudinary, Email, AI, OTP
│   │   ├── utils/jwt.js
│   │   └── sql/
│   │       ├── schema.sql         # Tạo bảng
│   │       └── seed.sql           # Dữ liệu mẫu
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router chính
│   │   ├── api/client.js          # Axios instance
│   │   ├── components/            # AppNavbar, AppFooter, ChatWidget, MapComponent, ...
│   │   ├── contexts/              # AuthContext, AppContext, ThemeContext
│   │   ├── styles/                # global.css, spinner.css
│   │   └── pages/
│   │       ├── LoginPage.jsx      # Đăng nhập (hiện/ẩn mật khẩu, quên mật khẩu OTP)
│   │       ├── RegisterPage.jsx   # Đăng ký (OTP email, hiện/ẩn mật khẩu)
│   │       ├── ContactPage.jsx    # Liên hệ
│   │       ├── AboutPage.jsx      # Giới thiệu
│   │       ├── info/              # Hướng dẫn, chính sách, FAQ
│   │       ├── customer/          # TourList, TourDetail, MyBookings, Wishlist, ...
│   │       ├── staff/             # StaffDashboardPage (xuất Excel)
│   │       └── admin/             # AdminDashboard, TourManagement, AdminArticles
│   ├── .env
│   └── package.json
└── uploads/                       # File upload tạm (local fallback)
```

---

## Tài khoản test

| Role  | Email              | Password   | Trang sau đăng nhập  |
|-------|--------------------|------------|----------------------|
| Admin | admin@travel.com   | Admin@2025 | `/admin` (Dashboard) |
| Staff | staff@travel.com   | Staff@2025 | `/staff` (Dashboard) |
| User  | user@travel.com    | User@2025  | `/` (Trang chủ)      |

> **Đăng ký tài khoản mới:** cần nhập OTP gửi qua email (hiệu lực **5 phút**).  
> Trong môi trường dev, OTP được in ra console backend: `[Auth][DEV] OTP Code: XXXXXX`

---

## Cài đặt & Chạy

### Yêu cầu
- Node.js 18+
- MySQL / MariaDB 10.4 (XAMPP)
- XAMPP đang chạy (Apache + MySQL)

### 1. Clone & cài packages

```bash
npm install           # root (nếu có)
cd backend && npm install
cd ../frontend && npm install
```

### 2. Thiết lập Database

Mở XAMPP, bật MySQL, rồi chạy:

```bash
mysql -u root < backend/src/sql/schema.sql
mysql -u root travel_management < backend/src/sql/seed.sql
```

Hoặc qua phpMyAdmin: tạo DB `travel_management`, import `schema.sql` rồi `seed.sql`.

### 3. Cấu hình backend `.env`

Tạo file `backend/.env`:

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
JWT_SECRET=your_random_secret_here

# Email (Gmail App Password)
EMAIL_USER=hk2travel@gmail.com
EMAIL_PASS=xxxx_xxxx_xxxx_xxxx

# VNPAY (sandbox)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_RETURN_URL=http://localhost:5173/payment-return

# Cloudinary (upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Cấu hình frontend `.env`

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 5. Chạy

**Terminal 1 — Backend:**
```bash
node backend/src/server.js
# hoặc: cd backend && npm run dev
```
Backend chạy tại: `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```
Frontend chạy tại: `http://localhost:5173`

---

## Tính năng theo role

### Customer (`/`)
| Tính năng | Route |
|-----------|-------|
| Xem & tìm kiếm tour (skeleton loading) | `/tours` |
| Xem chi tiết tour, bản đồ | `/tours/:id` |
| Đăng ký (OTP email, hiện/ẩn mật khẩu) | `/register` |
| Đăng nhập (hiện/ẩn mật khẩu) | `/login` |
| Quên mật khẩu (OTP email) | `/login` |
| Đặt tour & thanh toán VNPAY | `/my-bookings` |
| Email xác nhận đặt tour & thanh toán | Tự động gửi |
| Giả lập thanh toán (dev) | nút `[DEV]` trong My Bookings |
| Wishlist | `/wishlist` |
| Xem & viết đánh giá tour | `/tours/:id` |
| Trả lời phản hồi từ nhân viên | Trong trang đánh giá |
| Xem bài viết | `/articles`, `/articles/:id` |
| Chatbot AI | `/chatbot` |
| Chat trực tiếp với nhân viên | Widget chat |
| Liên hệ | `/contact` |
| Giới thiệu & thông tin | Dropdown "Giới thiệu" trên navbar |

**Trang thông tin (dropdown Giới thiệu):**
| Trang | Route |
|-------|-------|
| Về chúng tôi | `/about` |
| Hướng dẫn đặt tour | `/huong-dan-dat-tour` |
| Hướng dẫn thanh toán | `/huong-dan-thanh-toan` |
| Chính sách bảo mật | `/chinh-sach-bao-mat` |
| Điều khoản chung | `/dieu-khoan-chung` |
| Câu hỏi thường gặp | `/cau-hoi-thuong-gap` |

### Staff (`/staff`)
| Tính năng | Ghi chú |
|-----------|---------|
| Xem toàn bộ booking | |
| Xác nhận booking | Email thông báo gửi khách |
| Hủy & hoàn vé booking | Email thông báo hoàn vé gửi khách |
| Xem danh sách khách hàng | |
| Phản hồi đánh giá của khách | |
| **Xuất báo cáo Excel** đặt tour | Thư viện `xlsx` |
| Chat nội bộ với khách hàng | Socket.IO |

### Admin (`/admin`, `/admin/tours`, `/admin/articles`)
| Tính năng | Ghi chú |
|-----------|---------|
| Dashboard: Users, Tours, Bookings, Doanh thu | Biểu đồ Recharts |
| Báo cáo đặt tour theo ngày/tháng/năm | |
| Quản lý users (khóa, mở khóa, xóa, reset password) | |
| Quản lý đánh giá | |
| System logs | |
| Tạo / Sửa / Xóa tour | Upload ảnh Cloudinary |
| Tự lấy tọa độ từ tên điểm đến | Nominatim geocoding |
| Quản lý bài viết | `/admin/articles` |
| Quản lý liên hệ | Đánh dấu đã đọc |
| Quản lý nhân viên | CRUD |

---

## API Endpoints chính

### Auth — `/api/auth`
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/register/request-otp` | Gửi OTP đăng ký (hiệu lực 5 phút) |
| POST | `/register` | Xác nhận OTP, tạo tài khoản |
| POST | `/login` | Đăng nhập (JWT) |
| POST | `/refresh-token` | Làm mới access token |
| POST | `/forgot-password/request-otp` | Gửi OTP quên mật khẩu |
| POST | `/forgot-password/reset` | Đặt lại mật khẩu với OTP |
| PUT | `/change-password` | Đổi mật khẩu (đã đăng nhập) |

### Tours — `/api/tours`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/featured` | Tour nổi bật | Public |
| GET | `/` | Danh sách tour (search, filter) | Public |
| GET | `/:id` | Chi tiết tour | Public |
| POST | `/` | Tạo tour | Staff/Admin |
| PUT | `/:id` | Sửa tour | Staff/Admin |
| DELETE | `/:id` | Xóa tour | Staff/Admin |

### Bookings — `/api/bookings`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/` | Đặt tour (gửi email xác nhận) | User |
| GET | `/my` | Booking của tôi | User |
| PATCH | `/my/:id/cancel` | Hủy booking | User |
| GET | `/staff/all` | Toàn bộ booking | Staff/Admin |
| PATCH | `/staff/:id/cancel` | Hủy & hoàn vé (gửi email hoàn vé) | Staff/Admin |
| GET | `/` | Tất cả booking | Admin |
| PUT | `/:id` | Cập nhật booking | Admin/Staff |
| DELETE | `/:id` | Xóa booking | Admin |

### Payments — `/api/payments`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/vnpay/create-url` | Tạo URL thanh toán VNPAY | User |
| GET | `/vnpay/return` | Callback từ VNPAY (gửi email xác nhận) | Public |
| POST | `/dev-simulate/:bookingId` | Giả lập thanh toán (**dev only**) | User |

### Reviews — `/api/reviews`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/` | Viết đánh giá | User |
| GET | `/` | Tất cả đánh giá | Public |
| GET | `/:id` | Chi tiết đánh giá | Public |
| GET | `/my/:tourId` | Đánh giá của tôi cho tour | User |
| PUT | `/:id` | Sửa đánh giá | User |
| DELETE | `/:id/my` | Xóa đánh giá của mình | User |
| PATCH | `/staff/:id/reply` | Phản hồi đánh giá | Staff/Admin |
| PATCH | `/:id/customer-reply` | Trả lời phản hồi nhân viên | User |
| DELETE | `/:id` | Xóa đánh giá | Staff/Admin |

### Articles — `/api/articles`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/` | Danh sách bài viết | Public |
| GET | `/:id` | Chi tiết bài viết | Public |
| POST | `/` | Tạo bài viết | Admin |
| PUT | `/:id` | Sửa bài viết | Admin |
| DELETE | `/:id` | Xóa bài viết | Admin |

### Wishlists — `/api/wishlists`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/my` | Danh sách yêu thích | User |
| POST | `/` | Thêm vào wishlist | User |
| DELETE | `/my/:tourId` | Xóa khỏi wishlist | User |

### Chat — `/api/chat`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/room` | Lấy/tạo phòng chat của user | User |
| GET | `/rooms` | Tất cả phòng chat | Staff/Admin |
| GET | `/rooms/:roomId/messages` | Tin nhắn trong phòng | Auth |
| POST | `/rooms/:roomId/messages` | Gửi tin nhắn | Auth |
| PATCH | `/rooms/:roomId/close` | Đóng phòng chat | Staff/Admin |

### Contact — `/api/contact`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/` | Gửi form liên hệ | Public |
| GET | `/messages` | Xem tất cả liên hệ | Staff/Admin |
| PATCH | `/messages/:id/read` | Đánh dấu đã đọc | Staff/Admin |

### Upload — `/api/upload`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/tour` | Upload ảnh tour → Cloudinary | Admin |

### Chatbot — `/api/chatbot`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/ask` | Hỏi AI chatbot | Public |

### Admin — `/api/admin`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/dashboard` | Thống kê tổng quan | Admin |
| GET | `/users` | Danh sách users | Admin |
| GET | `/users/:userId/detail` | Chi tiết user | Admin |
| PATCH | `/users/:userId/lock` | Khóa tài khoản | Admin |
| PATCH | `/users/:userId/unlock` | Mở khóa tài khoản | Admin |
| DELETE | `/users/:userId` | Xóa user | Admin |
| PATCH | `/users/:userId/reset-password` | Reset mật khẩu | Admin |
| GET | `/logs` | Activity logs | Admin |
| GET | `/system-logs` | System logs | Admin |
| GET | `/bookings-report` | Báo cáo đặt tour | Admin |

### Staff — `/api/staff`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/customers` | Danh sách khách hàng | Staff/Admin |
| GET | `/` | Danh sách nhân viên | Admin |
| POST | `/` | Thêm nhân viên | Admin |
| PUT | `/:id` | Sửa thông tin nhân viên | Admin |
| DELETE | `/:id` | Xóa nhân viên | Admin |

---

## Email tự động

| Sự kiện | Người nhận | Nội dung |
|---------|-----------|---------|
| Đặt tour thành công | Khách hàng | Mã booking, tên tour, ngày khởi hành, số người, tổng tiền, nhắc thanh toán trong 5 phút |
| Thanh toán thành công (VNPAY / dev) | Khách hàng | Xác nhận thanh toán, mã giao dịch, chi tiết booking |
| Hủy & hoàn vé (nhân viên) | Khách hàng | Thông báo hoàn vé, số tiền hoàn trả, chi tiết booking |
| Đăng ký tài khoản | Khách hàng | Mã OTP xác nhận (hiệu lực 5 phút) |
| Quên mật khẩu | Khách hàng | Mã OTP đặt lại mật khẩu (hiệu lực 5 phút) |

---

## Quy trình thanh toán VNPAY

```
User click "Thanh toán VNPAY"
  → POST /api/payments/vnpay/create-url
  → Backend tạo URL có chữ ký HMAC-SHA512
  → Redirect sang sandbox.vnpayment.vn
  → Nhập thẻ test: 9704 0123 4567 8909, ngày hết hạn tương lai, OTP: 123456
  → VNPAY redirect về /payment-return?vnp_*=...
  → Frontend gọi GET /api/payments/vnpay/return
  → Backend verify chữ ký, cập nhật booking → paid + confirmed
  → Email xác nhận thanh toán gửi cho khách hàng
```

**Để test không cần VNPAY sandbox**, dùng nút **`[DEV] Giả lập thanh toán`** xuất hiện trong trang `/my-bookings` — chỉ hiển thị khi `NODE_ENV !== 'production'`.

---

## Bảo mật

| Lớp bảo vệ | Chi tiết |
|-----------|---------|
| JWT Authentication | Access token + Refresh token |
| Role-based Authorization | user / staff / admin |
| Rate limiting | Auth: 20 req/15 phút, OTP: 3 req/5 phút, default: 200 req/15 phút |
| Helmet | Bảo vệ HTTP headers |
| Input sanitization | Lọc XSS trên tất cả request body |
| Mật khẩu | Bcrypt hash (salt 10) |
| VNPAY | Xác thực chữ ký HMAC-SHA512 |
| OTP | Hash SHA-256, hiệu lực 5 phút, xóa sau dùng |

---

## Tối ưu hiệu năng

| Tối ưu | Chi tiết |
|--------|---------|
| OTP hash bằng SHA-256 | Nhanh hơn bcrypt, OTP chỉ sống 5 phút nên đủ an toàn |
| Song song hóa DB + hash | `Promise.all` kiểm tra email trùng + hash mật khẩu cùng lúc |
| Email fire-and-forget | Response trả client ngay, email gửi nền không chờ SMTP |
| Skeleton loading | Tour list hiển thị skeleton cards khi đang tải |
| Scroll-to-top button | Nút cuộn lên đầu trang khi scroll xuống |
| CSS animations | fadeSlideUp, fadeIn, scaleIn cho chuyển trang mượt |

---

## UX/UI nổi bật

- **Logo** hiển thị trên navbar
- **Dropdown "Giới thiệu"** với 5 trang thông tin
- **Hiện/ẩn mật khẩu** (icon 👁️/🙈) ở đăng nhập, đăng ký, quên mật khẩu
- **Loading spinner** trên nút gửi OTP, đăng nhập, đăng ký
- **Skeleton loading** khi tải danh sách tour
- **Carousel** ảnh với controls hiện khi hover
- **Scroll-to-top** button cố định góc phải
- **Dark/Light mode** (ThemeContext)
- **Chat widget** nổi trên tất cả trang

---

## Tính năng dev đặc biệt

| Tính năng | Mô tả |
|-----------|-------|
| OTP log ra console | `[Auth][DEV] OTP Code: XXXXXX` |
| Rate limiter tắt | Không chặn request khi `NODE_ENV !== 'production'` |
| Giả lập thanh toán | `POST /api/payments/dev-simulate/:bookingId` |

---

## 3rd Party Services

### Gmail SMTP (Email)
1. Bật 2FA cho Gmail
2. Tạo App Password tại: https://myaccount.google.com/apppasswords
3. Điền vào `EMAIL_USER` và `EMAIL_PASS` trong `.env`

### VNPAY Sandbox
1. Đăng ký tại: https://sandbox.vnpayment.vn/devreg/
2. Lấy TMN Code và Secret Key
3. Điền vào `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET`

### Cloudinary (Upload ảnh)
1. Đăng ký tại: https://cloudinary.com/
2. Lấy Cloud Name, API Key, API Secret
3. Điền vào các biến `CLOUDINARY_*`

### Google Maps
1. Tạo API Key tại: https://console.cloud.google.com/
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
| `chat_messages` | Tin nhắn chat |
| `activity_logs` | Log hành động nhân viên/admin |

---

## Gợi ý phát triển tiếp

- [ ] Tích hợp thanh toán thật (VNPAY production)
- [ ] Workflow hoàn thành tour tự động để mở quyền đánh giá
- [ ] Phân trang + filter nâng cao cho dashboard
- [ ] SMS notification cho staff khi có booking mới
- [ ] Export invoice PDF
- [ ] Real-time chatbot cải thiện với LLM (GPT/Claude)


---

## Kiến trúc hệ thống

```
Browser
  └── Frontend (React, port 5173)
        └── API calls /api/* ──▶ Backend (Express, port 5000)
                                    ├── MySQL (travel_management)
                                    ├── Cloudinary (image upload)
                                    ├── VNPAY (payment)
                                    └── Gmail SMTP (OTP email)
```

Backend là **monolith** — tất cả routes/controllers/services nằm trong `backend/src/`.

---

## Cấu trúc thư mục

```
travel-management/
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point, port 5000
│   │   ├── config/db.js           # MySQL connection pool
│   │   ├── controllers/           # Xử lý logic nghiệp vụ
│   │   ├── routes/                # Định nghĩa API endpoints
│   │   ├── middleware/            # Auth, rate-limit, sanitize, upload
│   │   ├── services/              # VNPAY, Cloudinary, Email, AI, OTP, CAPTCHA
│   │   ├── utils/jwt.js
│   │   └── sql/
│   │       ├── schema.sql         # Tạo bảng
│   │       └── seed.sql           # Dữ liệu mẫu
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router chính
│   │   ├── api/client.js          # Axios instance
│   │   ├── components/            # AppNavbar, AppFooter, ChatWidget, MapComponent, ...
│   │   ├── contexts/              # AuthContext, AppContext, ThemeContext
│   │   ├── styles/                # global.css, spinner.css
│   │   └── pages/
│   │       ├── LoginPage.jsx      # Đăng nhập (CAPTCHA, hiện/ẩn mật khẩu)
│   │       ├── RegisterPage.jsx   # Đăng ký (OTP email, hiện/ẩn mật khẩu)
│   │       ├── ContactPage.jsx    # Liên hệ
│   │       ├── AboutPage.jsx      # Giới thiệu
│   │       ├── info/              # Hướng dẫn, chính sách, FAQ
│   │       ├── customer/          # TourList, TourDetail, MyBookings, Wishlist, ...
│   │       ├── staff/             # StaffDashboardPage (xuất Excel)
│   │       └── admin/             # AdminDashboard, TourManagement, AdminArticles
│   ├── .env
│   └── package.json
└── uploads/                       # File upload tạm (local fallback)
```

---

## Tài khoản test

| Role  | Email              | Password   | Trang sau đăng nhập        |
|-------|--------------------|------------|----------------------------|
| Admin | admin@travel.com   | Admin@2025 | `/admin` (Dashboard)       |
| Staff | staff@travel.com   | Staff@2025 | `/staff` (Dashboard)       |
| User  | user@travel.com    | User@2025  | `/` (Trang chủ)            |

> **Đăng ký tài khoản mới:** cần nhập OTP gửi qua email (hiệu lực **5 phút**).  
> CAPTCHA đăng nhập cũng có hiệu lực **5 phút**.  
> Trong môi trường dev, OTP được in ra console backend: `[Auth][DEV] OTP Code: XXXXXX`

---

## Cài đặt & Chạy

### Yêu cầu
- Node.js 18+
- MySQL / MariaDB 10.4 (XAMPP)
- XAMPP đang chạy (Apache + MySQL)

### 1. Clone & cài packages

```bash
npm install           # root (nếu có)
cd backend && npm install
cd ../frontend && npm install
```

### 2. Thiết lập Database

Mở XAMPP, bật MySQL, rồi chạy:

```bash
mysql -u root < backend/src/sql/schema.sql
mysql -u root travel_management < backend/src/sql/seed.sql
```

Hoặc qua phpMyAdmin: tạo DB `travel_management`, import `schema.sql` rồi `seed.sql`.

### 3. Cấu hình backend `.env`

Tạo file `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=travel_management

# JWT
JWT_SECRET=your_random_secret_here

# Email (Gmail App Password)
EMAIL_USER=hk2travel@gmail.com
EMAIL_PASS=xxxx_xxxx_xxxx_xxxx

# VNPAY (sandbox)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_RETURN_URL=http://localhost:5173/payment-return

# Cloudinary (upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Cấu hình frontend `.env`

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 5. Chạy

**Terminal 1 — Backend:**
```bash
node backend/src/server.js
# hoặc: cd backend && npm run dev
```
Backend chạy tại: `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```
Frontend chạy tại: `http://localhost:5173`

---

## Tính năng theo role

### Customer (`/`)
| Tính năng | Route |
|-----------|-------|
| Xem & tìm kiếm tour (skeleton loading) | `/tours` |
| Xem chi tiết tour, bản đồ | `/tours/:id` |
| Đăng ký (OTP email, hiện/ẩn mật khẩu) | `/register` |
| Đăng nhập (CAPTCHA, hiện/ẩn mật khẩu) | `/login` |
| Quên mật khẩu (OTP email) | `/login` |
| Đặt tour & thanh toán VNPAY | `/my-bookings` |
| Giả lập thanh toán (dev) | nút `[DEV]` trong My Bookings |
| Wishlist | `/wishlist` |
| Xem bài viết | `/articles`, `/articles/:id` |
| Chatbot AI | `/chatbot` |
| Liên hệ | `/contact` |
| Giới thiệu & thông tin | Dropdown "Giới thiệu" trên navbar |

**Trang thông tin (dropdown Giới thiệu):**
| Trang | Route |
|-------|-------|
| Về chúng tôi | `/about` |
| Hướng dẫn đặt tour | `/huong-dan-dat-tour` |
| Hướng dẫn thanh toán | `/huong-dan-thanh-toan` |
| Chính sách bảo mật | `/chinh-sach-bao-mat` |
| Điều khoản chung | `/dieu-khoan-chung` |
| Câu hỏi thường gặp | `/cau-hoi-thuong-gap` |

### Staff (`/staff`)
| Tính năng | Ghi chú |
|-----------|---------|
| Xem toàn bộ booking | |
| Xác nhận / Hủy booking | |
| Xem danh sách tour | |
| **Xuất báo cáo Excel** đặt tour | Thư viện `xlsx` |
| Chat nội bộ | Socket.IO |

### Admin (`/admin`, `/admin/tours`, `/admin/articles`)
| Tính năng | Ghi chú |
|-----------|---------|
| Dashboard: Users, Tours, Bookings, Doanh thu | |
| Báo cáo đặt tour theo ngày/tháng/năm | Biểu đồ Recharts |
| Quản lý users (ban, reset password) | |
| Quản lý reviews | |
| System logs | |
| Tạo / Sửa / Xóa tour | Upload ảnh Cloudinary |
| Tự lấy tọa độ từ tên điểm đến | Nominatim geocoding |
| Quản lý bài viết | `/admin/articles` |
| Quản lý liên hệ | |

---

## API Endpoints chính

### Auth — `/api/auth`
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/captcha` | Lấy ảnh CAPTCHA (hiệu lực 5 phút) |
| POST | `/register/request-otp` | Gửi OTP đăng ký (hiệu lực 5 phút) |
| POST | `/register` | Xác nhận OTP, tạo tài khoản |
| POST | `/login` | Đăng nhập (CAPTCHA + JWT) |
| POST | `/forgot-password/request-otp` | Gửi OTP quên mật khẩu |
| POST | `/forgot-password/reset` | Đặt lại mật khẩu với OTP |
| POST | `/change-password` | Đổi mật khẩu (đã đăng nhập) |

### Tours — `/api/tours`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/` | Danh sách tour (search, filter) | Public |
| GET | `/:id` | Chi tiết tour | Public |
| POST | `/` | Tạo tour | Admin |
| PUT | `/:id` | Sửa tour | Admin |
| DELETE | `/:id` | Xóa tour | Admin |

### Bookings — `/api/bookings`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/` | Đặt tour | User |
| GET | `/my` | Booking của tôi | User |
| PATCH | `/my/:id/cancel` | Hủy booking | User |
| GET | `/staff/all` | Toàn bộ booking | Staff/Admin |
| PATCH | `/staff/:id/confirm` | Xác nhận booking | Staff/Admin |
| PATCH | `/staff/:id/cancel` | Hủy & hoàn vé | Staff/Admin |

### Payments — `/api/payments`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/vnpay/create-url` | Tạo URL thanh toán VNPAY | User |
| GET | `/vnpay/return` | Callback từ VNPAY | Public |
| POST | `/dev-simulate/:bookingId` | Giả lập thanh toán (**dev only**) | User |

### Upload — `/api/upload`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/tour` | Upload ảnh tour → Cloudinary | Admin |

### Wishlists — `/api/wishlists`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/my` | Danh sách yêu thích | User |
| POST | `/` | Thêm vào wishlist | User |
| DELETE | `/my/:tourId` | Xóa khỏi wishlist | User |

### Reviews — `/api/reviews`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/` | Viết đánh giá | User |
| GET | `/tour/:tourId` | Đánh giá của tour | Public |

### Articles — `/api/articles`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/` | Danh sách bài viết | Public |
| GET | `/:id` | Chi tiết bài viết | Public |
| POST | `/` | Tạo bài viết | Admin |
| PUT | `/:id` | Sửa bài viết | Admin |
| DELETE | `/:id` | Xóa bài viết | Admin |

### Admin — `/api/admin`
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/dashboard` | Thống kê tổng quan | Admin |
| GET | `/users` | Danh sách users | Admin |
| GET | `/logs` | System logs | Admin |
| GET | `/bookings-report` | Báo cáo đặt tour | Admin |

---

## Quy trình thanh toán VNPAY

```
User click "Thanh toán VNPAY"
  → POST /api/payments/vnpay/create-url
  → Backend tạo URL có chữ ký HMAC-SHA512
  → Redirect sang sandbox.vnpayment.vn
  → Nhập thẻ test: 9704 0123 4567 8909, ngày hết hạn tương lai, OTP: 123456
  → VNPAY redirect về /payment-return?vnp_*=...
  → Frontend gọi GET /api/payments/vnpay/return
  → Backend verify chữ ký, cập nhật booking → paid + confirmed
```

**Để test không cần VNPAY sandbox**, dùng nút **`[DEV] Giả lập thanh toán`** xuất hiện trong trang `/my-bookings` — chỉ hiển thị ở môi trường dev.

---

## Tối ưu hiệu năng

| Tối ưu | Chi tiết |
|--------|---------|
| OTP hash bằng SHA-256 | Nhanh hơn bcrypt, OTP chỉ sống 5 phút nên đủ an toàn |
| Song song hóa DB + hash | `Promise.all` kiểm tra email trùng + hash mật khẩu cùng lúc |
| Gửi email fire-and-forget | Response trả client ngay, email gửi nền không chờ SMTP |
| Skeleton loading | Tour list hiển thị skeleton cards khi đang tải |
| Scroll-to-top button | Nút cuộn lên đầu trang khi scroll xuống |
| CSS animations | fadeSlideUp, fadeIn, scaleIn cho chuyển trang mượt |

---

## UX/UI nổi bật

- **Logo** hiển thị trên navbar
- **Dropdown "Giới thiệu"** với 6 trang thông tin
- **Hiện/ẩn mật khẩu** (icon 👁️/🙈) ở đăng nhập, đăng ký, quên mật khẩu
- **Loading spinner** trên nút gửi OTP, đăng nhập, đăng ký
- **Skeleton loading** khi tải danh sách tour
- **Carousel** ảnh với controls hiện khi hover
- **Scroll-to-top** button cố định góc phải

---

## Tính năng dev đặc biệt

| Tính năng | Mô tả |
|-----------|-------|
| OTP log ra console | `[Auth][DEV] OTP Code: XXXXXX` |
| Captcha bypass | Nhập `dev_bypass` thay captcha |
| Rate limiter tắt | Không chặn request trong dev |
| Giả lập thanh toán | `POST /api/payments/dev-simulate/:bookingId` |

---

## 3rd Party Services

### Gmail SMTP (OTP email)
1. Bật 2FA cho Gmail
2. Tạo App Password tại: https://myaccount.google.com/apppasswords
3. Điền vào `EMAIL_USER` và `EMAIL_PASS` trong `.env`

### VNPAY Sandbox
1. Đăng ký tại: https://sandbox.vnpayment.vn/devreg/
2. Lấy TMN Code và Secret Key
3. Điền vào `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET`

### Cloudinary (Upload ảnh)
1. Đăng ký tại: https://cloudinary.com/
2. Lấy Cloud Name, API Key, API Secret
3. Điền vào các biến `CLOUDINARY_*`

### Google Maps
1. Tạo API Key tại: https://console.cloud.google.com/
2. Bật **Maps JavaScript API**
3. Điền vào `VITE_GOOGLE_MAPS_API_KEY` trong `frontend/.env`

---

## Database Schema (tóm tắt)

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản (role: user/staff/admin) |
| `tours` | Tour du lịch (có latitude/longitude) |
| `bookings` | Đơn đặt tour |
| `reviews` | Đánh giá tour |
| `wishlists` | Danh sách yêu thích |
| `articles` | Bài viết/tin tức |
| `contacts` | Form liên hệ |
| `system_logs` | Nhật ký hệ thống |
| `chat_messages` | Tin nhắn chat nội bộ |

---

## Gợi ý phát triển tiếp

- [ ] Tích hợp thanh toán thật (VNPAY production)
- [ ] Workflow hoàn thành tour tự động để mở quyền đánh giá
- [ ] Phân trang + filter nâng cao cho dashboard
- [ ] Email confirmation khi booking thành công
- [ ] SMS notification cho staff khi có booking mới
- [ ] Export invoice PDF
- [ ] Real-time chatbot cải thiện với LLM (GPT/Claude)
