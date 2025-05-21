const express = require('express');
const router = express.Router();

// Xử lý yêu cầu thông báo cập nhật cấu hình
router.post('/api/notify-config-update', (req, res) => {
  try {
    const { timestamp } = req.body;
    console.log(`Nhận thông báo cập nhật cấu hình tại: ${timestamp}`);
    
    // Lấy tham chiếu đến đối tượng io từ ứng dụng
    const io = req.app.get('io');
    
    if (io) {
      // Gửi thông báo đến tất cả các client đang kết nối
      io.emit('config-updated', { timestamp });
      console.log('Đã gửi thông báo cập nhật cấu hình đến tất cả client');
      res.status(200).json({ success: true, message: 'Thông báo đã được gửi' });
    } else {
      console.error('Không tìm thấy đối tượng Socket.IO');
      res.status(500).json({ success: false, message: 'Không thể gửi thông báo' });
    }
  } catch (error) {
    console.error('Lỗi khi xử lý thông báo cập nhật cấu hình:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
