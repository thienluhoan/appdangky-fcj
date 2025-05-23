import { NextRequest, NextResponse } from 'next/server';

/**
 * API route để chuyển tiếp yêu cầu thay đổi trạng thái form đến server
 * @param request Yêu cầu từ client
 * @returns Phản hồi từ server
 */
export async function POST(request: NextRequest) {
  try {
    // Lấy dữ liệu từ request
    const data = await request.json();
    
    // Gửi yêu cầu đến server
    const response = await fetch('http://localhost:3000/api/form-status/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    // Nếu server trả về lỗi
    if (!response.ok) {
      console.error('Lỗi từ server:', await response.text());
      return NextResponse.json(
        { error: 'Lỗi khi thông báo thay đổi trạng thái form' },
        { status: response.status }
      );
    }
    
    // Trả về kết quả từ server
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu thay đổi trạng thái form:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xử lý yêu cầu thay đổi trạng thái form' },
      { status: 500 }
    );
  }
}
