// 'use client';

// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// // Middleware này sẽ chạy trước mỗi request
// export function middleware(request: NextRequest) {
//   // Kiểm tra xem người dùng đã đăng nhập chưa
//   const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
//   const url = request.nextUrl.clone();
  
//   // Nếu đang truy cập trang login và đã đăng nhập, chuyển hướng đến trang admin
//   if (url.pathname === '/login' && isLoggedIn) {
//     url.pathname = '/admin';
//     return NextResponse.redirect(url);
//   }
  
//   // Nếu đang truy cập các trang khác ngoài login mà chưa đăng nhập, chuyển hướng đến trang login
//   if (url.pathname !== '/login' && !isLoggedIn) {
//     url.pathname = '/login';
//     return NextResponse.redirect(url);
//   }
  
//   return NextResponse.next();
// }

// // Chỉ áp dụng middleware cho các route này
// export const config = {
//   matcher: ['/', '/admin', '/login'],
// };


import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const url = request.nextUrl.clone();
  console.log(`[Middleware] ${url.pathname} | isLoggedIn=${isLoggedIn}`)
  if (url.pathname === '/login' && isLoggedIn) {
    url.pathname = '/'
    return NextResponse.redirect(url);
  }
  if (url.pathname !== '/login' && !isLoggedIn) {
    url.pathname = '/login'
    return NextResponse.redirect(url);
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/', '/list/:path*', '/login'],
};
