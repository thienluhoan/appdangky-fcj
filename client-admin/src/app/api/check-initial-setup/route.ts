import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Sử dụng URL mặc định nếu biến môi trường không tồn tại
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('Using API URL for check-initial-setup:', apiUrl);
    
    // Thêm các header để đảm bảo không bị cache
    const response = await fetch(`${apiUrl}/api/auth/check-initial-setup`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Có lỗi xảy ra khi kiểm tra trạng thái cài đặt ban đầu' 
        },
        { status: response.status }
      );
    }

    // Thêm các header để đảm bảo không bị cache
    const nextResponse = NextResponse.json(data);
    nextResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    nextResponse.headers.set('Pragma', 'no-cache');
    nextResponse.headers.set('Expires', '0');
    
    return nextResponse;
  } catch (error) {
    console.error('Error checking initial setup:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi kiểm tra trạng thái cài đặt ban đầu' },
      { status: 500 }
    );
  }
}
