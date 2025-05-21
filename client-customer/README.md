# Frontend Customer (client-customer)

Đây là phần giao diện khách hàng của hệ thống đăng ký văn phòng, được xây dựng với Next.js.

## Cấu trúc thư mục

```
client-customer/
├── src/
│   ├── app/                    # Thư mục chính của ứng dụng Next.js
│   │   ├── components/         # Các component dùng chung
│   │   ├── globals.css         # CSS toàn cục
│   │   ├── layout.tsx          # Layout chung
│   │   └── page.tsx            # Trang đăng ký
├── public/                     # Tài nguyên tĩnh
├── package.json
└── tsconfig.json
```

## Tính năng chính

1. **Đăng ký văn phòng**: Form đăng ký lịch lên văn phòng
2. **Giao diện thân thiện**: UI/UX dễ sử dụng
3. **Responsive design**: Thích ứng với nhiều kích thước màn hình
4. **Validation**: Kiểm tra dữ liệu đầu vào

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

Ứng dụng sẽ chạy tại http://localhost:3001
