const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const emailService = require('../emailService');

// Lưu ý: Chức năng gửi email đã được chuyển sang xử lý qua socket trong index.js
// sử dụng emailService.js để tránh việc gửi email trùng lặp

// Gửi email thông báo khi đăng ký được duyệt - ĐÃ VÔ HIỆU HÓA
// router.post('/approval', isAuthenticated, async (req, res) => {
//   try {
//     const { name, email, date, time, floor, purpose } = req.body;
//     
//     if (!name || !email || !date) {
//       return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
//     }
// 
//     res.status(200).json({ success: true, message: 'Chức năng email đã được chuyển sang xử lý qua socket' });
//   } catch (error) {
//     console.error('Lỗi:', error);
//     res.status(500).json({ success: false, message: 'Lỗi server' });
//   }
// });

// Gửi email xác thực tài khoản
router.post('/send-verification', async (req, res) => {
  try {
    const { to, username, verificationLink } = req.body;
    
    if (!to || !username || !verificationLink) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
    }

    // Tạo nội dung email
    const subject = 'Xác thực tài khoản FCJ Admin';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e2e3e;">Xác thực tài khoản FCJ Admin</h2>
        </div>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản quản trị viên FCJ. Để hoàn tất quá trình đăng ký, vui lòng nhấp vào liên kết bên dưới để xác thực địa chỉ email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #1e2e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Xác thực tài khoản</a>
        </div>
        <p>Hoặc bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationLink}</p>
        <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #777;">Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    `;

    // Cấu hình email
    const mailOptions = {
      from: process.env.EMAIL_USER || emailService.getEmailConfig().email,
      to,
      subject,
      html: htmlContent
    };

    // Gửi email
    try {
      await emailService.sendMail(mailOptions);
      res.status(200).json({ success: true, message: 'Email xác thực đã được gửi' });
    } catch (emailError) {
      console.error('Lỗi khi gửi email xác thực:', emailError);
      res.status(500).json({ success: false, message: 'Không thể gửi email xác thực' });
    }
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Trả về thông báo cho các route email khác
router.all('*', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chức năng email đã được chuyển sang xử lý qua socket để tránh gửi email trùng lặp'
  });
});

// Gửi email thông báo khi đăng ký bị từ chối - ĐÃ VÔ HIỆU HÓA
// router.post('/rejection', isAuthenticated, async (req, res) => {
//   try {
//     const { name, email, date, time, floor, purpose, reason } = req.body;
//     
//     if (!name || !email || !date) {
//       return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
//     }
// 
//     res.status(200).json({ success: true, message: 'Chức năng email đã được chuyển sang xử lý qua socket' });
//   } catch (error) {
//     console.error('Lỗi:', error);
//     res.status(500).json({ success: false, message: 'Lỗi server' });
//   }
// });
// 
// // Gửi email nhắc nhở - ĐÃ VÔ HIỆU HÓA
// router.post('/reminder', isAuthenticated, async (req, res) => {
//   try {
//     const { name, email, date, time, floor, purpose } = req.body;
//     
//     if (!name || !email || !date) {
//       return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
//     }
// 
//     res.status(200).json({ success: true, message: 'Chức năng email đã được chuyển sang xử lý qua socket' });
//   } catch (error) {
//     console.error('Lỗi:', error);
//     res.status(500).json({ success: false, message: 'Lỗi server' });
//   }
// });

module.exports = router;
