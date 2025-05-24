const express = require('express');
const router = express.Router();
const formConfigModel = require('../models/formConfigModel');

// API endpoint để kiểm tra trạng thái form
router.get('/', async (req, res) => {
  try {
    // Lấy cấu hình form từ database
    const formConfig = await formConfigModel.getFormConfig();
    
    // Kiểm tra trạng thái đóng form
    if (formConfig && formConfig.isFormClosed) {
      // Nếu form bị đóng thủ công, trả về thông báo
      const message = formConfig.formSchedule?.closedMessage || 'Form đã được đóng.';
      return res.json({ isOpen: false, message: message });
    }
    
    // Form đang mở
    return res.json({ isOpen: true, message: '' });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái form:', error);
    // Trong trường hợp lỗi, mặc định cho phép truy cập
    return res.json({ isOpen: true, message: '' });
  }
});

// API endpoint để thông báo thay đổi trạng thái form
router.post('/notify', async (req, res) => {
  try {
    // Lấy cấu hình form từ database
    const formConfig = await formConfigModel.getFormConfig();
    
    // Lấy đối tượng io từ app
    const io = req.app.get('io');
    
    // Kiểm tra trạng thái đóng form
    if (formConfig && formConfig.isFormClosed) {
      // Nếu form bị đóng thủ công, thông báo form đã đóng
      const message = formConfig.formSchedule?.closedMessage || 'Form đã được đóng.';
      io.emit('form-status-changed', { isOpen: false, message: message });
      return res.json({ success: true, isOpen: false, message: message });
    }
    
    // Form đang mở, thông báo form đang mở
    io.emit('form-status-changed', { isOpen: true, message: '' });
    
    return res.json({ success: true, isOpen: true, message: '' });
  } catch (error) {
    console.error('Lỗi khi thông báo trạng thái form:', error);
    return res.status(500).json({ error: 'Lỗi khi thông báo trạng thái form' });
  }
});

module.exports = router;
