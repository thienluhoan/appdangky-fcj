import { NextResponse } from 'next/server';

// Hàm kiểm tra xem form có đang mở hay không dựa trên thời gian hiện tại
function isFormOpen(formConfig: any): { isOpen: boolean; message: string } {
  // Kiểm tra trạng thái đóng form thủ công trước tiên
  if (formConfig.isFormClosed) {
    return { 
      isOpen: false, 
      message: formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.'
    };
  }

  // Nếu không có cấu hình lịch trình hoặc tính năng không được bật
  const formSchedule = formConfig.formSchedule;
  if (!formSchedule || !formSchedule.enabled) {
    return { isOpen: true, message: '' };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
  
  // Kiểm tra xem ngày hiện tại có trong danh sách ngày mở cửa không
  if (!formSchedule.openDays.includes(currentDay)) {
    return { 
      isOpen: false, 
      message: formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
    };
  }

  // Chuyển đổi giờ mở cửa và đóng cửa thành đối tượng Date
  const [openHour, openMinute] = formSchedule.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = formSchedule.closeTime.split(':').map(Number);

  // Tạo đối tượng Date cho thời gian mở cửa và đóng cửa trong ngày hiện tại
  const openTimeToday = new Date(now);
  openTimeToday.setHours(openHour, openMinute, 0, 0);

  const closeTimeToday = new Date(now);
  closeTimeToday.setHours(closeHour, closeMinute, 0, 0);

  // Kiểm tra xem thời gian hiện tại có nằm trong khoảng thời gian mở cửa không
  if (now >= openTimeToday && now <= closeTimeToday) {
    return { isOpen: true, message: '' };
  } else {
    return { 
      isOpen: false, 
      message: formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
    };
  }
}

export async function GET() {
  try {
    // Lấy cấu hình form từ API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/form-config`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      // Nếu không lấy được cấu hình, mặc định cho phép truy cập
      return NextResponse.json({ isOpen: true, message: '' });
    }

    const formConfig = await response.json();
    // Truyền toàn bộ formConfig để có thể kiểm tra cả isFormClosed và formSchedule
    const formStatus = isFormOpen(formConfig);

    return NextResponse.json(formStatus);
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái form:', error);
    // Trong trường hợp lỗi, mặc định cho phép truy cập
    return NextResponse.json({ isOpen: true, message: '' });
  }
}