# Hệ Thống Đăng Ký Văn Phòng

Hệ thống quản lý và đăng ký lịch lên văn phòng với giao diện người dùng thân thiện, hỗ trợ chế độ sáng/tối, và tích hợp thông báo thời gian thực.

## Cấu trúc dự án

Dự án được tổ chức theo mô hình client-server với 3 thành phần chính:

1. **Backend (server)**: API server, xử lý dữ liệu và gửi email
2. **Frontend Admin (client-admin)**: Giao diện quản trị cho admin
3. **Frontend Customer (client-customer)**: Giao diện đăng ký cho khách hàng

## Mục Lục

- [Tổng Quan](#tổng-quan)
- [Tính Năng](#tính-năng)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Cài Đặt](#cài-đặt)
- [Cấu Hình](#cấu-hình)
- [Sử Dụng](#sử-dụng)
- [API Documentation](#api-documentation)
- [Bảo Mật](#bảo-mật)

## Tổng Quan

Hệ thống Đăng Ký Văn Phòng là một ứng dụng web hiện đại cho phép người dùng ( thực tập sinh của First Cloud Journey ) đăng ký lịch lên văn phòng, Hệ thống bao gồm hai phần chính:

1. **Giao diện người dùng (Client)**: Cho phép khách hàng đăng ký lịch lên văn phòng, xem thông tin và trạng thái đăng ký.
2. **Giao diện quản trị (Admin)**: Cho phép quản trị viên quản lý đăng ký, phê duyệt/từ chối yêu cầu, và quản lý tài nguyên.

Hệ thống được xây dựng với các công nghệ hiện đại như React, Next.js, Node.js và Socket.IO để cung cấp trải nghiệm người dùng mượt mà và cập nhật thời gian thực.

## Tính Năng

### Giao Diện Người Dùng (Client)

- **Đăng Ký**: Giao diện thân thiện cho phép người dùng đăng ký lịch lên văn phòng với các thông tin cần thiết.
- **Xem Trạng Thái**: Người dùng có thể xem trạng thái đăng ký của mình (đang chờ, đã phê duyệt, từ chối).
- **Thông Báo**: Nhận thông báo thời gian thực khi trạng thái đăng ký thay đổi.
- **Hỗ Trợ Đa Thiết Bị**: Giao diện responsive, hoạt động tốt trên máy tính, tablet và điện thoại.

### Giao Diện Quản Trị (Admin)

- **Quản Lý Đăng Ký**: Xem, phê duyệt, từ chối và quản lý tất cả các đăng ký.
- **Thống Kê**: Xem báo cáo và thống kê về việc sử dụng văn phòng.
- **Quản Lý Tài Nguyên**: Quản lý các phòng, tầng và tài nguyên khác.
- **Chế Độ Sáng/Tối**: Hỗ trợ chuyển đổi giữa chế độ sáng và tối với giao diện AWS-inspired.
- **Bảo Mật**: Hệ thống đăng nhập an toàn với xác thực người dùng.

## Kiến Trúc Hệ Thống

Hệ thống được xây dựng với kiến trúc client-server:

```
┌─────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│                 │     │                    │     │                 │
│  Client-Admin   │◄────┤    API Server      │◄────┤ Client-Customer │
│  (Next.js)      │     │  (Node.js/Express) │     │  (Next.js)      │
│                 │     │                    │     │                 │
└─────────────────┘     └────────────────────┘     └─────────────────┘
                              │
                              │
                              ▼
                        ┌─────────────────┐
                        │                 │
                        │   JSON Storage  │
                        │                 │
                        └─────────────────┘
```

### Công Nghệ Sử Dụng

- **Frontend**:
  - Next.js 14
  - React 18
  - TailwindCSS
  - Socket.IO Client
  - AWS-inspired UI components

- **Backend**:
  - Node.js
  - Express.js
  - Socket.IO
  - JSON file storage (có thể mở rộng lên database)

## Cài Đặt

### Yêu Cầu Hệ Thống

- Node.js (v18.0.0 hoặc cao hơn)
- npm (v8.0.0 hoặc cao hơn)

### Cài Đặt Từ Source

1. Clone repository:
   ```bash
   git clone https://github.com/vuhoangne/appdangki.git
   cd appdangki
   ```

2. Cài đặt dependencies cho server:
   ```bash
   cd server
   npm install
   ```

3. Cài đặt dependencies cho client admin:
   ```bash
   cd ../client-admin
   npm install
   ```

4. Cài đặt dependencies cho client customer:
   ```bash
   cd ../client-customer
   npm install
   ```

## Cấu Hình

### Cấu Hình Server

Tạo file `.env` trong thư mục `server` với nội dung:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
```

### Cấu Hình Client Admin

Tạo file `.env.local` trong thư mục `client-admin` với nội dung:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### Cấu Hình Client Customer

Tạo file `.env.local` trong thư mục `client-customer` với nội dung:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Sử Dụng

### Khởi Động Hệ Thống

1. Khởi động server:
   ```bash
   cd server
   npm start
   ```

2. Khởi động client admin (trong terminal mới):
   ```bash
   cd client-admin
   npm run dev
   ```

3. Khởi động client customer (trong terminal mới):
   ```bash
   cd client-customer
   npm run dev
   ```

### Truy Cập Hệ Thống

- **Client Admin**: http://localhost:3001
  - Đăng nhập với tài khoản:
    - Email: vuhoangdz2003@gmail.com
    - Mật khẩu: 0937036966

- **Client Customer**: http://localhost:3002
  - Không yêu cầu đăng nhập, người dùng có thể truy cập trực tiếp

### Quy Trình Sử Dụng

1. **Đăng Ký Lịch Hẹn** (Client Customer):
   - Truy cập trang đăng ký
   - Điền thông tin cá nhân và chi tiết lịch hẹn
   - Gửi yêu cầu đăng ký

2. **Quản Lý Đăng Ký** (Client Admin):
   - Đăng nhập vào hệ thống quản trị
   - Xem danh sách đăng ký
   - Phê duyệt hoặc từ chối các yêu cầu
   - Quản lý và theo dõi việc sử dụng văn phòng

## API Documentation

### Endpoints

#### Đăng Ký

- `GET /api/visits`: Lấy danh sách đăng ký
- `POST /api/visits`: Tạo đăng ký mới
- `PUT /api/visits/:id`: Cập nhật trạng thái đăng ký
- `DELETE /api/visits/:id`: Xóa đăng ký

#### Xác Thực

- `POST /api/login`: Đăng nhập hệ thống quản trị

### Ví Dụ API

#### Tạo Đăng Ký Mới

```javascript
fetch('http://localhost:3000/api/visits', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    phone: '0123456789',
    date: '2025-05-15',
    purpose: 'Họp dự án',
    school: 'Trường Đại học ABC',
    department: 'Tầng 2',
    time: '14:00 - 16:00',
    contact: 'Phòng Hành chính',
    purposeDetail: 'Thảo luận về dự án XYZ'
  }),
})
.then(response => response.json())
.then(data => console.log(data));
```

## Bảo Mật

### Xác Thực

Hệ thống sử dụng xác thực đơn giản với email và mật khẩu cho giao diện quản trị. Trong môi trường sản xuất, nên nâng cấp lên các phương pháp xác thực mạnh hơn như JWT hoặc OAuth.

### Lưu Trữ Dữ Liệu

Dữ liệu được lưu trữ dưới dạng file JSON. Trong môi trường sản xuất, nên sử dụng cơ sở dữ liệu an toàn như MongoDB, PostgreSQL hoặc MySQL.

## Đóng Góp

Chúng tôi rất hoan nghênh đóng góp từ cộng đồng! Nếu bạn muốn đóng góp, vui lòng:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi của bạn (`git commit -m 'Add some amazing feature'`)
4. Push lên branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## Giấy Phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm thông tin.

---

© 2025 Hệ Thống Đăng Ký Văn Phòng by **Lê Nguyễn Vũ Hoàng**
