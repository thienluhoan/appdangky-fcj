# Backend Server (API)

Đây là phần backend của hệ thống đăng ký văn phòng, được xây dựng với Node.js, Express, PostgreSQL và Prisma ORM.

## Cấu trúc thư mục

```
server/
│   └─ data/                  # Thư mục chứa dữ liệu JSON (sẽ không dùng sau khi chuyển sang PostgreSQL)
│   └─ prisma/                # Cấu hình Prisma
│   │   └─ schema.prisma      # Schema định nghĩa cấu trúc dữ liệu
│   │   └─ migrations/        # Các phiên bản migration
│   └─ src/
│   │   └─ controllers/       # Xử lý logic nghiệp vụ
│   │   │   └─ authController.js
│   │   │   └─ visitController.js
│   │   └─ middleware/        # Middleware xác thực và xử lý request
│   │   └─ models/            # Tương tác với dữ liệu
│   │   │   └─ formConfigModel.js
│   │   │   └─ visitModel.js
│   │   └─ prisma/            # Client Prisma
│   │   │   └─ client.js        # Khởi tạo Prisma client
│   │   └─ routes/            # Định tuyến API
│   │   │   └─ authRoutes.js
│   │   │   └─ index.js
│   │   │   └─ visitRoutes.js
│   │   └─ emailService.js    # Dịch vụ gửi email thông báo
│   │   └─ index.js           # Entry point của server
│   └─ .env                   # Biến môi trường
│   └─ .env.example           # Mẫu biến môi trường
│   └─ setup-env.js           # Script thiết lập môi trường
│   └─ start.js               # Script khởi động với migration
│   └─ package.json
└─ jsconfig.json
```

## Các API Endpoints

- `GET /api/visits`: Lấy danh sách đăng ký
- `POST /api/visits`: Tạo đăng ký mới
- `PATCH /api/visits/:id`: Cập nhật trạng thái đăng ký (duyệt/từ chối)
- `DELETE /api/visits/:id`: Xóa đăng ký
- `POST /api/auth/login`: Đăng nhập admin

## Tính năng chính

1. **Quản lý đăng ký**: Lưu trữ và quản lý thông tin đăng ký văn phòng
2. **Gửi email thông báo**: Gửi email thông báo khi đăng ký được duyệt hoặc từ chối
3. **Xác thực người dùng**: Xác thực admin khi đăng nhập
4. **Real-time updates**: Sử dụng Socket.IO để cập nhật real-time

## Cài đặt và chạy

### Yêu cầu

- Node.js v14 trở lên
- PostgreSQL đã được cài đặt và chạy

### Các bước cài đặt

```bash
# 1. Cài đặt dependencies
npm install

# 2. Thiết lập môi trường (tạo file .env từ .env.example)
npm run setup-env

# 3. Chỉnh sửa file .env để cấu hình kết nối PostgreSQL
# DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"

# 4. Chạy migration để tạo cấu trúc database
npm run migrate

# 5. (Tùy chọn) Di chuyển dữ liệu từ JSON sang PostgreSQL
# Chỉnh sửa file .env, đặt MIGRATE_DATA="true"

# 6. Chạy server
npm start
```

### Các lệnh hữu ích

```bash
# Chạy server với chế độ phát triển (tự động khởi động lại khi có thay đổi)
npm run dev

# Chạy Prisma Studio để quản lý dữ liệu qua giao diện web
npm run studio

# Chạy server với migration tự động
npm run start-with-migrate
```

Server sẽ chạy tại http://localhost:3000
