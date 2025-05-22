import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra xem người dùng đã đăng nhập chưa (có thể thêm middleware sau)
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Gọi API server để tạo tài khoản mới
    const response = await fetch(`${apiUrl}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
        // Đánh dấu tài khoản là đã xác thực và có quyền admin
        isVerified: true,
        role: 'admin'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Có lỗi xảy ra khi tạo tài khoản' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tạo tài khoản mới thành công',
      user: data.user
    });
  } catch (error) {
    console.error('Error creating new user:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi tạo tài khoản mới' },
      { status: 500 }
    );
  }
}
