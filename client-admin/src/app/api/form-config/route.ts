import { NextRequest, NextResponse } from 'next/server';

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

// Cấu hình mặc định
const defaultConfig = {
  title: 'Đăng ký lên văn phòng',
  isFormClosed: false, // Thêm trường mới để quản lý trạng thái đóng/mở form
  registrationLimit: {
    enabled: true,
    maxRegistrationsPerDay: 10,
    message: 'Rất tiếc, số lượt đăng ký trong ngày hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.',
    byFloor: false,
    floorLimits: [
      { floorName: 'Tầng 2', maxRegistrations: 3, enabled: true },
      { floorName: 'Tầng 3', maxRegistrations: 3, enabled: true },
      { floorName: 'Tầng 4', maxRegistrations: 4, enabled: true },
      { floorName: 'Tầng 5', maxRegistrations: 4, enabled: true }
    ]
  },
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

// Lấy cấu hình form
export async function GET() {
  try {
    // Gọi API từ server để lấy cấu hình form
    const response = await fetch(`${SERVER_API_URL}/form-config`, {
      method: 'GET',
      ...fetchOptions
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const config = await response.json();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching form config from server:', error);
    
    // Trả về lỗi thay vì dữ liệu mặc định
    return NextResponse.json(
      { error: 'Không thể kết nối với server hoặc không có dữ liệu' },
      { status: 500 }
    );
  }
}

// Lưu cấu hình form
export async function POST(request: NextRequest) {
  try {
    const formConfig = await request.json();
    
    // Tạo một bản sao của cấu hình để tránh thay đổi dữ liệu gốc
    const processedConfig = {
      ...formConfig,
      fields: { ...formConfig.fields }
    };
    
    // Đảm bảo các trường có options là mảng
    ['floor', 'department', 'purpose', 'contact', 'school'].forEach(field => {
      if (processedConfig.fields[field] && !Array.isArray(processedConfig.fields[field].options)) {
        // Nếu options không phải là mảng, chuyển đổi thành mảng rỗng
        processedConfig.fields[field].options = processedConfig.fields[field].options || [];
      }
    });
    
    // Thêm các options trống vào cấu hình để duy trì tương thích với server
    // Các trường này sẽ được xử lý trên server nhưng sẽ không có dữ liệu
    processedConfig.floorOptions = [];
    processedConfig.purposeOptions = [];
    processedConfig.contactOptions = [];
    processedConfig.schoolOptions = [];
    
    console.log('Gửi dữ liệu đến server:', JSON.stringify(processedConfig, null, 2));
    
    try {
      // Gọi API từ server để lưu cấu hình form
      const response = await fetch(`${SERVER_API_URL}/form-config`, {
        method: 'POST',
        ...fetchOptions,
        body: JSON.stringify(processedConfig),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error saving form config to server:', error);
      return NextResponse.json(
        { error: `Không thể lưu cấu hình vào server: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: `Lỗi xử lý yêu cầu: ${error instanceof Error ? error.message : 'Failed to parse request'}` },
      { status: 400 }
    );
  }
}
