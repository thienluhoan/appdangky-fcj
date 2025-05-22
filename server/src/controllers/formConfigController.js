const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');

// Giữ lại đường dẫn đến file JSON cũ để tương thích ngược
const configFilePath = path.join(__dirname, '../../data/form-config.json');

// Đảm bảo thư mục tồn tại (chỉ dùng cho tương thích ngược)
const ensureDirectoryExists = (filePath) => {
  try {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw new Error(`Không thể tạo thư mục: ${error.message}`);
  }
};

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
    // Tìm cấu hình form trong database
    let config = await prisma.formConfig.findFirst({
      where: { id: 'default' }
    });
    
    // Nếu không tìm thấy cấu hình trong database
    if (!config) {
      console.log('Không tìm thấy cấu hình form trong database, sử dụng cấu hình mặc định');
      
      // Kiểm tra xem file cấu hình cũ có tồn tại không (cho tương thích ngược)
      if (fs.existsSync(configFilePath)) {
        try {
          // Đọc file cấu hình cũ
          const configData = fs.readFileSync(configFilePath, 'utf8');
          const oldConfig = JSON.parse(configData);
          
          // Tạo cấu hình mới trong database từ file cũ
          config = await prisma.formConfig.create({
            data: {
              id: 'default',
              title: oldConfig.title || defaultConfig.title,
              isFormClosed: oldConfig.isFormClosed !== undefined ? oldConfig.isFormClosed : defaultConfig.isFormClosed,
              registrationLimit: oldConfig.registrationLimit || defaultConfig.registrationLimit,
              fields: oldConfig.fields || defaultConfig.fields
            }
          });
          
          console.log('Đã tạo cấu hình form mới trong database từ file cũ');
        } catch (fileError) {
          console.error('Lỗi khi đọc file cấu hình cũ:', fileError);
          
          // Nếu có lỗi khi đọc file, tạo cấu hình mặc định
          config = await prisma.formConfig.create({
            data: {
              id: 'default',
              title: defaultConfig.title,
              isFormClosed: defaultConfig.isFormClosed,
              registrationLimit: defaultConfig.registrationLimit,
              fields: defaultConfig.fields
            }
          });
          
          console.log('Đã tạo cấu hình form mặc định trong database');
        }
      } else {
        // Nếu file cũng không tồn tại, tạo cấu hình mặc định
        config = await prisma.formConfig.create({
          data: {
            id: 'default',
            title: defaultConfig.title,
            isFormClosed: defaultConfig.isFormClosed,
            registrationLimit: defaultConfig.registrationLimit,
            fields: defaultConfig.fields
          }
        });
        
        console.log('Đã tạo cấu hình form mặc định trong database');
      }
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
    
    // Cập nhật hoặc tạo mới cấu hình form trong database
    const updatedConfig = await prisma.formConfig.upsert({
      where: { id: 'default' },
      update: {
        title: formConfig.title,
        isFormClosed: formConfig.isFormClosed !== undefined ? formConfig.isFormClosed : false,
        registrationLimit: formConfig.registrationLimit,
        fields: formConfig.fields
      },
      create: {
        id: 'default',
        title: formConfig.title,
        isFormClosed: formConfig.isFormClosed !== undefined ? formConfig.isFormClosed : false,
        registrationLimit: formConfig.registrationLimit,
        fields: formConfig.fields
      }
    });
    
    // Đồng bộ cấu hình với file JSON cho tương thích ngược
    try {
      // Đảm bảo thư mục tồn tại
      ensureDirectoryExists(configFilePath);
      
      // Lưu cấu hình vào file JSON
      fs.writeFileSync(configFilePath, JSON.stringify(formConfig, null, 2), 'utf8');
      
      // Đồng bộ cấu hình với trang admin
      const adminConfigPath = path.join(__dirname, '../../../client-admin/public/data/form-config.json');
      if (fs.existsSync(path.dirname(adminConfigPath))) {
        fs.writeFileSync(adminConfigPath, JSON.stringify(formConfig, null, 2), 'utf8');
      }
    } catch (fileError) {
      console.warn('Không thể đồng bộ cấu hình với file JSON:', fileError);
      // Tiếp tục xử lý vì đã lưu vào database thành công
    }
    
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
