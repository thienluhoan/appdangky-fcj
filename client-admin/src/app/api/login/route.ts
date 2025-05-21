import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (username === 'admin' && password === 'admin123321') {
    const response = NextResponse.json({ success: true });
    response.cookies.set('isLoggedIn', 'true', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
