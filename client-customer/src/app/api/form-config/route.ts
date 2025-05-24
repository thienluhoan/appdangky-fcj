import { NextResponse } from 'next/server';

// URL của API server
const SERVER_API_URL = 'http://localhost:3000/api';

// Tùy chọn cho fetch
const fetchOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  cache: 'no-store' as const,
  mode: 'cors' as const,
  credentials: 'include' as const,
};

// Không còn sử dụng cấu hình mặc định - chỉ lấy dữ liệu từ server

export async function GET() {
  try {
    // Gọi API từ server để lấy cấu hình form
    console.log('Gọi API để lấy cấu hình form từ server');
    const response = await fetch(`${SERVER_API_URL}/form-config`, {
      method: 'GET',
      ...fetchOptions
    });
    
    if (!response.ok) {
      throw new Error(`Server trả về lỗi ${response.status}: ${await response.text()}`);
    }
    
    // Xử lý dữ liệu trả về từ server
    const data = await response.json();
    console.log('Nhận dữ liệu cấu hình form từ server:', data);
    
    // Đảm bảo các trường có options là mảng
    const processedData = {
      ...data,
      fields: { ...data.fields }
    };
    
    // Thêm các options từ các mảng options vào các trường tương ứng
    if (data.floorOptions && Array.isArray(data.floorOptions) && data.fields.floor) {
      processedData.fields.floor.options = data.floorOptions.map(option => option.value);
    }
    
    if (data.departmentOptions && Array.isArray(data.departmentOptions) && data.fields.department) {
      processedData.fields.department.options = data.departmentOptions.map(option => option.value);
    }
    
    if (data.purposeOptions && Array.isArray(data.purposeOptions) && data.fields.purpose) {
      processedData.fields.purpose.options = data.purposeOptions.map(option => option.value);
    }
    
    if (data.contactOptions && Array.isArray(data.contactOptions) && data.fields.contact) {
      processedData.fields.contact.options = data.contactOptions.map(option => option.value);
    }
    
    if (data.schoolOptions && Array.isArray(data.schoolOptions) && data.fields.school) {
      processedData.fields.school.options = data.schoolOptions.map(option => option.value);
    }
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình form từ server:', error);
    return NextResponse.json(
      { error: 'Không thể kết nối đến server. Hệ thống đang bảo trì, vui lòng quay lại sau.' },
      { status: 503 } // Service Unavailable
    );
  }
}
