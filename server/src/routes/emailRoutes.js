const express = require('express');
const router = express.Router();
// const nodemailer = require('nodemailer');
const { isAuthenticated } = require('../middleware/auth');

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

// Trả về thông báo cho tất cả các route email
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
