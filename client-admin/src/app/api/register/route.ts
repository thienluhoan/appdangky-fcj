import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' },
        { status: 400 }
      );
    }



    // Gọi API server để đăng ký người dùng
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Đăng ký thất bại' },
        { status: response.status }
      );
    }



    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.',
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi đăng ký' },
      { status: 500 }
    );
  }
}
