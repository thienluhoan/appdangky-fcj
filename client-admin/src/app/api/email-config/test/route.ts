import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ cookies nếu có
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    // Không bắt buộc phải có token để truy cập API này
    // if (!token) {
    //   return NextResponse.json(
    //     { success: false, message: 'Không có quyền truy cập' },
    //     { status: 401 }
    //   );
    // }

    // Lấy dữ liệu từ request
    const { host, port, secure, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }
    
    // Kiểm tra các trường khác
    if (!host || !port) {
      return NextResponse.json(
        { success: false, message: 'SMTP Host và Port là bắt buộc' },
        { status: 400 }
      );
    }

    // Gọi API server để kiểm tra kết nối email
    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('Using API URL for test:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/email-config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        host,
        port,
        secure,
        email,
        password
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Có lỗi xảy ra khi kiểm tra kết nối email' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing email connection:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi kiểm tra kết nối email' },
      { status: 500 }
    );
  }
}
