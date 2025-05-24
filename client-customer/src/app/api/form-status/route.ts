import { NextResponse } from 'next/server';

// Hàm kiểm tra xem form có đang mở hay không dựa trên thời gian hiện tại
function isFormOpen(formConfig: any): { isOpen: boolean; message: string } {
  // Nếu không có cấu hình lịch trình hoặc tính năng không được bật
  const formSchedule = formConfig.formSchedule;
  if (!formSchedule || !formSchedule.enabled) {
    // Nếu tính năng đặt lịch bị tắt, form sẽ luôn được mở
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
    // Đã xóa chức năng đặt lịch, form luôn mở
    console.log('Form luôn mở vì đã xóa chức năng đặt lịch');
    
    // Trả về trạng thái form luôn mở
    return NextResponse.json({ isOpen: true, message: '' });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái form:', error);
    // Trong trường hợp lỗi, mặc định cho phép truy cập
    return NextResponse.json({ isOpen: true, message: '' });
  }
}