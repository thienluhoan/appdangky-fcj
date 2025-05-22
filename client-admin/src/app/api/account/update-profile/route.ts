import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    // Lấy token từ cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy token xác thực' },
        { status: 401 }
      );
    }

    // Lấy dữ liệu từ request body
    const { username, email } = await request.json();

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // Gọi API server để cập nhật thông tin người dùng
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/users/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, email })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Cập nhật thông tin thất bại' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: data.user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi cập nhật thông tin' },
      { status: 500 }
    );
  }
}
