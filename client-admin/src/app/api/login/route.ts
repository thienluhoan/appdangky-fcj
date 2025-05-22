import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Gọi API đăng nhập từ server
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.error || 'Lỗi đăng nhập' 
      }, { status: response.status });
    }

    // Nếu đăng nhập thành công, tạo cookie
    const nextResponse = NextResponse.json({ 
      success: true,
      user: data.user // Trả về thông tin người dùng cho client
    });
    nextResponse.cookies.set('isLoggedIn', 'true', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
      httpOnly: false,
    });

    // Lưu token JWT nếu có
    if (data.token) {
      nextResponse.cookies.set('token', data.token, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
        httpOnly: true,
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Lỗi server khi đăng nhập' 
    }, { status: 500 });
  }
}
