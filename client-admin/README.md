# Frontend Admin (client-admin)

Đây là phần giao diện quản trị (admin) của hệ thống đăng ký văn phòng, được xây dựng với Next.js.

## Cấu trúc thư mục

```
client-admin/
├── src/
│   ├── app/                    # Thư mục chính của ứng dụng Next.js
│   │   ├── admin/              # Trang quản lý đăng ký
│   │   ├── api/                # API routes của Next.js
│   │   │   └── login/          # API đăng nhập
│   │   ├── components/         # Các component dùng chung
│   │   ├── login/              # Trang đăng nhập
│   │   ├── globals.css         # CSS toàn cục
│   │   ├── layout.tsx          # Layout chung
│   │   ├── metadata.ts         # Metadata cho SEO
│   │   ├── middleware.ts       # Middleware xác thực
│   │   └── page.tsx            # Trang chủ
├── public/                     # Tài nguyên tĩnh
├── package.json
└── tsconfig.json
```

## Tính năng chính

1. **Quản lý đăng ký**: Xem, duyệt, từ chối và xóa đăng ký
2. **Xác thực**: Đăng nhập và bảo vệ route
3. **Real-time updates**: Cập nhật danh sách đăng ký theo thời gian thực
4. **Responsive design**: Giao diện thích ứng với nhiều kích thước màn hình

## Cài đặt và chạy

```bash
# Cài đặt dependencies
npm install

# Chạy ở môi trường development
npm run dev

# Build và chạy ở môi trường production
npm run build
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3002
