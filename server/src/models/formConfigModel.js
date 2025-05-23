const prisma = require('../prisma/client');
// Model xử lý cấu hình biểu mẫu sử dụng Prisma/database

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

// Không còn sử dụng hàm migration từ JSON sang Prisma nữa

module.exports = {
  getFormConfig,
  saveFormConfig
};
