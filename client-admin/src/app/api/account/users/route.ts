import { NextRequest, NextResponse } from 'next/server';

// GET: Lấy danh sách người dùng
export async function GET(request: NextRequest) {
  try {
    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Lấy cookie từ request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Gọi API server để lấy danh sách người dùng (sử dụng endpoint không yêu cầu xác thực)
    const response = await fetch(`${apiUrl}/api/users/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      credentials: 'include',
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Có lỗi xảy ra khi lấy danh sách người dùng' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi lấy danh sách người dùng' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa người dùng
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID người dùng không được cung cấp' },
        { status: 400 }
      );
    }

    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Lấy cookie từ request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Gọi API server để xóa người dùng
    const response = await fetch(`${apiUrl}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Có lỗi xảy ra khi xóa người dùng' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi xóa người dùng' },
      { status: 500 }
    );
  }
}
