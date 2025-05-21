/**
 * Module cung cấp dịch vụ gửi email sử dụng Nodemailer với Gmail
 */

const nodemailer = require('nodemailer');

// Cấu hình transporter cho Nodemailer
let transporter = null;

/**
 * Khởi tạo transporter cho Nodemailer
 * Sử dụng Gmail SMTP để gửi email
 */
function initTransporter() {
  try {
    // Sử dụng Gmail SMTP
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'thienluhoan@gmail.com', // Email dùng để gửi
        pass: 'dvyimlbvxmgtuezb' // Mật khẩu ứng dụng Google đã cung cấp
      }
    });
    
    console.log('Nodemailer đã được khởi tạo thành công');
    return true;
  } catch (error) {
    console.error('Lỗi khi khởi tạo Nodemailer:', error);
    return false;
  }
}

// Biến cấu hình cho phép bỏ qua lỗi email để tiếp tục hoạt động
const IGNORE_EMAIL_ERRORS = true;

/**
 * Gửi email thông báo đã duyệt đăng ký
 * @param {Object} visit - Thông tin đăng ký đã được duyệt
 * @returns {Promise<boolean>} - Kết quả gửi email
 */
async function sendApprovalEmail(visit) {
  // In ra toàn bộ đối tượng visit để kiểm tra
  console.log('Chi tiết đối tượng visit:', JSON.stringify(visit, null, 2));
  console.log('Thời gian:', visit.time);
  console.log('Tầng:', visit.floor);
  
  try {
    // Khởi tạo transporter nếu chưa có
    if (!transporter) {
      const initialized = initTransporter();
      if (!initialized) {
        console.error('Không thể khởi tạo Nodemailer để gửi email');
        return IGNORE_EMAIL_ERRORS;
      }
    }
    
    if (!visit) {
      console.error('Dữ liệu đăng ký không hợp lệ:', visit);
      return IGNORE_EMAIL_ERRORS;
    }
    
    // Kiểm tra email
    if (!visit.email || typeof visit.email !== 'string' || !visit.email.includes('@')) {
      console.error('Email không hợp lệ:', visit.email);
      return IGNORE_EMAIL_ERRORS;
    }
    
    console.log('Đang gửi email duyệt đến:', visit.email);
    
    // In thông tin email trước khi gửi
    console.log('Thông tin email sẽ gửi:');
    console.log('- Người gửi: thienluhoan@gmail.com');
    console.log('- Người nhận:', visit.email);
    console.log('- Tiêu đề: Đăng ký làm việc tại văn phòng AWS đã được duyệt');
    
    // Chuẩn bị nội dung email
    const mailOptions = {
      from: '"First Cloud Journey Office" <thienluhoan@gmail.com>',
      to: visit.email,
      subject: 'FCJ - Đăng ký làm việc tại văn phòng đã được duyệt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #0066cc;">Đăng ký làm việc tại văn phòng AWS đã được duyệt</h2>
          <p>Xin chào <strong>${visit.name}</strong>,</p>
          <p>Chúng tôi xin thông báo rằng đăng ký làm việc tại văn phòng AWS của bạn đã được <strong style="color: green;">DUYỆT</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Chi tiết đăng ký:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li><strong>Họ và tên:</strong> ${visit.name}</li>
              <li><strong>Email:</strong> ${visit.email}</li>
              <li><strong>Số điện thoại:</strong> ${visit.phone}</li>
              <li><strong>Trường đại học:</strong> ${visit.school}</li>
              <li><strong>Mã số sinh viên:</strong> ${visit.studentId}</li>
              <li><strong>Ngày đăng ký:</strong> ${visit.date ? new Date(visit.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '/') : 'Không có thông tin'}</li>
              ${visit.time ? `<li><strong>Thời gian:</strong> ${visit.time}</li>` : ''}
              <li><strong>Mục đích:</strong> ${visit.purpose || 'Không có thông tin'}</li>
              <li><strong>Tầng:</strong> ${visit.floor || 'Không có thông tin'}</li>
              <li><strong>Người liên hệ:</strong> ${visit.contact || 'Không có thông tin'}</li>
            </ul>
          </div>
          
          <p>Vui lòng đến đúng giờ và mang theo thẻ sinh viên hoặc giấy tờ tùy thân để check-in.</p>
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email này.</p>
          
          <p style="margin-top: 30px;">Trân trọng,</p>
          <p><strong>First Cloud Journey Team</strong></p>
        </div>
      `,
      text: `
      Đăng ký làm việc tại văn phòng AWS đã được duyệt
      
      Xin chào ${visit.name},
      
      Chúng tôi xin thông báo rằng đăng ký làm việc tại văn phòng AWS của bạn đã được DUYỆT.
      
      Chi tiết đăng ký:
      - Họ và tên: ${visit.name}
      - Email: ${visit.email}
      - Số điện thoại: ${visit.phone}
      - Trường đại học: ${visit.school}
      - Mã số sinh viên: ${visit.studentId}
      - Ngày đăng ký: ${visit.date ? new Date(visit.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '/') : 'Không có thông tin'}
      - Thời gian: ${visit.time || 'Không có thông tin'}
      - Tầng: ${visit.floor || 'Không có thông tin'}
      - Mục đích: ${visit.purpose || 'Không có thông tin'}
      - Người liên hệ: ${visit.contact || 'Không có thông tin'}
      
      Vui lòng đến đúng giờ và mang theo thẻ sinh viên hoặc giấy tờ tùy thân để check-in.
      
      Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email này.
      
      Trân trọng,
      First Cloud Journey Team
      `
    };
    
    try {
      // Gửi email
      console.log('Bắt đầu gửi email duyệt...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Email thông báo duyệt đã được gửi thành công:', info.messageId);
      return true;
    } catch (sendError) {
      console.error('Lỗi khi gửi email:', sendError.message);
      
      // In thêm thông tin về lỗi
      console.error('Loại lỗi:', typeof sendError);
      console.error('Lỗi đầy đủ:', JSON.stringify(sendError, Object.getOwnPropertyNames(sendError)));
      
      return IGNORE_EMAIL_ERRORS;
    }
  } catch (err) {
    console.error('Lỗi khi chuẩn bị gửi email duyệt:', err);
    return IGNORE_EMAIL_ERRORS;
  }
}

/**
 * Gửi email thông báo từ chối đăng ký
 * @param {Object} visit - Thông tin đăng ký đã bị từ chối
 * @returns {Promise<boolean>} - Kết quả gửi email
 */
async function sendRejectionEmail(visit) {
  try {
    // Khởi tạo transporter nếu chưa có
    if (!transporter) {
      const initialized = initTransporter();
      if (!initialized) {
        console.error('Không thể khởi tạo Nodemailer để gửi email');
        return IGNORE_EMAIL_ERRORS;
      }
    }
    
    if (!visit) {
      console.error('Dữ liệu đăng ký không hợp lệ:', visit);
      return IGNORE_EMAIL_ERRORS;
    }
    
    // Kiểm tra email
    if (!visit.email || typeof visit.email !== 'string' || !visit.email.includes('@')) {
      console.error('Email không hợp lệ:', visit.email);
      return IGNORE_EMAIL_ERRORS;
    }
    
    console.log('Đang gửi email từ chối đến:', visit.email);
    
    // In thông tin email trước khi gửi
    console.log('Thông tin email sẽ gửi:');
    console.log('- Người gửi: thienluhoan@gmail.com');
    console.log('- Người nhận:', visit.email);
    console.log('- Tiêu đề: Đăng ký làm việc tại văn phòng AWS không được duyệt');
    
    // Chuẩn bị nội dung email
    const mailOptions = {
      from: '"First Cloud Journey Office" <thienluhoan@gmail.com>',
      to: visit.email,
      subject: 'FCJ - Đăng ký làm việc tại văn phòng không được duyệt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #cc0000;">Đăng ký làm việc tại văn phòng AWS không được duyệt</h2>
          <p>Xin chào <strong>${visit.name}</strong>,</p>
          <p>Chúng tôi rất tiếc phải thông báo rằng đăng ký làm việc tại văn phòng AWS của bạn đã <strong style="color: red;">KHÔNG ĐƯỢC DUYỆT</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Chi tiết đăng ký:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li><strong>Họ và tên:</strong> ${visit.name}</li>
              <li><strong>Email:</strong> ${visit.email}</li>
              <li><strong>Số điện thoại:</strong> ${visit.phone}</li>
              <li><strong>Trường đại học:</strong> ${visit.school}</li>
              <li><strong>Mã số sinh viên:</strong> ${visit.studentId}</li>
              <li><strong>Ngày đăng ký:</strong> ${visit.date ? new Date(visit.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '/') : 'Không có thông tin'}</li>
              ${visit.time ? `<li><strong>Thời gian:</strong> ${visit.time}</li>` : ''}
              <li><strong>Mục đích:</strong> ${visit.purpose || 'Không có thông tin'}</li>
              <li><strong>Tầng:</strong> ${visit.floor || 'Không có thông tin'}</li>
              <li><strong>Người liên hệ:</strong> ${visit.contact || 'Không có thông tin'}</li>
            </ul>
          </div>
          
          <p>Lý do có thể bao gồm: số lượng đăng ký đã đạt giới hạn, thông tin không đầy đủ hoặc không chính xác, hoặc văn phòng không hoạt động vào ngày bạn đăng ký.</p>
          <p>Bạn có thể thử đăng ký lại vào một ngày khác hoặc liên hệ với chúng tôi để biết thêm thông tin.</p>
          
          <p style="margin-top: 30px;">Trân trọng,</p>
          <p><strong>First Cloud Journey Team</strong></p>
        </div>
      `,
      text: `
      Đăng ký làm việc tại văn phòng AWS không được duyệt
      
      Xin chào ${visit.name},
      
      Chúng tôi rất tiếc phải thông báo rằng đăng ký làm việc tại văn phòng AWS của bạn đã KHÔNG ĐƯỢC DUYỆT.
      
      Chi tiết đăng ký:
      - Họ và tên: ${visit.name}
      - Email: ${visit.email}
      - Số điện thoại: ${visit.phone}
      - Trường đại học: ${visit.school}
      - Mã số sinh viên: ${visit.studentId}
      - Ngày đăng ký: ${visit.date ? new Date(visit.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '/') : 'Không có thông tin'}
      - Thời gian: ${visit.time || 'Không có thông tin'}
      - Tầng: ${visit.floor || 'Không có thông tin'}
      - Mục đích: ${visit.purpose || 'Không có thông tin'}
      - Người liên hệ: ${visit.contact || 'Không có thông tin'}
      
      Lý do có thể bao gồm: số lượng đăng ký đã đạt giới hạn, thông tin không đầy đủ hoặc không chính xác, hoặc văn phòng không hoạt động vào ngày bạn đăng ký.
      
      Bạn có thể thử đăng ký lại vào một ngày khác hoặc liên hệ với chúng tôi để biết thêm thông tin.
      
      Trân trọng,
      First Cloud Journey Team
      `
    };
    
    try {
      // Gửi email
      console.log('Bắt đầu gửi email từ chối...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Email thông báo từ chối đã được gửi thành công:', info.messageId);
      return true;
    } catch (sendError) {
      console.error('Lỗi khi gửi email từ chối:', sendError.message);
      
      // In thêm thông tin về lỗi
      console.error('Loại lỗi:', typeof sendError);
      console.error('Lỗi đầy đủ:', JSON.stringify(sendError, Object.getOwnPropertyNames(sendError)));
      
      return IGNORE_EMAIL_ERRORS;
    }
  } catch (err) {
    console.error('Lỗi khi chuẩn bị gửi email từ chối:', err);
    return IGNORE_EMAIL_ERRORS;
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail
};
