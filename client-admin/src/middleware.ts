import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Chỉ áp dụng middleware cho trang đăng ký
  if (request.nextUrl.pathname === '/register') {
    try {
      // Kiểm tra xem đã có admin nào chưa
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/check-initial-setup`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      // Nếu không cần thiết lập ban đầu (đã có admin), chuyển hướng về trang đăng nhập
      if (data.success && !data.needsInitialSetup) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      console.error('Error in middleware:', error);
      // Nếu có lỗi, vẫn cho phép truy cập trang đăng ký
    }
  }

  return NextResponse.next();
}

// Chỉ áp dụng middleware cho trang đăng ký
export const config = {
  matcher: '/register',
};
