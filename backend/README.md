# Travel Management Backend (Monolith)

## Cài đặt
```bash
cd backend
npm install
cp .env.example .env # và chỉnh sửa thông tin kết nối DB, JWT, email...
```

## Migration & Seed
- Tạo database `travel_management` trong MySQL
- Chạy file `src/sql/schema.sql` để tạo bảng
- Chạy file `src/sql/seed.sql` để thêm dữ liệu mẫu

## Chạy server
```bash
npm run dev
```

## API chính
- /api/tours
- /api/articles
- /api/auth
- /api/bookings
- /api/reviews
- /api/users
- /api/upload
- /api/wishlist
- /api/contact
- /api/chatbot
- /api/dashboard
- /api/staff

## Ghi chú
- Đã chuẩn hóa monolith, dễ mở rộng, dễ bảo trì.
- Đầy đủ chức năng quản lý tour, booking, bài viết, review, xác thực, admin, staff, upload, chatbot, wishlist, contact, dashboard.
