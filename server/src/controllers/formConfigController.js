const formConfigModel = require('../models/formConfigModel');

// Cấu hình mặc định
const defaultConfig = {
  title: 'Đăng ký lên văn phòng',
  isFormClosed: false, // Thêm trường mới để quản lý trạng thái đóng/mở form
  registrationLimit: {
    enabled: true,
    maxRegistrationsPerDay: 12,
    message: 'Rất tiếc, số lượt đăng ký trong ngày hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.'
  },
  fields: {
    name: {
      label: 'Họ và tên',
      required: true,
      enabled: true
    },
    phone: {
      label: 'Số điện thoại',
      required: true,
      enabled: true
    },
    email: {
      label: 'Email',
      required: true,
      enabled: true
    },
    school: {
      label: 'Trường đại học',
      required: true,
      enabled: true
    },
    studentId: {
      label: 'Mã số sinh viên',
      required: true,
      enabled: true
    },
    purpose: {
      label: 'Chọn mục đích',
      required: true,
      enabled: true,
      options: ['Học tập', 'Tham quan', 'Tư vấn', 'Khác']
    },
    floor: {
      label: 'Chọn tầng',
      required: true,
      enabled: true,
      options: ['Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5']
    },
    contact: {
      label: 'Chọn người liên hệ',
      required: true,
      enabled: true,
      options: ['Anh Thiên', 'Chị Hương', 'Anh Tuấn', 'Chị Linh']
    },
    date: {
      label: 'Ngày đăng ký',
      required: true,
      enabled: true
    },
    time: {
      label: 'Giờ đăng ký',
      required: true,
      enabled: true
    }
  }
};

// Lấy cấu hình form
exports.getFormConfig = async (req, res) => {
  try {
    // Lấy cấu hình form từ model (chỉ sử dụng database)
    let config = await formConfigModel.getFormConfig();
    
    // Nếu không tìm thấy cấu hình trong database
    if (!config) {
      console.log('Không tìm thấy cấu hình form trong database, sử dụng cấu hình mặc định');
      
      // Tạo mới cấu hình với giá trị mặc định và lưu vào database
      config = await formConfigModel.saveFormConfig(defaultConfig);
    }
    
    return res.json(config);
  } catch (error) {
    console.error('Lỗi khi đọc cấu hình form:', error);
    return res.status(500).json({ error: 'Không thể đọc cấu hình form' });
  }
};

// Lưu cấu hình form
exports.saveFormConfig = async (req, res) => {
  try {
    const formConfig = req.body;
    
    // Sử dụng model để lưu cấu hình form vào database
    const updatedConfig = await formConfigModel.saveFormConfig(formConfig);
    
    return res.json({ 
      success: true, 
      message: 'Cấu hình form đã được lưu thành công', 
      config: updatedConfig 
    });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình form:', error);
    return res.status(500).json({ error: 'Không thể lưu cấu hình form' });
  }
};
