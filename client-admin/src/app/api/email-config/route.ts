import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    // Gọi API server để lấy cấu hình email
    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('Using API URL:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/email-config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token || ''}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Có lỗi xảy ra khi lấy cấu hình email' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting email config:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi lấy cấu hình email' },
      { status: 500 }
    );
  }
}

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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Gọi API server để cập nhật cấu hình email
    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('Using API URL for POST:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/email-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        email,
        password
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Có lỗi xảy ra khi cập nhật cấu hình email' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating email config:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi cập nhật cấu hình email' },
      { status: 500 }
    );
  }
}
