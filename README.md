# Travel Management System (MVP)

Hệ thống quản lý du lịch theo quy trình User / Staff / Admin, sử dụng:
- Frontend: ReactJS, Bootstrap 5, React Router DOM, Axios, Recharts, Google Maps API
- Backend: Node.js, Express, RESTful API, JWT, Multer, Cloudinary
- Database: MySQL
- Tích hợp:
  - VNPAY Payment Gateway (Sandbox)
  - Google Maps (tour location, itinerary mapping)
  - Cloudinary (image upload)
  - AI Chatbot (tour recommendation)

## Kiến trúc hệ thống

Hệ thống theo mô hình **Microservices + API Gateway**:

- **Frontend (React + Vite, port 5173):** giao diện cho Customer/Staff/Admin.
- **API Gateway (port 8080):** điểm vào API duy nhất cho frontend.
- **Domain services (5001-5010):** auth, tour, booking, payment, wishlist, review, upload, chatbot, staff, admin.
- **Fallback service (port 5000):** giữ các module chưa tách hoàn toàn.
- **Database (MySQL):** dữ liệu dùng chung.
- **Dịch vụ ngoài:** VNPAY/MoMo, Cloudinary, Google Maps, AI Chatbot.

```mermaid
flowchart LR
   U[User/Staff/Admin Browser]\nReact SPA
   F[Frontend\nVite + React]
   GW[API Gateway\nNode.js + Express]
   S1[Auth/Tour/Booking/Payment]
   S2[Wishlist/Review/Upload]
   S3[Chatbot/Staff/Admin]
   FB[Fallback Monolith]
   DB[(MySQL)]
   C[Cloudinary]
   V[VNPAY/MoMo]
   G[Google Maps API]
   A[AI Service]

   U --> F
   F -->|HTTP REST /api/*| GW
   GW --> S1
   GW --> S2
   GW --> S3
   GW --> FB
   S1 <--> DB
   S2 <--> DB
   S3 <--> DB
   FB <--> DB
   S1 --> V
   S2 --> C
   S3 --> A
   F --> G
```

### Nguyên tắc giao tiếp giữa các thành phần

- Frontend gọi API Gateway qua REST API (`/api/*`) bằng Axios.
- Mỗi service tổ chức theo tầng `routes -> controllers -> services -> db`.
- Xác thực dùng JWT Bearer token và middleware phân quyền theo role.

### Luồng nghiệp vụ tiêu biểu

1. **Đăng nhập:** Frontend -> Gateway -> Auth service -> MySQL -> JWT.
2. **Đặt tour:** Frontend -> Gateway -> Booking service -> MySQL.
3. **Thanh toán:** Frontend -> Gateway -> Payment service -> VNPAY/MoMo -> callback.
4. **Upload ảnh:** Frontend -> Gateway -> Upload service -> Cloudinary -> MySQL.
5. **Chatbot:** Frontend -> Gateway -> Chatbot service -> AI provider -> MySQL.

## 1) Cấu trúc dự án

```
travel-management/
  backend/
      microservices/
         gateway/
         auth-service/
         tour-service/
         booking-service/
         payment-service/
         wishlist-service/
         review-service/
         upload-service/
         chatbot-service/
         staff-service/
         admin-service/
         common/
         scripts/
    src/
      controllers/
      middleware/
      routes/
      services/ (VNPAY, Cloudinary)
      server.js
    sql/schema.sql
    sql/seed.sql
  frontend/
    src/
      components/ (MapComponent, ImageUpload)
      pages/ (customer, staff, admin)
      App.jsx
```

## 2) Thiết lập 3rd party services

### 2A. VNPAY (Thanh toán)
1. Đăng ký tài khoản tại: https://vnpayment.vn/
2. Lấy **TMN Code** và **Secret Key** từ dashboard
3. Thêm vào `.env`:
   ```
   VNPAY_MODE=sandbox
   VNPAY_TMN_CODE=REPLACE_WITH_REAL_TMN_CODE
   VNPAY_SECRET_KEY=REPLACE_WITH_REAL_SECRET_KEY
   VNPAY_RETURN_URL=http://localhost:5173/payment-return
   ```
4. Nếu chạy production: đổi `VNPAY_MODE=production`.
5. Có thể override URL bằng tay qua `VNPAY_URL`, `VNPAY_API_URL` (để trống nếu dùng mặc định theo mode).

### 2B. Google Maps API
1. Bật Google Maps JavaScript API tại https://console.cloud.google.com/
2. Lấy API Key
3. Thêm vào frontend `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_key_here
   ```

### 2C. Cloudinary (Image Upload)
1. Đăng ký tại https://cloudinary.com/
2. Lấy Cloud Name, API Key, API Secret
3. Thêm vào backend `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx
   ```

## 3) Thiết lập database MySQL

1. Tạo schema và bảng:
   ```bash
   mysql -u root -p < backend/sql/schema.sql
   ```
2. Nạp dữ liệu mẫu:
   ```bash
   mysql -u root -p < backend/sql/seed.sql
   ```

Tài khoản mẫu (password: `password`):
- Admin: `admin@travel.com`
- Staff: `abc170909@gmail.com.com`
- User: `hackhack1709@gmail.com`

## 4) Chạy backend

```bash
cd backend
cp .env.example .env
# Cấu hình DB_USER, DB_PASSWORD, VNPAY_*, CLOUDINARY_*

npm install
npm run dev:micro
```

Các cổng backend khi chạy microservices:
- API Gateway: `http://localhost:8080`
- Auth Service: `http://localhost:5001`
- Tour Service: `http://localhost:5002`
- Booking Service: `http://localhost:5003`
- Payment Service: `http://localhost:5004`
- Wishlist Service: `http://localhost:5005`
- Review Service: `http://localhost:5006`
- Upload Service: `http://localhost:5007`
- Chatbot Service: `http://localhost:5008`
- Staff Service: `http://localhost:5009`
- Admin Service: `http://localhost:5010`
- Fallback Service: `http://localhost:5000`

Tối ưu đã bật mặc định:
- Gateway rate limit cho nhóm `auth` và nhóm endpoint ghi dữ liệu.
- Gateway cache ngắn hạn cho các API đọc nhiều như `/api/tours`, `/api/articles`.
- Gắn `x-request-id` và log request để trace nhanh lỗi xuyên service.

Biến môi trường tinh chỉnh:
- `GATEWAY_CACHE_TTL_MS=15000` (ms, TTL cache ở gateway)
- `LOG_REQUESTS=true` (bật/tắt request log)
- `VITE_API_TIMEOUT=10000` (frontend timeout ms)

Kiểm tra nhanh sức khỏe services:

```bash
npm run check:micro
```

## 5) Chạy frontend

```bash
cd frontend
cp .env.example .env
# Cấu hình VITE_GOOGLE_MAPS_API_KEY

npm install
npm run dev
```

Frontend chạy tại: `http://localhost:5173`
Frontend mặc định gọi API qua gateway: `http://localhost:8080/api`

## 6) Các tính năng đã có

### Customer (User)
- ✅ Xem danh sách tour, tìm kiếm/lọc tour
- ✅ Xem chi tiết tour (lịch trình, giá, đánh giá, **bản đồ Google Maps**)
- ✅ Đăng ký/đăng nhập
- ✅ Đặt tour (ngày đi, số lượng người, kiểm tra slot)
- ✅ **Thanh toán VNPAY** (sandbox mode, redirect flow)
- ✅ Xem/hủy booking cá nhân
- ✅ Wishlist
- ✅ Đánh giá tour
- ✅ Chatbot hỏi đáp tour/giá/gợi ý

### Staff
- ✅ Đăng nhập
- ✅ Xem toàn bộ booking
- ✅ Xác nhận/hủy booking
- ✅ Xem danh sách khách hàng

### Admin
- ✅ Dashboard thống kê (users/tours/bookings/doanh thu)
- ✅ Xem danh sách user
- ✅ Xem review (quản lý)
- ✅ Xem system logs
- ✅ **Tạo/chỉnh sửa tour với upload ảnh**
- ✅ **Quản lý tour location (latitude/longitude)**

## 7) API chính

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Tours
- `GET /api/tours` (search, filter by price)
- `GET /api/tours/:id`
- `POST /api/tours` (admin)
- `PUT /api/tours/:id` (admin)
- `DELETE /api/tours/:id` (admin)

### Bookings
- `POST /api/bookings` (create)
- `GET /api/bookings/my` (my bookings)
- `PATCH /api/bookings/my/:id/cancel` (cancel)
- `GET /api/bookings/staff/all` (staff)
- `PATCH /api/bookings/staff/:id/confirm` (staff)
- `PATCH /api/bookings/staff/:id/cancel` (staff)

### Payments
- `POST /api/payments` (mock payment - old)
- `POST /api/payments/vnpay/create-url` (**VNPAY redirect**)
- `GET /api/payments/vnpay/return` (**VNPAY callback**)

### Upload
- `POST /api/upload/tour` (upload tour image)
- `POST /api/upload/banner` (upload banner)

### Wishlists
- `POST /api/wishlists` (add)
- `GET /api/wishlists/my` (get my wishlist)
- `DELETE /api/wishlists/my/:tourId` (remove)

### Reviews
- `POST /api/reviews` (create)
- `GET /api/reviews/tour/:tourId` (get by tour)

### Chatbot
- `POST /api/chatbot/ask` (ask AI)

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/logs`

## 8) Quy trình thanh toán VNPAY

1. **Customer** click "Thanh toán VNPAY" ở trang My Bookings
2. Frontend gọi `POST /api/payments/vnpay/create-url` để lấy payment URL
3. Backend dùng VNPAY Service để tạo URL redirect (với signed hash)
4. Frontend redirect sang VNPAY gateway (sandbox)
5. Khách nhập thông tin thẻ (sandbox: `9704` + `0123456789012345`)
6. VNPAY redirect về `/payment-return` với query params
7. Frontend hiển thị kết quả + gọi `GET /api/payments/vnpay/return` để verify
8. Backend kiểm tra signature và cập nhật booking status

### Thông tin sandbox VNPAY
- **URL:** https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
- **Test Card:** 9704 + random number
- **OTP:** Bất kỳ 6 chữ số nào

## 9) Quy trình upload ảnh Cloudinary

1. **Admin** truy cập `/admin/tours` → "Tạo tour mới"
2. Click "Upload ảnh" → chọn file từ máy
3. Frontend gửi FormData đến `POST /api/upload/tour`
4. Backend nhận file via Multer, upload lên Cloudinary
5. Lấy `image_url` từ response, lưu vào form
6. Khi tạo tour, gửi `imageUrl` vào database
7. Tour detail page hiển thị ảnh từ Cloudinary URL

## 10) Quy trình Google Maps

1. **Tour Detail Page** truy cập với `latitude`, `longitude` từ DB
2. Frontend render `<MapComponent>` component
3. Component load Google Maps API key từ env
4. Hiển thị map với marker tại location

Để cập nhật location:
- Admin tạo/chỉnh tour, nhập `latitude` (vĩ độ), `longitude` (kinh độ)
- Hoặc click trên bản đồ để tự động nhập coords (tính năng nâng cao)

## 11) Gợi ý phát triển tiếp

- [ ] Tích hợp thanh toán thật (VNPAY production)
- [ ] Tích hợp Momo, Stripe
- [ ] Place picker UI cho Google Maps (click map chọn location)
- [ ] Workflow hoàn thành tour tự động để mở quyền đánh giá
- [ ] Phân trang + filter nâng cao cho dashboard
- [ ] Email confirmation khi booking thành công
- [ ] SMS notification cho staff khi có booking mới
- [ ] Export invoice PDF
- [ ] Tour rating calculation (average)
- [ ] Real-time chatbot improve với LLM (GPT/Claude)
