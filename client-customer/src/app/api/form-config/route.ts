import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Đường dẫn đến file cấu hình form từ ứng dụng admin
const adminConfigPath = path.join(process.cwd(), '..', 'client-admin', 'public', 'data', 'form-config.json');
// Đường dẫn đến file cấu hình form từ server
const serverConfigPath = path.join(process.cwd(), '..', 'server', 'data', 'form-config.json');

// Cấu hình mặc định nếu không tìm thấy file
const defaultConfig = {
  title: 'Đăng ký lên văn phòng',
  fields: {
    name: {
      label: 'Họ và tên',
      required: true,
      enabled: true
    },
    phone: {
      label: 'Số điện thoại',
      required: true,
      enabled: true
    },
    email: {
      label: 'Email',
      required: true,
      enabled: true
    },
    school: {
      label: 'Trường đại học',
      required: true,
      enabled: true
    },
    studentId: {
      label: 'Mã số sinh viên',
      required: true,
      enabled: true
    },
    purpose: {
      label: 'Chọn mục đích',
      required: true,
      enabled: true,
      options: ['Học tập', 'Tham quan', 'Tư vấn', 'Khác']
    },
    floor: {
      label: 'Chọn tầng',
      required: true,
      enabled: true,
      options: ['Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5']
    },
    contact: {
      label: 'Chọn người liên hệ',
      required: true,
      enabled: true,
      options: ['Anh Thiên', 'Chị Hương', 'Anh Tuấn', 'Chị Linh']
    },
    date: {
      label: 'Ngày đăng ký',
      required: true,
      enabled: true
    },
    time: {
      label: 'Giờ đăng ký',
      required: true,
      enabled: true
    }
  }
};

export async function GET() {
  try {
    // Ưu tiên đọc cấu hình từ server
    if (fs.existsSync(serverConfigPath)) {
      console.log('Đọc cấu hình form từ server:', serverConfigPath);
      const configData = fs.readFileSync(serverConfigPath, 'utf8');
      const config = JSON.parse(configData);
      return NextResponse.json(config);
    }
    // Nếu không có file cấu hình ở server, thử đọc từ ứng dụng admin
    else if (fs.existsSync(adminConfigPath)) {
      console.log('Đọc cấu hình form từ ứng dụng admin:', adminConfigPath);
      const configData = fs.readFileSync(adminConfigPath, 'utf8');
      const config = JSON.parse(configData);
      return NextResponse.json(config);
    } else {
      console.log('Không tìm thấy file cấu hình, sử dụng cấu hình mặc định');
      return NextResponse.json(defaultConfig);
    }
  } catch (error) {
    console.error('Lỗi khi đọc cấu hình form:', error);
    return NextResponse.json(
      defaultConfig,
      { status: 200 } // Vẫn trả về 200 với cấu hình mặc định
    );
  }
}
