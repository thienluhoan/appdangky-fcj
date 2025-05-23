import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Đường dẫn đến file lưu cấu hình form - sử dụng thư mục public để đảm bảo có quyền ghi
const configFilePath = path.join(process.cwd(), 'public', 'data', 'form-config.json');
// Đường dẫn đến file lưu cấu hình form trên server
const serverConfigFilePath = path.join(process.cwd(), '..', 'server', 'data', 'form-config.json');

// Đảm bảo thư mục tồn tại
const ensureDirectoryExists = (filePath: string) => {
  try {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw new Error(`Không thể tạo thư mục: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
    // Kiểm tra xem file cấu hình đã tồn tại chưa
    if (!fs.existsSync(configFilePath)) {
      // Nếu chưa tồn tại, tạo thư mục và lưu cấu hình mặc định
      ensureDirectoryExists(configFilePath);
      fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return NextResponse.json(defaultConfig);
    }

    // Đọc file cấu hình
    const configData = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(configData);
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading form config:', error);
    return NextResponse.json(
      { error: 'Failed to read form configuration' },
      { status: 500 }
    );
  }
}

// Lưu cấu hình form
export async function POST(request: NextRequest) {
  try {
    const formConfig = await request.json();
    
    try {
      // Đảm bảo thư mục tồn tại
      ensureDirectoryExists(configFilePath);
      
      // Lưu cấu hình mới vào client-admin
      fs.writeFileSync(configFilePath, JSON.stringify(formConfig, null, 2), 'utf8');
      
      // Đồng bộ cấu hình với server
      try {
        ensureDirectoryExists(serverConfigFilePath);
        fs.writeFileSync(serverConfigFilePath, JSON.stringify(formConfig, null, 2), 'utf8');
        console.log('Form config synced with server successfully to:', serverConfigFilePath);
        
        // Gửi yêu cầu đến server để thông báo cập nhật cấu hình
        // Sử dụng Promise.race với timeout để tránh chờ quá lâu
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 2000); // Timeout sau 2 giây
          });
          
          const fetchPromise = fetch('http://localhost:3000/api/notify-config-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timestamp: new Date().toISOString() }),
          });
          
          const notifyResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          
          if (notifyResponse.ok) {
            console.log('Notification sent to server successfully');
          } else {
            console.error('Failed to send notification to server:', await notifyResponse.text());
          }
        } catch (notifyError) {
          // Chỉ ghi log lỗi, không ảnh hưởng đến việc lưu cấu hình
          console.error('Error sending notification to server:', notifyError);
          // Không cần trả về lỗi, vì đây chỉ là thông báo phụ
        }
      } catch (serverWriteError) {
        console.error('Error syncing with server:', serverWriteError);
        return NextResponse.json(
          { 
            warning: `Đã lưu cấu hình vào admin nhưng không thể đồng bộ với server: ${serverWriteError instanceof Error ? serverWriteError.message : 'Unknown error'}`,
            success: true 
          }
        );
      }
      
      console.log('Form config saved successfully to:', configFilePath);
      return NextResponse.json({ success: true, message: 'Form configuration saved and synced successfully' });
    } catch (writeError) {
      console.error('Error writing file:', writeError);
      return NextResponse.json(
        { error: `Không thể ghi file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}` },
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
