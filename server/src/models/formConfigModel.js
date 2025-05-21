const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');

// Giữ lại đường dẫn file JSON cũ để có thể di chuyển dữ liệu
const dataDir = path.join(__dirname, '../../data');
const configPath = path.join(dataDir, 'form-config.json');

// Hàm lấy cấu hình biểu mẫu từ database
async function getFormConfig() {
  const config = await prisma.formConfig.findFirst({
    where: { id: 'default' }
  });
  
  return config;
}

// Hàm lưu cấu hình biểu mẫu vào database
async function saveFormConfig(config) {
  return await prisma.formConfig.upsert({
    where: { id: 'default' },
    update: config,
    create: {
      ...config,
      id: 'default'
    }
  });
}

// Hàm di chuyển dữ liệu từ JSON sang Prisma
async function migrateConfigFromJsonToPrisma() {
  if (fs.existsSync(configPath)) {
    try {
      const jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('Đang di chuyển cấu hình biểu mẫu từ JSON sang Prisma...');
      
      await prisma.formConfig.deleteMany();
      
      await prisma.formConfig.create({
        data: {
          id: 'default',
          title: jsonConfig.title || 'Đăng ký lên văn phòng',
          registrationLimit: jsonConfig.registrationLimit || null,
          fields: jsonConfig.fields || {}
        }
      });
      
      console.log('Di chuyển cấu hình biểu mẫu thành công!');
    } catch (error) {
      console.error('Lỗi khi di chuyển cấu hình biểu mẫu:', error);
    }
  }
}

module.exports = {
  getFormConfig,
  saveFormConfig,
  migrateConfigFromJsonToPrisma,
  configPath
};
