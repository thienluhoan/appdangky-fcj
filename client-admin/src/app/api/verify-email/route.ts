import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token xác thực không hợp lệ' },
        { status: 400 }
      );
    }

    // Gọi API server để xác thực email
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/users/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Xác thực email thất bại' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email đã được xác thực thành công!',
    });
  } catch (error) {
    console.error('Error during email verification:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi xác thực email' },
      { status: 500 }
    );
  }
}
