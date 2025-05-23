const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Đường dẫn đến file cấu hình form
const formConfigPath = path.join(__dirname, '../../data/form-config.json');

// API endpoint để kiểm tra trạng thái form
router.get('/', (req, res) => {
  try {
    // Đọc cấu hình form từ file
    const formConfig = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'));
    
    // Kiểm tra trạng thái đóng form thủ công
    if (formConfig.isFormClosed) {
      return res.json({
        isOpen: false,
        message: formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.'
      });
    }
    
    // Kiểm tra lịch trình đóng/mở form nếu có
    if (formConfig.formSchedule && formConfig.formSchedule.enabled) {
      // Kiểm tra ngày trong tuần
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
      
      // Kiểm tra xem ngày hiện tại có trong danh sách ngày mở cửa không
      if (!formConfig.formSchedule.openDays.includes(currentDay)) {
        return res.json({
          isOpen: false,
          message: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
        });
      }
      
      // Kiểm tra giờ mở cửa và đóng cửa
      const [openHour, openMinute] = formConfig.formSchedule.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = formConfig.formSchedule.closeTime.split(':').map(Number);
      
      // Tạo đối tượng Date cho thời gian mở cửa và đóng cửa trong ngày hiện tại
      const openTimeToday = new Date(now);
      openTimeToday.setHours(openHour, openMinute, 0, 0);
      
      const closeTimeToday = new Date(now);
      closeTimeToday.setHours(closeHour, closeMinute, 0, 0);
      
      // Kiểm tra xem thời gian hiện tại có nằm trong khoảng thời gian mở cửa không
      if (now >= openTimeToday && now <= closeTimeToday) {
        return res.json({ isOpen: true, message: '' });
      } else {
        return res.json({
          isOpen: false,
          message: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
        });
      }
    }
    
    // Mặc định form mở nếu không có cấu hình đóng
    return res.json({ isOpen: true, message: '' });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái form:', error);
    // Trong trường hợp lỗi, mặc định cho phép truy cập
    return res.json({ isOpen: true, message: '' });
  }
});

// API endpoint để thông báo thay đổi trạng thái form
router.post('/notify', (req, res) => {
  try {
    const { isOpen, message } = req.body;
    
    // Đọc cấu hình form hiện tại
    const formConfig = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'));
    
    // Cập nhật trạng thái form trong file cấu hình
    formConfig.isFormClosed = !isOpen;
    
    // Nếu có thông báo, cập nhật vào formSchedule.closedMessage
    if (message && !isOpen) {
      if (!formConfig.formSchedule) {
        formConfig.formSchedule = {
          enabled: false,
          openTime: '08:00',
          closeTime: '17:00',
          openDays: [1, 2, 3, 4, 5],
          closedMessage: message
        };
      } else {
        formConfig.formSchedule.closedMessage = message;
      }
    }
    
    // Lưu cấu hình form vào file
    fs.writeFileSync(formConfigPath, JSON.stringify(formConfig, null, 2), 'utf8');
    
    // Lấy đối tượng io từ app
    const io = req.app.get('io');
    
    // Phát sự kiện Socket.IO để thông báo thay đổi trạng thái form
    io.emit('form-status-changed', { isOpen, message });
    
    console.log(`Đã thông báo thay đổi trạng thái form: isOpen=${isOpen}, message=${message}`);
    
    return res.json({ success: true, isFormClosed: !isOpen });
  } catch (error) {
    console.error('Lỗi khi thông báo thay đổi trạng thái form:', error);
    return res.status(500).json({ error: 'Lỗi khi thông báo thay đổi trạng thái form' });
  }
});

// API endpoint để đặt trạng thái form trực tiếp
router.post('/set-status', (req, res) => {
  try {
    const { isFormClosed, message } = req.body;
    
    // Đọc cấu hình form hiện tại
    const formConfig = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'));
    
    // Cập nhật trạng thái form trong file cấu hình
    formConfig.isFormClosed = isFormClosed;
    
    // Nếu có thông báo, cập nhật vào formSchedule.closedMessage
    if (message && isFormClosed) {
      if (!formConfig.formSchedule) {
        formConfig.formSchedule = {
          enabled: false,
          openTime: '08:00',
          closeTime: '17:00',
          openDays: [1, 2, 3, 4, 5],
          closedMessage: message
        };
      } else {
        formConfig.formSchedule.closedMessage = message;
      }
    }
    
    // Lưu cấu hình form vào file
    fs.writeFileSync(formConfigPath, JSON.stringify(formConfig, null, 2), 'utf8');
    
    // Lấy đối tượng io từ app
    const io = req.app.get('io');
    
    // Phát sự kiện Socket.IO để thông báo thay đổi trạng thái form
    io.emit('form-status-changed', { 
      isOpen: !isFormClosed, 
      message: isFormClosed ? (message || formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng.') : ''
    });
    
    console.log(`Đã đặt trạng thái form: isFormClosed=${isFormClosed}`);
    
    return res.json({ success: true, isFormClosed });
  } catch (error) {
    console.error('Lỗi khi đặt trạng thái form:', error);
    return res.status(500).json({ error: 'Lỗi khi đặt trạng thái form' });
  }
});

module.exports = router;
