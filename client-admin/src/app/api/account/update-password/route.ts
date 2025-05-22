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
    const { currentPassword, newPassword } = await request.json();

    // Kiểm tra dữ liệu đầu vào
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // Gọi API server để cập nhật mật khẩu
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/users/update-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Cập nhật mật khẩu thất bại' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật mật khẩu thành công'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi cập nhật mật khẩu' },
      { status: 500 }
    );
  }
}
