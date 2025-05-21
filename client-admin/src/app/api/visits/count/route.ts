import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Đường dẫn đến file dữ liệu đăng ký
const visitsFilePath = path.join(process.cwd(), '..', 'server', 'data', 'visits.json');

export async function GET(request: NextRequest) {
  try {
    // Lấy tham số date từ query string
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Thiếu tham số date' }, { status: 400 });
    }

    // Kiểm tra xem file dữ liệu đăng ký có tồn tại không
    if (!fs.existsSync(visitsFilePath)) {
      return NextResponse.json({ count: 0 });
    }

    // Đọc dữ liệu đăng ký từ file
    const visitsData = fs.readFileSync(visitsFilePath, 'utf8');
    const visits = JSON.parse(visitsData);

    // Đếm số lượt đăng ký trong ngày
    const count = visits.filter((visit: any) => {
      // Kiểm tra xem đăng ký có trong ngày được chỉ định không
      const visitDate = visit.date || (visit.createdAt ? visit.createdAt.split('T')[0] : null);
      return visitDate === date;
    }).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Lỗi khi đếm số lượt đăng ký:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đếm số lượt đăng ký' },
      { status: 500 }
    );
  }
}
