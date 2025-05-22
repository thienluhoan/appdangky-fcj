import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy token xác thực' },
        { status: 401 }
      );
    }

    // Gọi API server để lấy thông tin người dùng
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Không thể lấy thông tin tài khoản' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user
    });
  } catch (error) {
    console.error('Error fetching account info:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi lấy thông tin tài khoản' },
      { status: 500 }
    );
  }
}
